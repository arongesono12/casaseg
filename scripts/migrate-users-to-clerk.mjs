#!/usr/bin/env node
/**
 * Migra los usuarios de Supabase a Clerk conservando la contraseña.
 *
 * Lee `auth.users` (incluido el hash bcrypt) y `public.users` (rol, estado,
 * avatar) a través del endpoint SQL de la Management API de Supabase — el mismo
 * que usa scripts/supabase-management-query.ps1 — y crea cada usuario en Clerk
 * vía Backend API.
 *
 * Los hashes NUNCA se escriben en disco: viven solo en memoria durante el
 * proceso. El informe generado contiene únicamente identificadores y resultados.
 *
 * Uso:
 *   node scripts/migrate-users-to-clerk.mjs                    # simulación
 *   node scripts/migrate-users-to-clerk.mjs --solo-email a@b.c # una sola cuenta
 *   node scripts/migrate-users-to-clerk.mjs --aplicar          # migración real
 *
 * Variables requeridas (en .env o en el entorno):
 *   CLERK_SECRET_KEY        ya presente en .env tras `clerk env pull`
 *   SUPABASE_ACCESS_TOKEN   token personal de https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF    referencia del proyecto (Settings > General)
 */

import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CLERK_API = 'https://api.clerk.com/v1';
const SUPABASE_API = 'https://api.supabase.com/v1';

/** Formato de los hashes bcrypt que emite Supabase Auth. */
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
/** Clerk exige E.164 para los teléfonos; descartamos cualquier otro formato. */
const E164 = /^\+[1-9]\d{6,14}$/;

// ---------------------------------------------------------------- argumentos

function parseArgs(argv) {
  const args = {
    aplicar: false,
    limite: Infinity,
    soloEmail: null,
    pausaMs: 150,
    // Se resuelve tras leer las claves, para separar el informe de dev del de producción.
    informe: null,
    confirmarProduccion: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--aplicar') args.aplicar = true;
    else if (arg === '--limite') args.limite = Number(argv[++i]);
    else if (arg === '--solo-email') args.soloEmail = String(argv[++i]).toLowerCase();
    else if (arg === '--pausa-ms') args.pausaMs = Number(argv[++i]);
    else if (arg === '--informe') args.informe = resolve(RAIZ, String(argv[++i]));
    else if (arg === '--diagnostico') args.diagnostico = true;
    else if (arg === '--confirmar-produccion') args.confirmarProduccion = true;
    else if (arg === '--ayuda' || arg === '-h') args.ayuda = true;
    else throw new Error(`Argumento desconocido: ${arg}`);
  }

  if (!Number.isFinite(args.pausaMs) || args.pausaMs < 0) {
    throw new Error('--pausa-ms debe ser un número >= 0');
  }

  return args;
}

// ------------------------------------------------------------------ entorno

/** De dónde salió cada variable, para poder diagnosticar conflictos. */
const ORIGEN = new Map();

/**
 * Lee .env sin dependencias. Solo se usa como respaldo: una variable ya
 * presente en el entorno real tiene prioridad — que es justo la trampa
 * habitual, así que registramos el origen para poder mostrarlo.
 */
function cargarEnv() {
  let contenido;
  try {
    contenido = readFileSync(resolve(RAIZ, '.env'), 'utf8');
  } catch {
    return;
  }

  for (const linea of contenido.split(/\r?\n/)) {
    if (/^\s*#/.test(linea)) continue;

    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linea);
    if (!match) continue;

    const [, clave, bruto] = match;
    if (process.env[clave] !== undefined) {
      ORIGEN.set(clave, 'entorno (ignorando el valor de .env)');
      continue;
    }

    process.env[clave] = normalizar(bruto);
    ORIGEN.set(clave, '.env');
  }
}

/** Muestra lo justo para identificar una credencial sin revelarla. */
function enmascarar(valor) {
  if (valor.length <= 12) return `*** (${valor.length} caracteres)`;
  return `${valor.slice(0, 7)}…${valor.slice(-4)} (${valor.length} caracteres)`;
}

/**
 * Limpia los artefactos típicos de pegar un valor: espacios, comillas y los
 * <ángulos> de un marcador de posición copiado tal cual.
 */
function normalizar(valor) {
  return String(valor)
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .trim()
    .replace(/^<([\s\S]*)>$/, '$1')
    .trim();
}

function requerir(nombre, pista) {
  const bruto = process.env[nombre];
  if (!bruto || !normalizar(bruto)) throw new Error(`Falta ${nombre}. ${pista}`);
  return normalizar(bruto);
}

/**
 * La Management API solo acepta tokens personales `sbp_...`. Cualquier otra
 * cosa provoca un 401 "JWT could not be decoded" que no explica nada, así que
 * lo detectamos antes de salir a la red.
 */
function validarTokenSupabase(token) {
  if (token.startsWith('sbp_')) return;

  const origen = ORIGEN.get('SUPABASE_ACCESS_TOKEN') ?? 'entorno';
  const pista = token.startsWith('eyJ')
    ? 'Eso es una clave JWT del proyecto (anon o service_role). La Management API no las acepta:\n' +
      '  necesitas un token personal de cuenta, que es algo distinto.'
    : 'Un token personal siempre empieza por "sbp_".';

  throw new Error(
    `SUPABASE_ACCESS_TOKEN no tiene el formato esperado.\n` +
    `  Leído de: ${origen}\n` +
    `  Valor:    ${enmascarar(token)}\n` +
    `  ${pista}\n` +
    `  Crea uno en https://supabase.com/dashboard/account/tokens`,
  );
}

// -------------------------------------------------------------------- utils

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * fetch con reintentos ante 429 y errores 5xx. Respeta la cabecera Retry-After
 * cuando Clerk la envía; si no, aplica retroceso exponencial.
 */
async function fetchConReintentos(url, opciones, intentos = 5) {
  for (let intento = 1; ; intento += 1) {
    let respuesta;
    try {
      respuesta = await fetch(url, opciones);
    } catch (causa) {
      if (intento >= intentos) throw causa;
      await dormir(2 ** intento * 250);
      continue;
    }

    if (respuesta.status !== 429 && respuesta.status < 500) return respuesta;
    if (intento >= intentos) return respuesta;

    const retryAfter = Number(respuesta.headers.get('retry-after'));
    const espera = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** intento * 500;
    await dormir(espera);
  }
}

async function cuerpoDeError(respuesta) {
  const texto = await respuesta.text().catch(() => '');
  try {
    const json = JSON.parse(texto);
    const errores = json.errors ?? [];
    if (errores.length > 0) {
      return errores.map((e) => e.long_message ?? e.message ?? e.code).join('; ');
    }
    return texto.slice(0, 400);
  } catch {
    return texto.slice(0, 400);
  }
}

// ------------------------------------------------------------------ Supabase

const CONSULTA_USUARIOS = `
select
  au.id::text                              as id,
  lower(au.email)                          as email,
  au.encrypted_password                    as password_hash,
  au.email_confirmed_at is not null        as email_verificado,
  au.phone                                 as telefono,
  to_char(au.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creado_en,
  au.raw_user_meta_data                    as metadatos,
  au.banned_until                          as bloqueado_hasta,
  pu.name                                  as nombre,
  pu.role                                  as rol,
  pu.status                                as estado,
  pu.owner_request_status                  as estado_solicitud_propietario,
  pu.avatar                                as avatar,
  coalesce(
    (select array_agg(distinct i.provider order by i.provider)
     from auth.identities i
     where i.user_id = au.id),
    '{}'
  )                                        as proveedores
from auth.users au
left join public.users pu on pu.id = au.id
where au.deleted_at is null
  and au.email is not null
order by au.created_at asc
`;

async function leerUsuariosDeSupabase({ token, projectRef }) {
  const respuesta = await fetchConReintentos(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CONSULTA_USUARIOS, read_only: true }),
  });

  if (!respuesta.ok) {
    const detalle = await cuerpoDeError(respuesta);
    if (respuesta.status === 401) {
      throw new Error(
        `Supabase rechazó el token (401: ${detalle}).\n` +
        `  El token tiene forma de "sbp_..." pero no es válido: o está revocado,\n` +
        `  o pertenece a otra cuenta sin acceso al proyecto ${projectRef}.\n` +
        `  Ejecuta con --diagnostico para ver qué proyectos alcanza.`,
      );
    }
    if (respuesta.status === 403) {
      throw new Error(`Sin permiso sobre el proyecto ${projectRef} (403: ${detalle}).`);
    }
    throw new Error(`Supabase respondió ${respuesta.status}: ${detalle}`);
  }

  const filas = await respuesta.json();
  if (!Array.isArray(filas)) {
    throw new Error('La Management API no devolvió un array de filas.');
  }

  return filas;
}

// --------------------------------------------------------------------- Clerk

async function buscarEnClerk({ secreto, externalId }) {
  const url = `${CLERK_API}/users?external_id=${encodeURIComponent(externalId)}&limit=1`;
  const respuesta = await fetchConReintentos(url, {
    headers: { Authorization: `Bearer ${secreto}` },
  });

  if (!respuesta.ok) {
    throw new Error(`Clerk respondió ${respuesta.status} al buscar: ${await cuerpoDeError(respuesta)}`);
  }

  const json = await respuesta.json();
  const lista = Array.isArray(json) ? json : (json.data ?? []);
  return lista[0] ?? null;
}

/** Divide "Ana María Pérez" en nombre y apellidos para los campos de Clerk. */
function partirNombre(nombre) {
  const limpio = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) return { first_name: undefined, last_name: undefined };

  const partes = limpio.split(' ');
  if (partes.length === 1) return { first_name: partes[0], last_name: undefined };

  return { first_name: partes[0], last_name: partes.slice(1).join(' ') };
}

function construirPayload(fila) {
  const metadatos = fila.metadatos ?? {};
  const nombre = fila.nombre || metadatos.name || metadatos.full_name || '';
  const { first_name, last_name } = partirNombre(nombre);

  const payload = {
    external_id: fila.id,
    email_address: [fila.email],
    first_name,
    last_name,
    // La fecha original se conserva para no falsear la antigüedad de la cuenta.
    created_at: fila.creado_en,
    public_metadata: {
      supabaseId: fila.id,
      role: fila.rol ?? 'client',
      status: fila.estado ?? 'active',
      ...(fila.estado_solicitud_propietario ? { ownerRequestStatus: fila.estado_solicitud_propietario } : {}),
      ...(fila.avatar ? { avatar: fila.avatar } : {}),
      migratedFrom: 'supabase',
    },
  };

  if (typeof fila.telefono === 'string' && E164.test(fila.telefono.trim())) {
    payload.phone_number = [fila.telefono.trim()];
  }

  if (typeof fila.password_hash === 'string' && BCRYPT.test(fila.password_hash)) {
    payload.password_digest = fila.password_hash;
    payload.password_hasher = 'bcrypt';
    // Las contraseñas antiguas pueden no cumplir la política actual de Clerk;
    // sin esto, cuentas válidas serían rechazadas durante la importación.
    payload.skip_password_checks = true;
  } else {
    // Cuentas solo-OAuth (Google/Apple) o con hash en formato no soportado.
    payload.skip_password_requirement = true;
  }

  return payload;
}

async function crearEnClerk({ secreto, payload }) {
  const respuesta = await fetchConReintentos(`${CLERK_API}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secreto}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (respuesta.ok) return respuesta.json();

  const detalle = await cuerpoDeError(respuesta);
  const error = new Error(`Clerk respondió ${respuesta.status}: ${detalle}`);
  error.status = respuesta.status;
  error.detalle = detalle;
  throw error;
}

// ---------------------------------------------------------------------- main

/**
 * Comprueba credenciales sin tocar ningún dato: de dónde salió cada variable,
 * qué proyectos alcanza el token y si Clerk responde.
 */
async function ejecutarDiagnostico({ tokenSupabase, projectRef, secretoClerk }) {
  console.log('=== DIAGNÓSTICO ===\n');

  for (const nombre of ['CLERK_SECRET_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF']) {
    const bruto = String(process.env[nombre] ?? '');
    const limpio = normalizar(bruto);
    const secreto = nombre !== 'SUPABASE_PROJECT_REF';

    console.log(`${nombre}`);
    console.log(`  origen: ${ORIGEN.get(nombre) ?? 'entorno'}`);
    console.log(`  valor:  ${secreto ? enmascarar(limpio) : limpio}`);
    if (bruto !== limpio) {
      console.log(`  nota:   se limpiaron comillas/ángulos/espacios al pegarlo (${bruto.length} -> ${limpio.length} caracteres)`);
    }
  }

  console.log('\nProyectos que alcanza el token:');
  const respuesta = await fetchConReintentos(`${SUPABASE_API}/projects`, {
    headers: { Authorization: `Bearer ${tokenSupabase}` },
  });

  if (!respuesta.ok) {
    console.log(`  ERROR ${respuesta.status}: ${await cuerpoDeError(respuesta)}`);
  } else {
    const proyectos = await respuesta.json();
    for (const proyecto of proyectos) {
      const marca = proyecto.id === projectRef ? '-> ' : '   ';
      console.log(`${marca}${proyecto.id}  ${proyecto.name} (${proyecto.status})`);
    }
    if (!proyectos.some((p) => p.id === projectRef)) {
      console.log(`\n  AVISO: ${projectRef} no está en la lista. Revisa SUPABASE_PROJECT_REF.`);
    }
  }

  console.log('\nClerk:');
  const clerk = await fetchConReintentos(`${CLERK_API}/users?limit=1`, {
    headers: { Authorization: `Bearer ${secretoClerk}` },
  });
  console.log(clerk.ok ? `  OK (instancia ${secretoClerk.startsWith('sk_live_') ? 'PRODUCCIÓN' : 'desarrollo'})` : `  ERROR ${clerk.status}: ${await cuerpoDeError(clerk)}`);
}

function clasificar(fila) {
  const proveedores = Array.isArray(fila.proveedores) ? fila.proveedores : [];
  const tienePassword = typeof fila.password_hash === 'string' && BCRYPT.test(fila.password_hash);
  const soloOauth = !tienePassword && proveedores.some((p) => p && p !== 'email');

  return { proveedores, tienePassword, soloOauth };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.ayuda) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
    return;
  }

  cargarEnv();

  const secretoClerk = requerir('CLERK_SECRET_KEY', 'Ejecuta `clerk env pull --file .env`.');
  const tokenSupabase = requerir('SUPABASE_ACCESS_TOKEN', 'Créalo en https://supabase.com/dashboard/account/tokens');
  const projectRef = requerir('SUPABASE_PROJECT_REF', 'Lo encuentras en Settings > General de tu proyecto.');

  validarTokenSupabase(tokenSupabase);

  if (args.diagnostico) {
    await ejecutarDiagnostico({ tokenSupabase, projectRef, secretoClerk });
    return;
  }

  const esProduccion = secretoClerk.startsWith('sk_live_');
  const instancia = esProduccion ? 'live' : 'dev';

  // Los usuarios de dev y de producción son poblaciones distintas: cada una
  // lleva su propio informe para no mezclar historiales.
  if (!args.informe) {
    args.informe = resolve(RAIZ, `scripts/.clerk-migration-report-${instancia}.jsonl`);
  }

  // El aviso importa sobre todo cuando SÍ se va a escribir, así que exigimos
  // una confirmación explícita antes de tocar producción.
  if (esProduccion) {
    console.log('*** Instancia de PRODUCCIÓN de Clerk (sk_live_) ***\n');
    if (args.aplicar && !args.confirmarProduccion) {
      throw new Error(
        'Te faltó --confirmar-produccion.\n' +
        '  Vas a crear usuarios reales en la instancia de producción de Clerk.\n' +
        '  Lanza primero la simulación sin --aplicar y revisa el resumen.\n' +
        '  Cuando estés seguro: bun run migrate:clerk -- --aplicar --confirmar-produccion',
      );
    }
  }

  console.log(args.aplicar ? `=== MIGRACIÓN REAL (${instancia}) ===\n` : `=== SIMULACIÓN ${instancia} (usa --aplicar para escribir en Clerk) ===\n`);

  console.log('Leyendo usuarios de Supabase...');
  let filas = await leerUsuariosDeSupabase({ token: tokenSupabase, projectRef });

  if (args.soloEmail) filas = filas.filter((f) => f.email === args.soloEmail);
  if (Number.isFinite(args.limite)) filas = filas.slice(0, args.limite);

  console.log(`Usuarios a procesar: ${filas.length}\n`);

  const resumen = { creados: 0, existentes: 0, fallidos: 0, sinPassword: 0 };

  for (const [indice, fila] of filas.entries()) {
    const posicion = `[${indice + 1}/${filas.length}]`;
    const { proveedores, soloOauth } = clasificar(fila);
    const payload = construirPayload(fila);
    const conPassword = Boolean(payload.password_digest);

    if (!conPassword) resumen.sinPassword += 1;

    const etiqueta = conPassword ? 'contraseña conservada' : soloOauth ? `solo OAuth (${proveedores.join(', ')})` : 'sin contraseña utilizable';

    let registro = { supabaseId: fila.id, email: fila.email, conPassword, proveedores };

    try {
      const existente = await buscarEnClerk({ secreto: secretoClerk, externalId: fila.id });
      if (existente) {
        resumen.existentes += 1;
        console.log(`${posicion} = ${fila.email} — ya migrado (${existente.id})`);
        registro = { ...registro, resultado: 'existente', clerkId: existente.id };
      } else if (!args.aplicar) {
        resumen.creados += 1;
        console.log(`${posicion} · ${fila.email} — se crearía (${etiqueta})`);
        registro = { ...registro, resultado: 'simulado' };
      } else {
        const creado = await crearEnClerk({ secreto: secretoClerk, payload });
        resumen.creados += 1;
        console.log(`${posicion} + ${fila.email} — creado (${etiqueta}) ${creado.id}`);
        registro = { ...registro, resultado: 'creado', clerkId: creado.id };
      }
    } catch (causa) {
      resumen.fallidos += 1;
      const mensaje = causa instanceof Error ? causa.message : String(causa);
      console.error(`${posicion} ! ${fila.email} — ERROR: ${mensaje}`);
      registro = { ...registro, resultado: 'error', error: mensaje };
    }

    // El informe nunca incluye password_digest.
    appendFileSync(args.informe, `${JSON.stringify({ ...registro, ts: new Date().toISOString() })}\n`);

    if (args.pausaMs > 0 && indice < filas.length - 1) await dormir(args.pausaMs);
  }

  console.log('\n--- Resumen ---');
  console.log(`  ${args.aplicar ? 'Creados' : 'Se crearían'}: ${resumen.creados}`);
  console.log(`  Ya existentes:  ${resumen.existentes}`);
  console.log(`  Sin contraseña: ${resumen.sinPassword}`);
  console.log(`  Fallidos:       ${resumen.fallidos}`);
  console.log(`\nInforme: ${args.informe}`);

  if (resumen.fallidos > 0) process.exitCode = 1;
}

// Solo arranca la migración al invocar el archivo directamente; al importarlo
// (tests) se exponen las funciones puras sin efectos secundarios.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((causa) => {
    console.error(`\nFallo: ${causa instanceof Error ? causa.message : String(causa)}`);
    process.exitCode = 1;
  });
}

export { construirPayload, partirNombre, clasificar, parseArgs, BCRYPT, E164 };

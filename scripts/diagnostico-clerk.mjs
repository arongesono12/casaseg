#!/usr/bin/env node
/**
 * Dice contra qué instancia de Clerk habla esta build y si una cuenta existe
 * ahí, que es lo único que distingue "la contraseña está mal" de
 * "Couldn't find your account.".
 *
 * Clerk mantiene poblaciones de usuarios SEPARADAS por instancia: los usuarios
 * de la instancia de desarrollo (pk_test_) no existen en la de producción
 * (pk_live_) ni al revés. Apuntar la app a una y migrar los usuarios a la otra
 * produce exactamente ese error, sin ninguna pista de por qué.
 *
 * No necesita CLERK_SECRET_KEY: usa la misma API pública (Frontend API) que la
 * app, y NUNCA envía contraseñas — solo pregunta con qué métodos puede entrar
 * cada correo.
 *
 * Uso:
 *   node scripts/diagnostico-clerk.mjs
 *   node scripts/diagnostico-clerk.mjs correo@ejemplo.com otro@ejemplo.com
 */

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '__clerk_api_version=2025-04-10&_clerk_js_version=5.100.0&_is_native=1';

/** Lee del .env solo la clave publicable, sin dependencias. */
function claveDelEnv() {
  const contenido = readFileSync(resolve(RAIZ, '.env'), 'utf8');
  for (const linea of contenido.split(/\r?\n/)) {
    if (/^\s*#/.test(linea)) continue;
    const match = /^\s*(?:export\s+)?EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(.*)$/.exec(linea);
    if (match) return match[1].trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
  }
  return null;
}

/**
 * La clave publicable lleva dentro el dominio de la Frontend API en base64,
 * con un '$' final de relleno. De ahí sale a qué instancia apunta la build.
 */
function instanciaDe(clave) {
  const b64 = clave.replace(/^pk_(test|live)_/, '');
  const dominio = Buffer.from(b64, 'base64').toString('utf8').replace(/\$$/, '');
  return { dominio, entorno: clave.startsWith('pk_live_') ? 'PRODUCCIÓN' : 'desarrollo' };
}

async function main() {
  const correos = process.argv.slice(2);

  const clave = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || claveDelEnv();
  if (!clave) throw new Error('No encontré EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ni en el entorno ni en .env.');

  const { dominio, entorno } = instanciaDe(clave);
  const fapi = `https://${dominio}`;
  console.log(`Instancia:  ${dominio}  (${entorno})`);

  const entornoClerk = await fetch(`${fapi}/v1/environment?${VERSION}`);
  if (!entornoClerk.ok) throw new Error(`La instancia no responde (HTTP ${entornoClerk.status}). Revisa la clave.`);

  const ajustes = (await entornoClerk.json()).user_settings ?? {};
  const sociales = Object.entries(ajustes.social ?? {}).filter(([, v]) => v?.enabled).map(([k]) => k.replace('oauth_', ''));
  console.log(`Contraseña: ${ajustes.attributes?.password?.enabled ? 'habilitada' : 'DESHABILITADA'}`);
  console.log(`Social:     ${sociales.join(', ') || 'ninguno'}`);

  if (correos.length === 0) {
    console.log('\nPasa uno o más correos para comprobar si existen en esta instancia.');
    return;
  }

  // Un solo cliente nativo para todas las consultas: crear uno por petición
  // dispara el límite de peticiones de Clerk y todo empieza a fallar con 429,
  // que es fácil confundir con "la cuenta no existe".
  let token = null;
  const consultar = async (identifier) => {
    const cabeceras = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (token) cabeceras.Authorization = `Bearer ${token}`;

    const respuesta = await fetch(`${fapi}/v1/client/sign_ins?${VERSION}`, {
      method: 'POST',
      headers: cabeceras,
      body: new URLSearchParams({ identifier }).toString(),
    });

    token = respuesta.headers.get('authorization') ?? token;
    const cuerpo = await respuesta.json().catch(() => ({}));
    return { estado: respuesta.status, cuerpo };
  };

  console.log('');
  for (const correo of correos) {
    const { estado, cuerpo } = await consultar(correo.trim().toLowerCase());
    const codigo = cuerpo.errors?.[0]?.code;

    if (estado === 200 || estado === 201) {
      const factores = ((cuerpo.response ?? cuerpo).supported_first_factors ?? []).map((f) => f.strategy);
      const conContrasena = factores.includes('password');
      console.log(`${correo.padEnd(34)} EXISTE — entra con: ${factores.join(', ') || 'ningún método'}`);
      if (!conContrasena) console.log(`${''.padEnd(34)}   ojo: esta cuenta NO admite contraseña.`);
    } else if (codigo === 'form_identifier_not_found') {
      console.log(`${correo.padEnd(34)} NO EXISTE en esta instancia.`);
    } else if (estado === 429) {
      console.log(`${correo.padEnd(34)} límite de peticiones alcanzado; espera unos minutos y repite.`);
    } else {
      console.log(`${correo.padEnd(34)} HTTP ${estado} ${codigo ?? ''}`);
    }

    await new Promise((seguir) => setTimeout(seguir, 1200));
  }
}

main().catch((causa) => {
  console.error(`\nFallo: ${causa instanceof Error ? causa.message : String(causa)}`);
  process.exitCode = 1;
});

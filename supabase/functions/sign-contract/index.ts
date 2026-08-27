import { InputError, readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { number, uuid } from '../_shared/validate.ts';

Deno.serve(serveJson(async (request) => {
  const { supabase, user } = await requireUser(request);
  const body = await readJsonObject(request);

  const contractId = uuid(body.contract_id, 'Identificador de contrato');
  const expectedVersion = number(body.expected_version, 'Versión', 1, 1_000_000);

  // La confirmación explícita es lo que separa un toque accidental de una firma.
  if (body.confirmed !== true) {
    throw new InputError('Debes confirmar la firma de forma explícita.');
  }

  const { data: contract, error: contractError } = await supabase
    .from('lease_contracts')
    .select('id, version, status, signed_at')
    .eq('id', contractId)
    .maybeSingle();

  if (contractError) throw contractError;
  if (!contract) throw new RuleError('El contrato no existe o no tienes acceso.', 404);

  if (contract.status === 'signed') {
    throw new RuleError('Este contrato ya está firmado.', 409);
  }
  if (contract.status !== 'awaiting_signature') {
    throw new RuleError('El contrato todavía no está listo para firmarse.', 409);
  }

  // Bloqueo optimista: si el propietario cambió las condiciones mientras la
  // pantalla estaba abierta, la versión ya no coincide y la firma se rechaza
  // en lugar de aplicarse sobre un texto que el firmante no llegó a leer.
  if (Number(contract.version) !== expectedVersion) {
    throw new RuleError(
      'El contrato cambió desde que lo abriste. Vuelve a revisarlo antes de firmar.',
      409,
    );
  }

  const signedAt = new Date().toISOString();

  // El filtro por versión se repite en el UPDATE para que dos firmas
  // simultáneas no puedan pasar las dos: la segunda no encuentra fila.
  const { data, error } = await supabase
    .from('lease_contracts')
    .update({ status: 'signed', signed_at: signedAt, signed_by: user.id })
    .eq('id', contractId)
    .eq('version', expectedVersion)
    .eq('status', 'awaiting_signature')
    .select('id, version, status, signed_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new RuleError('El contrato cambió durante la firma. Inténtalo de nuevo.', 409);

  return {
    id: String(data.id),
    version: Number(data.version),
    status: String(data.status),
    signedAt: data.signed_at ? String(data.signed_at) : signedAt,
  };
}, 'No se pudo firmar el contrato.'));

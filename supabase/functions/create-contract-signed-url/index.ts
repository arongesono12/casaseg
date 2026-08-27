import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { uuid } from '../_shared/validate.ts';

// Un enlace corto basta para abrir el PDF en el navegador y limita la ventana
// en la que un enlace reenviado sigue sirviendo.
const expiresInSeconds = 300;

Deno.serve(serveJson(async (request) => {
  const { supabase } = await requireUser(request);
  const body = await readJsonObject(request);

  const contractId = uuid(body.contract_id, 'Identificador de contrato');

  // La consulta pasa por RLS: si el contrato no es del llamante, no hay fila y
  // nunca se llega a firmar una URL.
  const { data: contract, error: contractError } = await supabase
    .from('lease_contracts')
    .select('id, document_path')
    .eq('id', contractId)
    .maybeSingle();

  if (contractError) throw contractError;
  if (!contract) throw new RuleError('El contrato no existe o no tienes acceso.', 404);
  if (!contract.document_path) {
    throw new RuleError('Este contrato todavía no tiene documento generado.', 409);
  }

  const { data, error } = await supabase.storage
    .from('contracts-private')
    .createSignedUrl(String(contract.document_path), expiresInSeconds);

  if (error) throw error;
  return { url: data.signedUrl, expiresIn: expiresInSeconds };
}, 'No se pudo abrir el contrato.'));

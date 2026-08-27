import { InputError, readJsonObject, serveJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { number, oneOf } from '../_shared/validate.ts';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
const maxBytes = 10 * 1024 * 1024;

const extensions: Record<(typeof allowedTypes)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

Deno.serve(serveJson(async (request) => {
  const { supabase, user } = await requireUser(request);
  const body = await readJsonObject(request);

  const contentType = oneOf(body.content_type, 'Tipo de documento', allowedTypes);

  // El tamaño llega del cliente y no es de fiar, pero rechazar aquí lo evidente
  // ahorra emitir un token para una subida que el bucket va a rechazar igual.
  if (body.size !== undefined && body.size !== null) {
    const size = number(body.size, 'Tamaño', 1, Number.MAX_SAFE_INTEGER);
    if (size > maxBytes) throw new InputError('El documento supera 10 MB.');
  }

  // El prefijo con el identificador del usuario es lo que permite a las
  // políticas del bucket privado atar cada documento a su dueño.
  const path = `${user.id}/${crypto.randomUUID()}.${extensions[contentType]}`;

  const { data, error } = await supabase.storage
    .from('kyc-private')
    .createSignedUploadUrl(path);

  if (error) throw error;
  return { path: data.path, token: data.token };
}, 'No se pudo preparar la subida del documento.'));

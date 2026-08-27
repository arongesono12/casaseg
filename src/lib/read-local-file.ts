/**
 * `fetch` sobre un URI local (file://, content://, ph://) no lanza cuando el
 * archivo no se puede leer: devuelve una respuesta de error cuyo cuerpo se
 * subiría como si fuera la imagen. Comprobar el estado antes de leer el cuerpo
 * evita publicar una propiedad con fotos corruptas o un documento KYC vacío.
 */
export async function readLocalFile(uri: string) {
  let response: Response;
  try {
    response = await fetch(uri);
  } catch {
    throw new Error('No se pudo leer el archivo seleccionado. Vuelve a elegirlo.');
  }

  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo seleccionado (${response.status}). Vuelve a elegirlo.`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength === 0) throw new Error('El archivo seleccionado está vacío.');
  return body;
}

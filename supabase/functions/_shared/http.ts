export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function readJsonObject(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new InputError('El cuerpo debe ser un objeto JSON válido.');
  }
}

export class InputError extends Error {
  readonly status = 400;
}

/** Error de negocio esperado: se devuelve tal cual al cliente, sin registrar. */
export class RuleError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

/**
 * Envuelve un handler con el preámbulo que toda función comparte: CORS, método
 * permitido y la traducción de errores a códigos HTTP. Sin esto cada función
 * repite el mismo try/catch de doce líneas y acaban divergiendo.
 */
export function serveJson(
  handler: (request: Request) => Promise<unknown>,
  fallbackMessage: string,
) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

    try {
      const result = await handler(request);
      // Un handler que necesite un código distinto de 200 devuelve su propia
      // Response; el resto solo devuelve el cuerpo.
      if (result instanceof Response) return result;
      return jsonResponse(result ?? { ok: true });
    } catch (error) {
      if (error instanceof InputError) return jsonResponse({ error: error.message }, error.status);
      if (error instanceof RuleError) return jsonResponse({ error: error.message }, error.status);
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        return jsonResponse({ error: 'Sesión no válida.' }, 401);
      }
      if (error instanceof Error && error.message === 'OWNER_REQUIRED') {
        return jsonResponse({ error: 'Se requiere un perfil de propietario verificado.' }, 403);
      }
      console.error(error);
      return jsonResponse({ error: fallbackMessage }, 500);
    }
  };
}

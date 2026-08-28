import { describe, expect, test } from 'bun:test';
import { codigoDeClerk, comoError, lanzarSiFalla, MENSAJES_CLERK } from '../../src/features/auth/clerk-errors';

/** Reproduce la forma de `ClerkError`: un Error con `code` y `longMessage`. */
function errorClerk(code: string, message: string, longMessage?: string) {
  return Object.assign(new Error(message), { code, longMessage, clerkError: true as const });
}

describe('codigoDeClerk', () => {
  test('lee el código estable del error', () => {
    expect(codigoDeClerk(errorClerk('form_identifier_not_found', "Couldn't find your account."))).toBe('form_identifier_not_found');
  });

  test('ignora cualquier cosa que no traiga un código de texto', () => {
    expect(codigoDeClerk(new Error('roto'))).toBeUndefined();
    expect(codigoDeClerk({ code: 42 })).toBeUndefined();
    expect(codigoDeClerk(null)).toBeUndefined();
    expect(codigoDeClerk(undefined)).toBeUndefined();
  });
});

describe('comoError', () => {
  test('el fallo que veía el usuario deja de salir en inglés', () => {
    // Este es exactamente el error que devolvía Clerk al no encontrar la cuenta.
    const error = comoError(errorClerk('form_identifier_not_found', "Couldn't find your account.", "Couldn't find your account."), 'respaldo');
    expect(error.message).toBe('No hay ninguna cuenta con ese correo.');
  });

  test('el código manda sobre el texto de Clerk, aunque venga longMessage', () => {
    const error = comoError(errorClerk('too_many_requests', 'Too many requests.', 'Too many requests. Please try again in a bit.'), 'respaldo');
    expect(error.message).toBe(MENSAJES_CLERK.too_many_requests);
  });

  test('un código desconocido cae al longMessage antes que al respaldo', () => {
    const error = comoError(errorClerk('codigo_que_no_existe', 'corto', 'explicación larga'), 'respaldo');
    expect(error.message).toBe('explicación larga');
  });

  test('sin longMessage usa el message, y sin Error usa el respaldo', () => {
    expect(comoError(errorClerk('otro_codigo', 'solo message'), 'respaldo').message).toBe('solo message');
    expect(comoError('esto no es un Error', 'respaldo').message).toBe('respaldo');
    expect(comoError({ code: 'x' }, 'respaldo').message).toBe('respaldo');
  });
});

describe('lanzarSiFalla', () => {
  test('no hace nada cuando Clerk no devuelve error', () => {
    expect(() => lanzarSiFalla({ error: null }, 'respaldo')).not.toThrow();
  });

  test('convierte el `{ error }` del API Future en una excepción traducida', () => {
    expect(() => lanzarSiFalla({ error: errorClerk('form_password_incorrect', 'Password is incorrect.') }, 'respaldo'))
      .toThrow('La contraseña no es correcta.');
  });
});

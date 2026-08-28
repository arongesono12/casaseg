/**
 * Traducción de los fallos de Clerk a texto que se le puede enseñar a alguien.
 *
 * `code` es el único identificador estable de un error de Clerk: su propia
 * documentación marca `message` como texto para desarrolladores — en inglés y
 * sin garantía de continuidad entre versiones. Mostrarlo tal cual es lo que
 * ponía "Couldn't find your account." en mitad de una pantalla en español.
 */

export const MENSAJES_CLERK: Record<string, string> = {
  form_identifier_not_found: 'No hay ninguna cuenta con ese correo.',
  form_password_incorrect: 'La contraseña no es correcta.',
  form_password_or_identifier_incorrect: 'El correo o la contraseña no son correctos.',
  form_password_pwned: 'Esa contraseña apareció en una filtración conocida. Elige otra.',
  form_password_validation_failed: 'La contraseña no cumple los requisitos mínimos.',
  form_password_length_too_short: 'La contraseña es demasiado corta.',
  form_identifier_exists: 'Ya existe una cuenta con ese correo.',
  form_code_incorrect: 'El código no es correcto. Revísalo o pide uno nuevo.',
  form_param_format_invalid: 'Revisa el formato de los datos introducidos.',
  strategy_for_user_invalid: 'Esa forma de entrar no está disponible para esta cuenta.',
  session_exists: 'Ya hay una sesión abierta en este dispositivo.',
  user_locked: 'La cuenta está bloqueada temporalmente por demasiados intentos. Espera unos minutos.',
  too_many_requests: 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.',
  captcha_invalid: 'No pudimos verificar que la petición viene de una persona. Inténtalo de nuevo.',
  not_allowed_access: 'Esta cuenta no tiene permiso para entrar.',
};

/** Lo que necesitamos de `ClerkError` sin acoplarnos a su tipo interno. */
type ErrorDeClerk = Error & { code?: unknown; longMessage?: unknown };

export function codigoDeClerk(error: unknown): string | undefined {
  const codigo = (error as ErrorDeClerk | null | undefined)?.code;
  return typeof codigo === 'string' ? codigo : undefined;
}

/**
 * Convierte lo que devuelve Clerk en un `Error` con un texto mostrable.
 * Ante un código desconocido cae al mensaje de Clerk antes que al respaldo:
 * un texto en inglés sigue siendo mejor pista que uno genérico.
 */
export function comoError(error: unknown, respaldo: string): Error {
  const conocido = MENSAJES_CLERK[codigoDeClerk(error) ?? ''];
  if (conocido) return new Error(conocido);

  if (error instanceof Error) {
    const largo = (error as ErrorDeClerk).longMessage;
    return new Error((typeof largo === 'string' && largo ? largo : null) ?? error.message ?? respaldo);
  }

  return new Error(respaldo);
}

/**
 * Los métodos del API `Future` de Clerk devuelven `{ error }` en vez de lanzar.
 * Las pantallas esperan excepciones, así que traducimos aquí.
 */
export function lanzarSiFalla(resultado: { error: unknown }, respaldo: string) {
  if (resultado.error) throw comoError(resultado.error, respaldo);
}

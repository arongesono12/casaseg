import { getActiveLocale } from '@/lib/active-locale';
import type { Locale } from '@/providers/i18n-context';

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

const MENSAJES_CLERK_POR_IDIOMA: Record<Locale, Record<string, string>> = {
  es: MENSAJES_CLERK,
  fr: {
    form_identifier_not_found: 'Aucun compte n’existe avec cet e-mail.',
    form_password_incorrect: 'Le mot de passe est incorrect.',
    form_password_or_identifier_incorrect: 'L’e-mail ou le mot de passe est incorrect.',
    form_password_pwned: 'Ce mot de passe figure dans une fuite de données connue. Choisissez-en un autre.',
    form_password_validation_failed: 'Le mot de passe ne respecte pas les exigences minimales.',
    form_password_length_too_short: 'Le mot de passe est trop court.',
    form_identifier_exists: 'Un compte existe déjà avec cet e-mail.',
    form_code_incorrect: 'Le code est incorrect. Vérifiez-le ou demandez-en un nouveau.',
    form_param_format_invalid: 'Vérifiez le format des informations saisies.',
    strategy_for_user_invalid: 'Ce mode de connexion n’est pas disponible pour ce compte.',
    session_exists: 'Une session est déjà ouverte sur cet appareil.',
    user_locked: 'Le compte est temporairement bloqué après trop de tentatives. Patientez quelques minutes.',
    too_many_requests: 'Trop de tentatives d’affilée. Patientez un instant et réessayez.',
    captcha_invalid: 'Nous n’avons pas pu vérifier que la demande vient d’une personne. Réessayez.',
    not_allowed_access: 'Ce compte n’est pas autorisé à se connecter.',
  },
  en: {
    form_identifier_not_found: 'There is no account with that email.',
    form_password_incorrect: 'The password is incorrect.',
    form_password_or_identifier_incorrect: 'The email or password is incorrect.',
    form_password_pwned: 'That password appeared in a known data breach. Choose another one.',
    form_password_validation_failed: 'The password does not meet the minimum requirements.',
    form_password_length_too_short: 'The password is too short.',
    form_identifier_exists: 'An account with that email already exists.',
    form_code_incorrect: 'The code is incorrect. Check it or request a new one.',
    form_param_format_invalid: 'Check the format of the details you entered.',
    strategy_for_user_invalid: 'That sign-in method is not available for this account.',
    session_exists: 'A session is already open on this device.',
    user_locked: 'The account is temporarily locked after too many attempts. Wait a few minutes.',
    too_many_requests: 'Too many attempts in a row. Wait a moment and try again.',
    captcha_invalid: 'We could not verify that the request came from a person. Try again.',
    not_allowed_access: 'This account is not allowed to sign in.',
  },
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
  const conocido = MENSAJES_CLERK_POR_IDIOMA[getActiveLocale()][codigoDeClerk(error) ?? ''];
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

import { getActiveLocale } from '@/lib/active-locale';
import { defineCopy } from '@/providers/i18n-context';

// Mensajes que el flujo de acceso muestra al usuario. Se resuelven en el
// momento de usarse para respetar el idioma activo.
const authMessages = defineCopy({
  es: {
    invalidEmail: 'Correo no válido', passwordMin: 'Mínimo 8 caracteres', nameRequired: 'Introduce tu nombre', otpFormat: 'Introduce el código de 6 dígitos', passwordsDontMatch: 'Las contraseñas no coinciden',
    secondFactor: 'Esta cuenta tiene verificación en dos pasos. Introduce el código de tu app de autenticación.', unknownEmail: 'No reconocimos ese correo. Comprueba que esté bien escrito.', needsNewPassword: 'Esta cuenta necesita una contraseña nueva antes de entrar. Te enviaremos un código para crearla.', unknownRole: 'El perfil contiene un rol no reconocido.', invalidName: 'Introduce un nombre válido.', noSession: 'No hay una sesión activa.', signInStarting: 'El servicio de acceso todavía se está iniciando.', noAccountForEmail: 'No hay ninguna cuenta con ese correo. Comprueba que esté bien escrito o crea una cuenta.', signInFailed: 'No se pudo iniciar sesión.', openSessionFailed: 'No se pudo abrir la sesión.', signUpStarting: 'El servicio de registro todavía se está iniciando.', signUpFailed: 'No se pudo crear la cuenta.', sendCodeFailed: 'No se pudo enviar el código.', signUpExpired: 'El registro expiró. Vuelve a crear la cuenta.', invalidCode: 'El código no es válido.', verificationIncomplete: 'La verificación no se completó. Solicita un código nuevo.', resendCodeFailed: 'No se pudo reenviar el código.', accountNotFound: 'No se pudo encontrar esa cuenta.', recoveryCodeFailed: 'No se pudo enviar el código de recuperación.',
  },
  fr: {
    invalidEmail: 'Adresse e-mail invalide', passwordMin: '8 caractères minimum', nameRequired: 'Saisissez votre nom', otpFormat: 'Saisissez le code à 6 chiffres', passwordsDontMatch: 'Les mots de passe ne correspondent pas',
    secondFactor: 'Ce compte utilise la vérification en deux étapes. Saisissez le code de votre application d’authentification.', unknownEmail: 'Nous n’avons pas reconnu cet e-mail. Vérifiez qu’il est bien écrit.', needsNewPassword: 'Ce compte a besoin d’un nouveau mot de passe avant de se connecter. Nous vous enverrons un code pour le créer.', unknownRole: 'Le profil contient un rôle inconnu.', invalidName: 'Saisissez un nom valide.', noSession: 'Aucune session active.', signInStarting: 'Le service de connexion démarre encore.', noAccountForEmail: 'Aucun compte n’existe avec cet e-mail. Vérifiez qu’il est bien écrit ou créez un compte.', signInFailed: 'La connexion a échoué.', openSessionFailed: 'Impossible d’ouvrir la session.', signUpStarting: 'Le service d’inscription démarre encore.', signUpFailed: 'Impossible de créer le compte.', sendCodeFailed: 'Impossible d’envoyer le code.', signUpExpired: 'L’inscription a expiré. Recréez le compte.', invalidCode: 'Le code n’est pas valide.', verificationIncomplete: 'La vérification n’a pas abouti. Demandez un nouveau code.', resendCodeFailed: 'Impossible de renvoyer le code.', accountNotFound: 'Impossible de trouver ce compte.', recoveryCodeFailed: 'Impossible d’envoyer le code de récupération.',
  },
  en: {
    invalidEmail: 'Invalid email', passwordMin: 'At least 8 characters', nameRequired: 'Enter your name', otpFormat: 'Enter the 6-digit code', passwordsDontMatch: 'The passwords do not match',
    secondFactor: 'This account uses two-step verification. Enter the code from your authenticator app.', unknownEmail: 'We did not recognize that email. Check that it is spelled correctly.', needsNewPassword: 'This account needs a new password before signing in. We will send you a code to create it.', unknownRole: 'The profile has an unrecognized role.', invalidName: 'Enter a valid name.', noSession: 'There is no active session.', signInStarting: 'The sign-in service is still starting.', noAccountForEmail: 'There is no account with that email. Check that it is spelled correctly or create an account.', signInFailed: 'Could not sign in.', openSessionFailed: 'Could not open the session.', signUpStarting: 'The sign-up service is still starting.', signUpFailed: 'Could not create the account.', sendCodeFailed: 'Could not send the code.', signUpExpired: 'The sign-up expired. Create the account again.', invalidCode: 'The code is not valid.', verificationIncomplete: 'Verification was not completed. Request a new code.', resendCodeFailed: 'Could not resend the code.', accountNotFound: 'Could not find that account.', recoveryCodeFailed: 'Could not send the recovery code.',
  },
});

export type AuthMessageKey = keyof (typeof authMessages)['es'];

export function authMessage(key: AuthMessageKey): string {
  return authMessages[getActiveLocale()][key];
}

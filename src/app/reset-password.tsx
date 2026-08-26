import { Redirect } from 'expo-router';

/**
 * Recuperación de contraseña heredada de Supabase.
 *
 * <AuthView /> incluye el flujo completo de recuperación, así que Clerk ya no
 * envía enlaces a esta ruta. Se mantiene para que los correos antiguos que
 * sigan llegando lleven al usuario a la pantalla de acceso en vez de fallar.
 */
export default function ResetPasswordScreen() {
  return <Redirect href="/(auth)/login" />;
}

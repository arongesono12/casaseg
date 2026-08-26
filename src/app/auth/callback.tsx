import { Redirect } from 'expo-router';

/**
 * Retorno de OAuth heredado de Supabase.
 *
 * Clerk gestiona sus propias redirecciones nativas (esquema `clerk://`, que
 * registra el plugin de Expo), así que esta ruta ya no recibe ningún código.
 * Se mantiene para que los enlaces antiguos que sigan circulando no acaben en
 * una pantalla en blanco.
 */
export default function AuthCallback() {
  return <Redirect href="/(auth)/login" />;
}

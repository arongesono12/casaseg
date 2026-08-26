import { AuthView } from '@clerk/expo/native';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { isExpoGo } from '@/lib/execution-environment';
import { useAppTheme } from '@/providers/theme-context';

/**
 * Inicio de sesión y registro con la UI nativa de Clerk.
 *
 * <AuthView /> cubre por sí sola credenciales, OAuth, verificación por código
 * y recuperación de contraseña, por lo que sustituye a las pantallas de
 * register / forgot-password / verify que existían para Supabase.
 *
 * Es una vista nativa (SwiftUI en iOS, Compose en Android): requiere el plugin
 * '@clerk/expo' en app.config.ts y un development build regenerado. No funciona
 * en Expo Go ni en un cliente compilado antes de añadir el plugin.
 */
export default function LoginScreen() {
  const { palette } = useAppTheme();

  // Volver a la pantalla anterior; si se entró por enlace directo no hay
  // historial, así que caemos a la pestaña pública de exploración.
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/explore');
  };

  if (isExpoGo) return <AvisoExpoGo />;

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {/* El layout del grupo oculta la cabecera, así que `onHostBack` aporta el
          botón de retorno dentro de la propia navegación nativa de Clerk.
          `isDismissible={false}` evita que se dibuje un segundo control. */}
      <AuthView mode="signInOrUp" isDismissible={false} onHostBack={volver} />
    </View>
  );
}

/** Expo Go no incluye módulos nativos de terceros, así que AuthView no existe ahí. */
function AvisoExpoGo() {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.root, styles.aviso, { backgroundColor: palette.background }]}>
      <Text style={[styles.avisoTitulo, { color: palette.text }]}>Requiere development build</Text>
      <Text style={[styles.avisoTexto, { color: palette.textSecondary }]}>
        La pantalla de acceso de Clerk es una vista nativa y no está disponible en Expo Go.
        Ejecuta `npx expo prebuild --clean`, reinstala el development build y vuelve a abrir esta pantalla.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  aviso: { gap: 12, justifyContent: 'center', paddingHorizontal: 24 },
  avisoTitulo: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  avisoTexto: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
});

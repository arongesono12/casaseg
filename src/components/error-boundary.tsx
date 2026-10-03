import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumErrorState } from '@/components/ui/premium';
import { radius } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

/**
 * Un error de render sin capturar deja pantalla roja en desarrollo y pantalla
 * en blanco en una build de tienda: la app parece colgada y el único camino es
 * cerrarla. Esta frontera lo convierte en un estado con salida.
 *
 * Es una clase porque `componentDidCatch` no tiene equivalente en hooks. La
 * parte visual vive en un componente aparte para poder usar el tema.
 */

type Props = { children: ReactNode };
type State = { error: Error | null };

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { palette } = useAppTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PremiumErrorState
          title={t('errorScreenTitle')}
          description={t('errorScreenBody')}
          onRetry={onRetry}
        />
        {/* El detalle técnico solo en desarrollo: en producción no aporta nada
            al usuario y puede exponer rutas o datos internos. */}
        {__DEV__ ? (
          <View style={[styles.details, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
            <Text style={[styles.detailsTitle, { color: palette.text }]}>Detalle (solo desarrollo)</Text>
            <Text selectable style={[styles.detailsBody, { color: palette.textSecondary }]}>
              {error.message}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin servicio de reporte todavía: al menos queda en el log del dispositivo,
    // que es lo que se lee con `adb logcat` o la consola de Xcode.
    console.error('[casaseg] Error no capturado:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 20 },
  details: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 14, gap: 6 },
  detailsTitle: { fontSize: 13, fontWeight: '800' },
  detailsBody: { fontSize: 13, lineHeight: 19, fontFamily: 'monospace' },
});

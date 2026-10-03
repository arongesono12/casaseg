import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

const SCRIM_OPACITY = 0.86;

/**
 * Velo translúcido bajo la barra de estado. Las pantallas con scroll dibujan
 * de borde a borde (el contenido pasa por detrás de la barra en lugar de
 * cortarse en el inset superior) y este velo mantiene legibles los iconos del
 * sistema cuando hay contenido debajo.
 */
export function StatusBarScrim() {
  const { top } = useSafeAreaInsets();
  const { palette } = useAppTheme();
  if (top <= 0) return null;
  return <View pointerEvents="none" style={[styles.scrim, { height: top, backgroundColor: withAlpha(palette.background, SCRIM_OPACITY) }]} />;
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
});

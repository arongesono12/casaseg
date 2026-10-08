import { StyleSheet, Text, View } from 'react-native';

import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { fontFamily } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

/** Small brand signature for forms where the content needs the vertical space. */
export function AuthBrand() {
  const { palette } = useAppTheme();

  return (
    <View accessibilityLabel="CasaSeg" style={styles.brand}>
      <CasasegLogo width={34} height={29} />
      <Text style={[styles.wordmark, { color: palette.text }]}>CASASEG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  wordmark: { fontFamily: fontFamily.extrabold, fontSize: 13, letterSpacing: 1.8 },
});

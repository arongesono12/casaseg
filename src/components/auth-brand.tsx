import { StyleSheet, View } from 'react-native';

import { CasasegLogo } from '@/components/ui/casaseg-logo';

/** Icono de marca centrado sobre el título de acceso y registro. */
export function AuthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="CasasEG" accessibilityRole="image" style={styles.brand}>
      <CasasegLogo width={compact ? 40 : 52} height={compact ? 33 : 43} />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});

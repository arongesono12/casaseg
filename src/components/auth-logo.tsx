import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const logo = require('../../public/logo/logo.svg');

export function AuthLogo({ compact = false }: { compact?: boolean }) {
  return <Image accessibilityLabel="CasaSeg" contentFit="contain" source={logo} style={[styles.logo, compact && styles.logoCompact]} />;
}

const styles = StyleSheet.create({
  logo: { width: 112, height: 91, alignSelf: 'center' },
  logoCompact: { width: 82, height: 67 },
});

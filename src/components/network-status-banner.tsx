import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';

export function NetworkStatusBanner() {
  const [offline, setOffline] = useState(false);
  const { t } = useI18n();
  useEffect(() => { void Network.getNetworkStateAsync().then((state) => setOffline(state.isConnected === false)); const subscription = Network.addNetworkStateListener((state) => setOffline(state.isConnected === false)); return () => subscription.remove(); }, []);
  if (!offline) return null;
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.text}>{t('offline')}</Text></View>;
}
const styles = StyleSheet.create({ banner: { position: 'absolute', zIndex: 100, left: 16, right: 16, top: 8, minHeight: 40, borderRadius: 20, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, text: { color: '#3A2600', fontSize: 13, fontWeight: '700' } });

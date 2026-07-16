import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/theme-context';

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>(); const { palette } = useAppTheme(); const [error, setError] = useState('');
  useEffect(() => { let active = true; const exchange = async () => { if (!code) { router.replace('/(auth)/login'); return; } const result = await supabase.auth.exchangeCodeForSession(code); if (!active) return; if (result.error) setError(result.error.message); else router.replace('/(tabs)/explore'); }; void exchange(); return () => { active = false; }; }, [code]);
  return <View style={[styles.screen, { backgroundColor: palette.background }]}>{error ? <Text style={{ color: colors.error }}>{error}</Text> : <ActivityIndicator color={colors.brand} size="large" />}</View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } });

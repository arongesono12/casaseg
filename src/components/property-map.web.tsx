import { MapPinned } from '@/components/ui/icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import type { Property } from '@/types';

export function PropertyMap({ properties: _properties }: { properties: Property[] }) {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  return <View style={[styles.empty, { backgroundColor: palette.subtle }]}><MapPinned color={colors.brandDark} size={38} /><Text style={[styles.title, { color: palette.text }]}>{t('mapNativeOnly')}</Text><Text style={[styles.copy, { color: palette.textSecondary }]}>{t('mapWebHint')}</Text></View>;
}
const styles = StyleSheet.create({ empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }, title: { fontSize: 20, fontWeight: '900' }, copy: { fontSize: 14, textAlign: 'center' } });

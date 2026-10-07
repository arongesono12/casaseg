import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, radius, type AppPalette } from '@/constants/theme';
import { propertyInitialTotal } from '@/features/properties/pricing';
import { useI18n } from '@/providers/i18n-context';
import type { Property } from '@/types';
import { formatXaf } from '@/utils/formatters';

export function PriceBreakdown({ property, palette }: { property: Property; palette: AppPalette }) {
  const { locale, t } = useI18n();
  const rows = [
    { key: 'service', label: t('serviceFee'), amount: property.serviceFeeAmount ?? 0 },
    { key: 'cleaning', label: t('cleaningFee'), amount: property.cleaningFeeAmount ?? 0 },
    { key: 'taxes', label: t('taxes'), amount: property.taxAmount ?? 0 },
    { key: 'deposit', label: t('securityDeposit'), amount: property.securityDepositAmount ?? 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.fees, { backgroundColor: palette.subtle }]}>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>{row.label}</Text>
            <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(row.amount, undefined, locale)}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.total, { borderTopColor: palette.border }]}>
        <Text style={[styles.totalLabel, { color: palette.text }]}>{t('estimatedTotal')}</Text>
        <Text selectable style={[styles.totalAmount, { color: palette.text }]}>{formatXaf(propertyInitialTotal(property), undefined, locale)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  fees: { padding: 14, borderRadius: radius.md, gap: 10 },
  row: { minHeight: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, fontFamily: fontFamily.medium },
  amount: { flexShrink: 0, fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'], textAlign: 'right' },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalLabel: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.bold },
  totalAmount: { flexShrink: 0, fontSize: 16, lineHeight: 22, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'], textAlign: 'right' },
});

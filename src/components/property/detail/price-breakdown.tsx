import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, radius, type AppPalette } from '@/constants/theme';
import { propertyInitialTotal, propertyNextPaymentTotal } from '@/features/properties/pricing';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import type { Property } from '@/types';
import { formatXaf } from '@/utils/formatters';

// Mismos textos que la web (propertyDetails.*): fianza y limpieza solo se cobran con el primer pago.
const chargesCopy = defineCopy({
  es: { rent: 'Renta', oneTime: 'solo el primer pago', firstPayment: 'Total del primer pago', nextPayments: 'Pagos siguientes', frozen: 'Estos importes quedan fijados en el contrato que firmáis ambas partes.' },
  fr: { rent: 'Loyer', oneTime: 'premier paiement uniquement', firstPayment: 'Total du premier paiement', nextPayments: 'Paiements suivants', frozen: 'Ces montants sont fixés dans le contrat signé par les deux parties.' },
  en: { rent: 'Rent', oneTime: 'first payment only', firstPayment: 'First payment total', nextPayments: 'Following payments', frozen: 'These amounts are fixed in the contract both parties sign.' },
});

export function PriceBreakdown({ property, palette }: { property: Property; palette: AppPalette }) {
  const { locale, t } = useI18n();
  const copy = useCopy(chargesCopy);
  const isRental = property.priceType !== 'sale';
  const rows = [
    { key: 'rent', label: copy.rent, amount: property.price, oneTime: false },
    { key: 'service', label: t('serviceFee'), amount: property.serviceFeeAmount ?? 0, oneTime: false },
    { key: 'cleaning', label: t('cleaningFee'), amount: property.cleaningFeeAmount ?? 0, oneTime: isRental },
    { key: 'taxes', label: t('taxes'), amount: property.taxAmount ?? 0, oneTime: false },
    { key: 'deposit', label: t('securityDeposit'), amount: property.securityDepositAmount ?? 0, oneTime: isRental },
  ];
  const firstTotal = propertyInitialTotal(property);
  const nextTotal = propertyNextPaymentTotal(property);

  return (
    <View style={styles.container}>
      <View style={[styles.fees, { backgroundColor: palette.subtle }]}>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>
              {row.label}{row.oneTime && row.amount > 0 ? ` (${copy.oneTime})` : ''}
            </Text>
            <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(row.amount, undefined, locale)}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.total, { borderTopColor: palette.border }]}>
        <Text style={[styles.totalLabel, { color: palette.text }]}>{isRental ? copy.firstPayment : t('estimatedTotal')}</Text>
        <Text selectable style={[styles.totalAmount, { color: palette.text }]}>{formatXaf(firstTotal, undefined, locale)}</Text>
      </View>
      {isRental && nextTotal !== firstTotal ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>{copy.nextPayments}</Text>
          <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(nextTotal, property.priceType, locale)}</Text>
        </View>
      ) : null}
      <Text style={[styles.note, { color: palette.textSecondary }]}>{copy.frozen}</Text>
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
  note: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
});

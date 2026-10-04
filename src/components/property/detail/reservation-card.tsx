import { Send } from '@/components/ui/icons';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, radius, type AppPalette } from '@/constants/theme';

import type { DetailCopy } from './detail-copy';
import { PrimaryButton, SecondaryButton } from './detail-parts';

type ReservationCardProps = {
  palette: AppPalette;
  price: string;
  priceUnit: string;
  actionLabel: string;
  contactLabel: string;
  copy: DetailCopy;
  onAction: () => void;
  onContact: () => void;
};

// Solo se muestra en pantalla ancha: en móvil el precio y la acción viven en la
// barra inferior y el contacto en la tarjeta del propietario.
export function ReservationCard({ palette, price, priceUnit, actionLabel, contactLabel, copy, onAction, onContact }: ReservationCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View>
        <Text selectable style={[styles.price, { color: palette.text }]}>{price}</Text>
        <Text style={[styles.unit, { color: palette.textSecondary }]}>{priceUnit}</Text>
      </View>
      <PrimaryButton label={actionLabel} onPress={onAction} />
      <SecondaryButton label={contactLabel} onPress={onContact} palette={palette} icon={<Send color={palette.text} size={19} />} />
      <Text style={[styles.noCharge, { color: palette.textSecondary }]}>{copy.noCharge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: 18,
    gap: 14,
    boxShadow: '0 14px 36px rgba(15,23,42,0.10)',
  },
  price: { fontSize: 24, lineHeight: 30, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.bold, marginTop: 2 },
  noCharge: { fontFamily: fontFamily.regular, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});

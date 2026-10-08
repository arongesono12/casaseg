import { createElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Car,
  CheckCircle2,
  Send,
  ShieldCheck,
  Swimming,
  Tree,
  Verified,
  Wifi,
  Wind,
  type AppIcon,
} from '@/components/ui/icons';
import { UserAvatar } from '@/components/user-avatar';
import { PremiumButton } from '@/components/ui/premium';
import { brand, colors, fontFamily, radius, touchTarget, type AppPalette } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

// Las comodidades se guardan con su nombre en español (ver amenities.ts); aquí
// solo se elige el icono. Las que escribió el propietario usan el genérico.
const amenityIcons: Record<string, AppIcon> = {
  'Aire acondicionado': Wind,
  Aparcamiento: Car,
  Seguridad: ShieldCheck,
  Internet: Wifi,
  Piscina: Swimming,
  Jardín: Tree,
};

export function amenityIcon(amenity: string): AppIcon {
  return amenityIcons[amenity] ?? CheckCircle2;
}

export function Badge({ label, backgroundColor, textColor }: { label: string; backgroundColor: string; textColor: string }) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function FactTile({ icon: Icon, value, label, palette }: { icon: AppIcon; value: string; label: string; palette: AppPalette }) {
  return (
    <View style={[styles.factTile, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.factIcon, { backgroundColor: `${colors.accent}14` }]}>
        <Icon color={palette.brandIcon} size={20} />
      </View>
      <Text numberOfLines={1} style={[styles.factValue, { color: palette.text }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.factLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function HostCard({
  palette,
  name,
  avatar,
  eyebrow,
  verifiedLabel,
  contactLabel,
  onContact,
}: {
  palette: AppPalette;
  name: string;
  avatar?: string;
  eyebrow: string;
  verifiedLabel: string;
  contactLabel: string;
  onContact: () => void;
}) {
  return (
    <View style={[styles.card, styles.hostCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <UserAvatar name={name} uri={avatar} size={56} />
      <View style={styles.flex}>
        <Text style={[styles.hostEyebrow, { color: palette.textSecondary }]}>{eyebrow}</Text>
        <Text selectable numberOfLines={1} style={[styles.hostName, { color: palette.text }]}>{name}</Text>
        <View style={styles.hostVerified}>
          <Verified color={colors.accentDark} size={16} />
          <Text style={[styles.hostVerifiedText, { color: colors.accentDark }]}>{verifiedLabel}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={contactLabel}
        onPress={onContact}
        style={({ pressed }) => [styles.hostAction, { backgroundColor: palette.subtle, opacity: pressed ? 0.7 : 1 }]}
      >
        <Send color={palette.brandIcon} size={21} />
      </Pressable>
    </View>
  );
}

export function Section({ title, palette, children }: { title: string; palette: AppPalette; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export function AmenityChip({ amenity, label, palette }: { amenity: string; label: string; palette: AppPalette }) {
  return (
    <View style={[styles.amenity, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {/* El icono sale de un mapa estático; createElement evita declarar un componente en el render. */}
      {createElement(amenityIcon(amenity), { color: palette.brandIcon, size: 20 })}
      <Text numberOfLines={2} style={[styles.amenityText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <PremiumButton label={label} onPress={onPress} variant="brand" />;
}

export function SecondaryButton({ label, onPress, palette, icon }: { label: string; onPress: () => void; palette: AppPalette; icon?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: palette.surface === brand.neutral[0] ? brand.neutral[300] : palette.border, backgroundColor: pressed ? palette.subtle : palette.surface },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.secondaryText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: 16,
    boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
  },
  badge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontFamily: fontFamily.bold },
  factTile: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  factIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  factValue: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'] },
  factLabel: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.bold },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hostEyebrow: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  hostName: { fontSize: 17, lineHeight: 23, fontFamily: fontFamily.extrabold },
  hostVerified: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  hostVerifiedText: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.bold },
  hostAction: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 14 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.extrabold, letterSpacing: -0.3 },
  // flexBasis + flexGrow deja que reflote sola: dos columnas en móvil y más en tablet.
  amenity: {
    flexBasis: 150,
    flexGrow: 1,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amenityText: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: fontFamily.bold },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { textAlign: 'center', fontSize: 14, lineHeight: 19, fontFamily: fontFamily.semibold },
  pressed: { transform: [{ scale: 0.98 }] },
});

import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ChartLine, CreditCard, FileText, Settings, UserRound } from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export type ProfileTab = 'profile' | 'activity' | 'contracts' | 'payments' | 'settings';

// Mismo orden y mismos nombres que las pestañas del perfil en la web.
const tabCopy = defineCopy({
  es: { profile: 'Información personal', activity: 'Actividad reciente', contracts: 'Contratos', payments: 'Pagos', settings: 'Configuración', label: 'Secciones del perfil' },
  fr: { profile: 'Informations personnelles', activity: 'Activité récente', contracts: 'Contrats', payments: 'Paiements', settings: 'Paramètres', label: 'Sections du profil' },
  en: { profile: 'Personal information', activity: 'Recent activity', contracts: 'Contracts', payments: 'Payments', settings: 'Settings', label: 'Profile sections' },
});

const tabs: readonly { key: ProfileTab; icon: IconComponent }[] = [
  { key: 'profile', icon: UserRound },
  { key: 'activity', icon: ChartLine },
  { key: 'contracts', icon: FileText },
  { key: 'payments', icon: CreditCard },
  { key: 'settings', icon: Settings },
];

export function ProfileTabs({ active, onChange }: { active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  const { palette } = useAppTheme();
  const labels = useCopy(tabCopy);
  const { width } = useWindowDimensions();
  // En móviles, una fila horizontal escondía Contratos, Pagos y Configuración.
  // Dos columnas dejan las cinco secciones disponibles sin requerir desplazamiento.
  const compact = width < 680;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={labels.label}
      style={[styles.row, compact ? styles.rowCompact : styles.rowWide]}
    >
      {tabs.map(({ key, icon: Icon }) => {
        const selected = key === active;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.tab,
              compact ? styles.tabCompact : styles.tabWide,
              selected ? styles.tabSelected : { borderColor: palette.border, backgroundColor: palette.surface },
              pressed && !selected && { backgroundColor: palette.subtle },
            ]}
          >
            <Icon color={selected ? 'white' : palette.textSecondary} size={17} />
            <Text numberOfLines={2} style={[styles.tabText, compact && styles.tabTextCompact, { color: selected ? 'white' : palette.textSecondary }]}>{labels[key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  rowCompact: { flexDirection: 'row', flexWrap: 'wrap' },
  rowWide: { flexDirection: 'row' },
  tab: { minHeight: touchTarget, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabCompact: { flexBasis: '48%', flexGrow: 1, minHeight: 58 },
  tabWide: { flex: 1, minWidth: 0 },
  tabSelected: { backgroundColor: colors.brand, borderColor: colors.brand, boxShadow: `0 8px 18px ${colors.brand}38` },
  tabText: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontFamily: fontFamily.bold, textAlign: 'center' },
  tabTextCompact: { textAlign: 'left' },
});

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

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

  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      accessibilityLabel={labels.label}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
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
              selected ? styles.tabSelected : { borderColor: palette.border, backgroundColor: palette.surface },
              pressed && !selected && { backgroundColor: palette.subtle },
            ]}
          >
            <Icon color={selected ? 'white' : palette.textSecondary} size={17} />
            <Text style={[styles.tabText, { color: selected ? 'white' : palette.textSecondary }]}>{labels[key]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0 },
  row: { gap: 8 },
  tab: { minHeight: touchTarget, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabSelected: { backgroundColor: colors.brand, borderColor: colors.brand, boxShadow: `0 8px 18px ${colors.brand}38` },
  tabText: { fontSize: 14, fontFamily: fontFamily.bold },
});

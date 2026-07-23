import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, FileText, Info, Lock, ShieldCheck } from '@/components/ui/icons';
import { IconTile, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

type LegalSection = { title: string; body: string; icon?: ReactNode };

export function LegalPage({ title, description, updated, sections }: { title: string; description: string; updated: string; sections: LegalSection[] }) {
  const { palette } = useAppTheme();
  return (
    <RouteScreen title={title} description={description}>
      <View style={[styles.summary, { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}24` }]}>
        <IconTile icon={ShieldCheck} size={44} />
        <View style={styles.summaryCopy}>
          <Text style={[styles.summaryTitle, { color: palette.text }]}>Información clara y transparente</Text>
          <Text style={[styles.summaryText, { color: palette.textSecondary }]}>Hemos resumido los puntos esenciales para que puedas entenderlos con facilidad.</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <StatusPill label={`Actualizado · ${updated}`} tone={colors.brand} icon={CheckCircle2} />
        <StatusPill label="Documento oficial" tone={colors.success} icon={Lock} />
      </View>
      <View style={styles.sections}>
        {sections.map((section, index) => (
          <View key={section.title} style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.number, { backgroundColor: index === 0 ? `${colors.brand}14` : palette.subtle }]}>
                {section.icon ?? (index === 0 ? <Info color={colors.brand} size={20} /> : <FileText color={palette.textSecondary} size={20} />)}
              </View>
              <Text style={[styles.title, { color: palette.text }]}>{section.title}</Text>
            </View>
            <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{section.body}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.footer, { color: palette.muted }]}>Si necesitas aclarar algún punto, utiliza el centro de ayuda desde tu perfil.</Text>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryCopy: { flex: 1, gap: 3 },
  summaryTitle: { fontSize: 14, fontWeight: '900' },
  summaryText: { fontSize: 12, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sections: { gap: 12 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 18, gap: 13, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  number: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 22 },
  footer: { textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 12 },
});

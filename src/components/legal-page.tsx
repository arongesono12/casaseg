import { useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  List,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
} from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill, type IconComponent } from '@/components/ui/premium';
import { colors, fontFamily, radius, withAlpha } from '@/constants/theme';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const legalCopy = defineCopy({
  es: { goToSection: 'Ir a la sección {number}: {title}', defaultSummary: 'Consulta los puntos esenciales de este documento y accede rápidamente a cada sección.', defaultContactTitle: '¿Necesitas aclarar algún punto?', defaultContactBody: 'Escríbenos desde tu correo asociado a CasaSeg para que podamos ayudarte.', defaultContactLabel: 'Contactar con soporte', shareMessage: '{title} de CasaSeg', summaryTitle: 'Información clara y transparente', updated: 'Actualizado · {date}', official: 'Documento oficial', share: 'Compartir', print: 'Imprimir', save: 'Guardar', help: 'Ayuda', contentsTitle: 'En este documento', contentsDetail: 'Selecciona una sección para ir directamente.', section: 'SECCIÓN {number}', supportSubject: 'Consulta sobre {title}', helpCenter: 'Centro de ayuda', footer: 'CasaSeg · {title} · Última actualización: {date}', spanishOnly: '' },
  fr: { goToSection: 'Aller à la section {number} : {title}', defaultSummary: 'Consultez les points essentiels de ce document et accédez rapidement à chaque section.', defaultContactTitle: 'Besoin de précisions ?', defaultContactBody: 'Écrivez-nous depuis l’adresse e-mail associée à CasaSeg pour que nous puissions vous aider.', defaultContactLabel: 'Contacter le support', shareMessage: '{title} de CasaSeg', summaryTitle: 'Des informations claires et transparentes', updated: 'Mis à jour · {date}', official: 'Document officiel', share: 'Partager', print: 'Imprimer', save: 'Enregistrer', help: 'Aide', contentsTitle: 'Dans ce document', contentsDetail: 'Choisissez une section pour y accéder directement.', section: 'SECTION {number}', supportSubject: 'Question sur {title}', helpCenter: 'Centre d’aide', footer: 'CasaSeg · {title} · Dernière mise à jour : {date}', spanishOnly: 'Ce document fait foi dans sa version espagnole, la seule disponible pour le moment.' },
  en: { goToSection: 'Go to section {number}: {title}', defaultSummary: 'Review the key points of this document and jump quickly to each section.', defaultContactTitle: 'Need something clarified?', defaultContactBody: 'Write to us from the email linked to CasaSeg so we can help you.', defaultContactLabel: 'Contact support', shareMessage: 'CasaSeg {title}', summaryTitle: 'Clear and transparent information', updated: 'Updated · {date}', official: 'Official document', share: 'Share', print: 'Print', save: 'Save', help: 'Help', contentsTitle: 'In this document', contentsDetail: 'Choose a section to jump straight to it.', section: 'SECTION {number}', supportSubject: 'Question about {title}', helpCenter: 'Help center', footer: 'CasaSeg · {title} · Last updated: {date}', spanishOnly: 'The Spanish version of this document is the binding one and the only one available for now.' },
});

type LegalSection = {
  title: string;
  body?: string;
  items?: readonly string[];
  note?: string;
  icon?: ReactNode;
};

type LegalPageProps = {
  title: string;
  description: string;
  updated: string;
  sections: readonly LegalSection[];
  documentUrl?: string;
  summary?: string;
  contactTitle?: string;
  contactDescription?: string;
  contactLabel?: string;
};

type CompactActionProps = {
  label: string;
  icon: IconComponent;
  onPress: () => void;
};

function CompactAction({ label, icon: Icon, onPress }: CompactActionProps) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactAction,
        { backgroundColor: palette.surface, borderColor: palette.border },
        hovered && { borderColor: `${colors.brand}66` },
        focused && styles.focused,
        pressed && styles.pressed,
      ]}>
      <Icon color={palette.brandIcon} size={18} />
      <Text style={[styles.compactActionLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function ContentsLink({ index, label, onPress }: { index: number; label: string; onPress: () => void }) {
  const { palette } = useAppTheme();
  const copy = useCopy(legalCopy);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={interpolate(copy.goToSection, { number: index + 1, title: label })}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.contentsLink,
        hovered && { backgroundColor: `${colors.brand}0D` },
        focused && styles.focused,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.contentsNumber, { color: palette.brandText }]}>{String(index + 1).padStart(2, '0')}</Text>
      <Text numberOfLines={2} style={[styles.contentsLabel, { color: palette.textSecondary }]}>{label}</Text>
      <ChevronRight color={palette.muted} size={17} />
    </Pressable>
  );
}

export function LegalPage({
  title,
  description,
  updated,
  sections,
  documentUrl = 'https://casaseg.com',
  summary,
  contactTitle,
  contactDescription,
  contactLabel,
}: LegalPageProps) {
  const { palette } = useAppTheme();
  const copy = useCopy(legalCopy);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<number[]>([]);
  const layoutOffsets = useRef({ screen: 0, document: 0, content: 0, sections: 0 });

  const scrollToSection = (index: number) => {
    // screen: el contenido empieza debajo de la cabecera a sangre de RouteScreen.
    const offset = layoutOffsets.current.screen
      + layoutOffsets.current.document
      + layoutOffsets.current.content
      + layoutOffsets.current.sections
      + (sectionOffsets.current[index] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - 16), animated: true });
  };

  const shareDocument = () => {
    void Share.share({ title, message: `${interpolate(copy.shareMessage, { title })}\n${documentUrl}`, url: documentUrl }).catch(() => undefined);
  };

  const printOrShare = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }
    shareDocument();
  };

  return (
    <RouteScreen scrollRef={scrollRef} title={title} description={description} maxWidth={1040} onContentOffset={(y) => { layoutOffsets.current.screen = y; }}>
      <View style={[styles.summary, { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}24` }]}>
        <IconTile icon={ShieldCheck} size={52} />
        <View style={styles.summaryCopy}>
          <Text style={[styles.summaryTitle, { color: palette.text }]}>{copy.summaryTitle}</Text>
          <Text selectable style={[styles.summaryText, { color: palette.textSecondary }]}>
            {summary ?? copy.defaultSummary}
          </Text>
        </View>
      </View>

      {copy.spanishOnly ? (
        <View style={[styles.note, { backgroundColor: `${colors.warning}0D`, borderColor: `${colors.warning}2B` }]}>
          <Info color={colors.warning} size={18} />
          <Text selectable style={[styles.noteText, { color: palette.textSecondary }]}>{copy.spanishOnly}</Text>
        </View>
      ) : null}

      <View style={styles.documentMeta}>
        <View style={styles.metaRow}>
          <StatusPill label={interpolate(copy.updated, { date: updated })} tone={colors.brand} icon={CheckCircle2} />
          <StatusPill label={copy.official} tone={colors.success} icon={Lock} />
        </View>
        <View style={styles.actions}>
          <CompactAction label={copy.share} icon={Share2} onPress={shareDocument} />
          <CompactAction label={Platform.OS === 'web' ? copy.print : copy.save} icon={FileText} onPress={printOrShare} />
          <CompactAction label={copy.help} icon={HelpCircle} onPress={() => router.push('/legal/help')} />
        </View>
      </View>

      <View
        onLayout={(event) => { layoutOffsets.current.document = event.nativeEvent.layout.y; }}
        style={[styles.documentLayout, wide && styles.documentLayoutWide]}>
        <View style={[styles.contents, wide && styles.contentsWide, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.contentsHeader}>
            <View style={[styles.contentsIcon, { backgroundColor: `${colors.brand}12` }]}>
              <List color={palette.brandIcon} size={20} />
            </View>
            <View style={styles.contentsCopy}>
              <Text style={[styles.contentsTitle, { color: palette.text }]}>{copy.contentsTitle}</Text>
              <Text style={[styles.contentsDetail, { color: palette.textSecondary }]}>{copy.contentsDetail}</Text>
            </View>
          </View>
          <View accessibilityRole="list" style={styles.contentsList}>
            {sections.map((section, index) => (
              <ContentsLink key={section.title} index={index} label={section.title} onPress={() => scrollToSection(index)} />
            ))}
          </View>
        </View>

        <View
          onLayout={(event) => { layoutOffsets.current.content = event.nativeEvent.layout.y; }}
          style={styles.contentColumn}>
          <View
            onLayout={(event) => { layoutOffsets.current.sections = event.nativeEvent.layout.y; }}
            style={styles.sections}>
            {sections.map((section, index) => (
              <View
                accessibilityRole="summary"
                key={section.title}
                onLayout={(event) => { sectionOffsets.current[index] = event.nativeEvent.layout.y; }}
                style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.number, { backgroundColor: index === 0 ? `${colors.brand}14` : palette.subtle }]}>
                    {section.icon ?? (index === 0 ? <Info color={palette.brandIcon} size={20} /> : <FileText color={palette.textSecondary} size={20} />)}
                  </View>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={[styles.kicker, { color: palette.brandText }]}>{interpolate(copy.section, { number: String(index + 1).padStart(2, '0') })}</Text>
                    <Text selectable style={[styles.title, { color: palette.text }]}>{section.title}</Text>
                  </View>
                </View>
                {section.body ? <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{section.body}</Text> : null}
                {section.items?.length ? (
                  <View accessibilityRole="list" style={styles.bulletList}>
                    {section.items.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <View style={[styles.bullet, { backgroundColor: colors.brand }]} />
                        <Text selectable style={[styles.bulletText, { color: palette.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {section.note ? (
                  <View style={[styles.note, { backgroundColor: `${colors.brand}0A`, borderColor: `${colors.brand}20` }]}>
                    <Info color={palette.brandIcon} size={18} />
                    <Text selectable style={[styles.noteText, { color: palette.textSecondary }]}>{section.note}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <View style={[styles.contactCard, { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}24` }]}>
            <View style={styles.contactCopy}>
              <Text style={[styles.contactTitle, { color: palette.text }]}>{contactTitle ?? copy.defaultContactTitle}</Text>
              <Text style={[styles.contactText, { color: palette.textSecondary }]}>
                {contactDescription ?? copy.defaultContactBody}
              </Text>
            </View>
            <View style={styles.contactActions}>
              <PremiumButton label={contactLabel ?? copy.defaultContactLabel} icon={Mail} onPress={() => void Linking.openURL(`mailto:soporte@casaseg.com?subject=${encodeURIComponent(interpolate(copy.supportSubject, { title }))}`)} style={styles.contactButton} />
              <PremiumButton variant="secondary" label={copy.helpCenter} icon={ExternalLink} onPress={() => router.push('/legal/help')} style={styles.contactButton} />
            </View>
          </View>
        </View>
      </View>

      <Text selectable style={[styles.footer, { color: palette.textSecondary }]}>
        {interpolate(copy.footer, { title, date: updated })}
      </Text>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryCopy: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bold },
  summaryText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  documentMeta: { gap: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compactAction: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  compactActionLabel: { fontSize: 14, lineHeight: 18, fontFamily: fontFamily.extrabold },
  documentLayout: { gap: 16 },
  documentLayoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  contents: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 12, gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  contentsWide: { width: 280, flexShrink: 0 },
  contentsHeader: { padding: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  contentsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contentsCopy: { flex: 1, gap: 2 },
  contentsTitle: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  contentsDetail: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  contentsList: { gap: 1 },
  contentsLink: { minHeight: 44, borderRadius: radius.sm, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contentsNumber: { width: 23, fontSize: 11, lineHeight: 15, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  contentsLabel: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.bold },
  contentColumn: { flex: 1, minWidth: 0, gap: 20 },
  sections: { gap: 12 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 20, gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  number: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  kicker: { fontSize: 10, lineHeight: 14, fontFamily: fontFamily.bold, letterSpacing: 0.8 },
  title: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.2 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 28 },
  bulletList: { gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 10, flexShrink: 0 },
  bulletText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 15, lineHeight: 25 },
  note: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 14, lineHeight: 21 },
  contactCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 20, gap: 16 },
  contactCopy: { gap: 5 },
  contactTitle: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.bold },
  contactText: { fontFamily: fontFamily.regular, maxWidth: 640, fontSize: 14, lineHeight: 22 },
  contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contactButton: { flexGrow: 1, minWidth: 220 },
  footer: { fontFamily: fontFamily.regular, textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingVertical: 8 },
  focused: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});

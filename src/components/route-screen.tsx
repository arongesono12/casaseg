import { useRouter } from 'expo-router';
import { ArrowLeft } from '@/components/ui/icons';
import { PremiumHero } from '@/components/ui/premium';
import type { ReactNode, RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';

import { radius, touchTarget } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type RouteScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
  showBack?: boolean;
  /** false oculta la tarjeta de título cuando el contenido ya identifica la pantalla. */
  showHero?: boolean;
  headerContent?: ReactNode;
  maxWidth?: number;
  scrollRef?: RefObject<ScrollView | null>;
  /**
   * Cabecera propia a sangre (sustituye a la de título). Se dibuja de borde a
   * borde desde el borde superior y debe reservar ella misma el inset superior.
   */
  topContent?: ReactNode;
  /** Posición vertical del contenido dentro del scroll (debajo de la cabecera), para hacer scrollTo a secciones. */
  onContentOffset?: (y: number) => void;
};

export function RouteScreen({ title, description, children, showBack = true, showHero = true, headerContent, maxWidth = 720, scrollRef, topContent, onContentOffset }: RouteScreenProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const goBack = () => router.back();

  // La cabecera ocupa todo el ancho desde el borde superior: el degradado pasa
  // por detrás de la barra de estado y el botón de volver vive dentro de ella.
  const bleedTop = topContent ?? (showHero
    ? <PremiumHero title={title} description={description} compact={compact} accessory={headerContent} bleed={{ topInset: insets.top, contentMaxWidth: maxWidth, onBack: showBack ? goBack : undefined, backLabel: t('back') }} />
    : null);

  if (!bleedTop) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth, paddingTop: CONTENT_PADDING + insets.top, paddingBottom: CONTENT_PADDING + insets.bottom }, compact && styles.contentCompact]}>
          {showBack && <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={goBack} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}><ArrowLeft color={palette.text} size={22} /><Text style={[styles.backLabel, { color: palette.textSecondary }]}>{t('back')}</Text></Pressable>}
          {children}
        </ScrollView>
        <StatusBarScrim />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <HeroStatusBar pastHero={pastHero} />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.bleedContainer, { paddingBottom: CONTENT_PADDING + insets.bottom }]}
      >
        <View onLayout={onHeroLayout}>{bleedTop}</View>
        <View onLayout={onContentOffset ? (event) => onContentOffset(event.nativeEvent.layout.y) : undefined} style={[styles.content, { maxWidth, paddingTop: CONTENT_PADDING }, compact && styles.contentCompact]}>{children}</View>
      </ScrollView>
      {pastHero && <StatusBarScrim />}
    </SafeAreaView>
  );
}

const CONTENT_PADDING = 20;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bleedContainer: { flexGrow: 1 },
  content: { flexGrow: 1, width: '100%', alignSelf: 'center', paddingHorizontal: CONTENT_PADDING, gap: 24 },
  contentCompact: { paddingHorizontal: 16, gap: 18 },
  back: { alignSelf: 'flex-start', minHeight: touchTarget, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 6px 16px rgba(15,23,42,0.05)' },
  backLabel: { fontSize: 13, fontWeight: '800' },
});

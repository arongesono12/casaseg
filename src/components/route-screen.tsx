import { useRouter } from 'expo-router';
import { ArrowLeft } from '@/components/ui/icons';
import { CircleButton, LargeTitle } from '@/components/ui/premium';
import type { ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBarScrim } from '@/components/status-bar-scrim';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type RouteScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
  showBack?: boolean;
  /** false oculta el título cuando el contenido ya identifica la pantalla. */
  showHero?: boolean;
  headerContent?: ReactNode;
  maxWidth?: number;
  scrollRef?: RefObject<ScrollView | null>;
  /**
   * Cabecera propia a sangre (sustituye al título). Se dibuja de borde a borde
   * desde el borde superior y debe reservar ella misma el inset superior.
   */
  topContent?: ReactNode;
  /** Posición vertical del contenido dentro del scroll (debajo de la cabecera), para hacer scrollTo a secciones. */
  onContentOffset?: (y: number) => void;
};

/**
 * Pantalla con scroll del rediseño B: botón circular de volver y título grande
 * sobre el fondo del tema, sin banda de degradado. El contenido pasa por detrás
 * de la barra de estado y el velo la mantiene legible.
 */
export function RouteScreen({ title, description, children, showBack = true, showHero = true, headerContent, maxWidth = 720, scrollRef, topContent, onContentOffset }: RouteScreenProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const insets = useSafeAreaInsets();
  const back = showBack ? <CircleButton label={t('back')} onPress={() => router.back()}><ArrowLeft color={palette.text} size={21} /></CircleButton> : undefined;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: CONTENT_PADDING + insets.bottom }, !topContent && { paddingTop: insets.top + 12 }]}
      >
        {topContent}
        <View style={[styles.content, { maxWidth }, compact && styles.contentCompact]}>
          {showHero && !topContent
            ? <LargeTitle title={title} description={description} leading={back} accessory={headerContent} />
            : !topContent && back ? <View style={styles.backOnly}>{back}</View> : null}
          <View onLayout={onContentOffset ? (event) => onContentOffset(event.nativeEvent.layout.y) : undefined} style={styles.children}>{children}</View>
        </View>
      </ScrollView>
      <StatusBarScrim />
    </SafeAreaView>
  );
}

const CONTENT_PADDING = 24;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1 },
  content: { flexGrow: 1, width: '100%', alignSelf: 'center', paddingHorizontal: CONTENT_PADDING, paddingTop: 4, gap: 24 },
  contentCompact: { paddingHorizontal: 16, gap: 20 },
  children: { gap: 24 },
  backOnly: { alignItems: 'flex-start' },
});

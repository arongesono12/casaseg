import { useRouter } from 'expo-router';
import { ArrowLeft } from '@/components/ui/icons';
import { PremiumHero } from '@/components/ui/premium';
import type { ReactNode, RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, touchTarget } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

type RouteScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
  showBack?: boolean;
  headerContent?: ReactNode;
  maxWidth?: number;
  scrollRef?: RefObject<ScrollView | null>;
};

export function RouteScreen({ title, description, children, showBack = true, headerContent, maxWidth = 720, scrollRef }: RouteScreenProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView ref={scrollRef} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth }, compact && styles.contentCompact]}>
        {showBack && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}><ArrowLeft color={palette.text} size={22} /><Text style={[styles.backLabel, { color: palette.textSecondary }]}>Volver</Text></Pressable>}
        <PremiumHero title={title} description={description} compact={compact} accessory={headerContent} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, width: '100%', alignSelf: 'center', padding: 20, gap: 24 },
  contentCompact: { paddingHorizontal: 16, gap: 18 },
  back: { alignSelf: 'flex-start', minHeight: touchTarget, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 6px 16px rgba(15,23,42,0.05)' },
  backLabel: { fontSize: 13, fontWeight: '800' },
});

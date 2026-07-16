import { useRouter } from 'expo-router';
import { ArrowLeft } from '@/components/ui/icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

type RouteScreenProps = { title: string; description: string; children?: ReactNode; showBack?: boolean; headerContent?: ReactNode };

export function RouteScreen({ title, description, children, showBack = true, headerContent }: RouteScreenProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        {showBack && <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface }]}><ArrowLeft color={palette.text} size={22} /></Pressable>}
        <View style={styles.heading}>
          {headerContent}
          <Text style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.description, { color: palette.textSecondary }]}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, gap: 24 },
  contentCompact: { paddingHorizontal: 16, gap: 18 },
  back: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900' },
  titleCompact: { fontSize: 24, lineHeight: 30 },
  description: { fontSize: 16, lineHeight: 24 },
});

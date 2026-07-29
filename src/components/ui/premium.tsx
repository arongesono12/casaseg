import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ArrowRight, RefreshCw, ShieldCheck, type IconProps } from '@/components/ui/icons';
import { actionGradient, colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

export type IconComponent = (props: IconProps) => ReactNode;

type HeroProps = {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: IconComponent;
  accessory?: ReactNode;
  compact?: boolean;
};

export function PremiumHero({ title, description, eyebrow = 'CASASEG', icon: Icon = ShieldCheck, accessory, compact = false }: HeroProps) {
  return (
    <LinearGradient colors={['#0B2F3A', '#0F4C5C', '#0F766E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, compact && styles.heroCompact]}>
      <View pointerEvents="none" style={styles.heroOrbLarge} />
      <View pointerEvents="none" style={styles.heroOrbSmall} />
      <View style={styles.heroTopRow}>
        <View style={styles.eyebrowPill}>
          <Icon color="#CCFBF1" size={15} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        {accessory}
      </View>
      <View style={styles.heroCopy}>
        <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{title}</Text>
        <Text style={styles.heroDescription}>{description}</Text>
      </View>
    </LinearGradient>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconComponent;
  trailingIcon?: IconComponent;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PremiumButton({ label, onPress, icon: Icon, trailingIcon: TrailingIcon, loading = false, disabled = false, variant = 'primary', style }: ButtonProps) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const content = (
    <>
      {loading ? <ActivityIndicator color={variant === 'secondary' ? palette.text : 'white'} /> : Icon ? <Icon color={variant === 'secondary' ? palette.text : 'white'} size={20} /> : null}
      <Text style={[styles.buttonLabel, variant === 'secondary' && { color: palette.text }, variant === 'danger' && styles.dangerLabel]}>{label}</Text>
      {TrailingIcon ? <TrailingIcon color={variant === 'secondary' ? palette.textSecondary : 'white'} size={19} /> : null}
    </>
  );

  const press = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };

  if (variant === 'primary') {
    return (
      <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={press} style={({ pressed }) => [styles.buttonShell, style, focused && styles.buttonFocused, (pressed || inactive) && styles.buttonPressed]}>
        <LinearGradient colors={actionGradient} style={styles.buttonGradient}>{content}</LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={press} style={({ pressed }) => [styles.buttonShell, styles.secondaryButton, { backgroundColor: variant === 'danger' ? `${colors.error}12` : palette.surface, borderColor: variant === 'danger' ? `${colors.error}35` : palette.border }, style, focused && styles.buttonFocused, (pressed || inactive) && styles.buttonPressed]}>
      {content}
    </Pressable>
  );
}

type EmptyStateProps = {
  icon: IconComponent;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
};

export function PremiumEmptyState({ icon: Icon, title, description, actionLabel, onAction, loading = false }: EmptyStateProps) {
  const { palette } = useAppTheme();
  return (
    <View accessibilityLiveRegion={loading ? 'polite' : 'none'} style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <LinearGradient accessibilityLabel={loading ? title : undefined} accessibilityRole={loading ? 'progressbar' : undefined} colors={['rgba(15,118,110,0.16)', 'rgba(3,105,161,0.05)']} style={styles.emptyIcon}>
        {loading ? <ActivityIndicator color={colors.brand} /> : <Icon color={colors.brand} size={32} />}
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: palette.textSecondary }]}>{description}</Text>
      {actionLabel && onAction ? <PremiumButton label={actionLabel} onPress={onAction} trailingIcon={ArrowRight} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function PremiumErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return <PremiumEmptyState icon={RefreshCw} title={title} description={description} actionLabel="Reintentar" onAction={onRetry} />;
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
        {detail ? <Text style={[styles.sectionDetail, { color: palette.textSecondary }]}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function MetricCard({ label, value, icon: Icon, tone = colors.brand }: { label: string; value: string | number; icon: IconComponent; tone?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.metric, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}14` }]}><Icon color={tone} size={21} /></View>
      <Text selectable style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function StatusPill({ label, tone = colors.brand, icon: Icon }: { label: string; tone?: string; icon?: IconComponent }) {
  return (
    <View style={[styles.status, { backgroundColor: `${tone}14`, borderColor: `${tone}2B` }]}>
      {Icon ? <Icon color={tone} size={14} /> : <View style={[styles.statusDot, { backgroundColor: tone }]} />}
      <Text style={[styles.statusLabel, { color: tone }]}>{label}</Text>
    </View>
  );
}

export function IconTile({ icon: Icon, tone = colors.brand, size = 44 }: { icon: IconComponent; tone?: string; size?: number }) {
  return <View style={[styles.iconTile, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${tone}14` }]}><Icon color={tone} size={Math.round(size * 0.48)} /></View>;
}

export function SurfaceCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useAppTheme();
  return <View style={[styles.surface, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 198, borderRadius: radius.hero, borderCurve: 'continuous', padding: 22, justifyContent: 'space-between', overflow: 'hidden', boxShadow: '0 16px 34px rgba(15,76,92,0.20)' },
  heroCompact: { minHeight: 164, padding: 19 },
  heroOrbLarge: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -65, top: -80, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroOrbSmall: { position: 'absolute', width: 80, height: 80, borderRadius: 40, right: 72, bottom: -35, backgroundColor: 'rgba(45,212,191,0.16)' },
  heroTopRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrowPill: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  eyebrow: { color: '#CCFBF1', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  heroCopy: { maxWidth: 540, gap: 8 },
  heroTitle: { color: 'white', fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  heroTitleCompact: { fontSize: 25, lineHeight: 30 },
  heroDescription: { color: '#CCFBF1', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  buttonShell: { minHeight: 54, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 8px 18px rgba(37,99,235,0.18)' },
  buttonGradient: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButton: { minHeight: 54, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: 'none' },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  buttonFocused: { boxShadow: '0 0 0 3px rgba(20,184,166,0.38)' },
  buttonLabel: { color: 'white', fontSize: 15, fontWeight: '900' },
  dangerLabel: { color: colors.error },
  emptyCard: { minHeight: 300, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.06)' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center' },
  emptyDescription: { maxWidth: 380, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyAction: { width: '100%', maxWidth: 280, marginTop: 10 },
  sectionHeading: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '900', letterSpacing: -0.3 },
  sectionDetail: { fontSize: 13, lineHeight: 18 },
  metric: { flex: 1, minWidth: 104, minHeight: 128, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, justifyContent: 'space-between', boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  metricIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  status: { alignSelf: 'flex-start', minHeight: 28, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.25 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  surface: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' },
});

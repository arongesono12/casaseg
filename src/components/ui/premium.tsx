import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck, type IconProps } from '@/components/ui/icons';
import { actionGradient, brand, colors, heroGradient, radius, touchTarget, withAlpha } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { onBrandRipple, pressRipple, usesRipple } from '@/lib/press-feedback';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export type IconComponent = (props: IconProps) => ReactNode;

type HeroBleed = {
  /** Inset de la barra de estado: el degradado se extiende por detrás de ella. */
  topInset: number;
  /** Ancho máximo del texto, alineado con el contenido de la pantalla. */
  contentMaxWidth?: number;
  onBack?: () => void;
  backLabel?: string;
};

type HeroProps = {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: IconComponent;
  accessory?: ReactNode;
  compact?: boolean;
  /** A sangre: ocupa todo el ancho desde el borde superior y solo se redondea abajo. */
  bleed?: HeroBleed;
};

export function PremiumHero({ title, description, eyebrow = 'CASASEG', icon: Icon = ShieldCheck, accessory, compact = false, bleed }: HeroProps) {
  const content = (
    <>
      <View style={styles.heroTopRow}>
        <View style={styles.heroLead}>
          {bleed?.onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel={bleed.backLabel} hitSlop={8} android_ripple={onBrandRipple} onPress={bleed.onBack} style={styles.heroBack}>
              <ArrowLeft color="white" size={21} />
            </Pressable>
          ) : null}
          <View style={styles.eyebrowPill}>
            <Icon color={colors.onBrandMuted} size={15} />
            <Text numberOfLines={1} style={styles.eyebrow}>{eyebrow}</Text>
          </View>
        </View>
        {accessory}
      </View>
      <View style={styles.heroCopy}>
        <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{title}</Text>
        <Text style={styles.heroDescription}>{description}</Text>
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, compact && styles.heroCompact, bleed && [styles.heroBleed, { paddingTop: bleed.topInset + HERO_BLEED_GAP }]]}
    >
      <View pointerEvents="none" style={styles.heroOrbLarge} />
      <View pointerEvents="none" style={styles.heroOrbSmall} />
      {bleed ? <View style={[styles.heroBleedContent, { maxWidth: bleed.contentMaxWidth }]}>{content}</View> : content}
    </LinearGradient>
  );
}

const HERO_BLEED_GAP = 14;

/**
 * Contador o estado dentro de la cabecera (accessory de PremiumHero). Sustituye
 * al SectionTitle que repetía el título de la pantalla solo para mostrar un total.
 */
export function HeroBadge({ label, icon: Icon }: { label: string; icon?: IconComponent }) {
  return (
    <View style={styles.eyebrowPill}>
      {Icon ? <Icon color="white" size={14} /> : null}
      <Text style={styles.heroBadgeText}>{label}</Text>
    </View>
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
      <Text style={[styles.buttonLabel, variant === 'secondary' && { color: palette.text }, variant === 'danger' && { color: palette.errorText }]}>{label}</Text>
      {TrailingIcon ? <TrailingIcon color={variant === 'secondary' ? palette.textSecondary : 'white'} size={19} /> : null}
    </>
  );

  const press = () => {
    haptics.tap();
    onPress();
  };

  if (variant === 'primary') {
    return (
      <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onBlur={() => setFocused(false)} android_ripple={onBrandRipple} onFocus={() => setFocused(true)} onPress={press} style={({ pressed }) => [styles.buttonShell, style, focused && styles.buttonFocused, (inactive || (pressed && !usesRipple)) && styles.buttonPressed]}>
        <LinearGradient colors={actionGradient} style={styles.buttonGradient}>{content}</LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onBlur={() => setFocused(false)} android_ripple={pressRipple} onFocus={() => setFocused(true)} onPress={press} style={({ pressed }) => [styles.buttonShell, styles.secondaryButton, { backgroundColor: variant === 'danger' ? `${colors.error}12` : palette.surface, borderColor: variant === 'danger' ? `${colors.error}35` : palette.border }, style, focused && styles.buttonFocused, (inactive || (pressed && !usesRipple)) && styles.buttonPressed]}>
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
      <LinearGradient accessibilityLabel={loading ? title : undefined} accessibilityRole={loading ? 'progressbar' : undefined} colors={[withAlpha(colors.brand, 0.16), withAlpha(brand.logo.sky, 0.06)]} style={styles.emptyIcon}>
        {loading ? <ActivityIndicator color={palette.brandIcon} /> : <Icon color={palette.brandIcon} size={32} />}
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: palette.textSecondary }]}>{description}</Text>
      {actionLabel && onAction ? <PremiumButton label={actionLabel} onPress={onAction} trailingIcon={ArrowRight} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function PremiumErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  const { t } = useI18n();
  return <PremiumEmptyState icon={RefreshCw} title={title} description={description} actionLabel={t('retry')} onAction={onRetry} />;
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
  hero: { minHeight: 198, borderRadius: radius.hero, borderCurve: 'continuous', padding: 22, justifyContent: 'space-between', overflow: 'hidden', boxShadow: `0 16px 34px ${withAlpha(brand.blue[900], 0.22)}` },
  heroCompact: { minHeight: 164, padding: 19 },
  heroBleed: { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingBottom: 26 },
  heroBleedContent: { width: '100%', alignSelf: 'center', flexGrow: 1, justifyContent: 'space-between', gap: 22 },
  heroLead: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBack: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  heroOrbLarge: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -65, top: -80, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroOrbSmall: { position: 'absolute', width: 80, height: 80, borderRadius: 40, right: 72, bottom: -35, backgroundColor: withAlpha(brand.logo.sky, 0.18) },
  heroTopRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrowPill: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  eyebrow: { color: colors.onBrandMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  heroBadgeText: { color: 'white', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroCopy: { maxWidth: 540, gap: 8 },
  heroTitle: { color: 'white', fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8 },
  heroTitleCompact: { fontSize: 25, lineHeight: 30 },
  heroDescription: { color: colors.onBrandMuted, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  buttonShell: { minHeight: 54, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `0 8px 18px ${withAlpha(colors.brand, 0.18)}` },
  buttonGradient: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButton: { minHeight: 54, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: 'none' },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  buttonFocused: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  buttonLabel: { color: 'white', fontSize: 15, fontWeight: '700' },
  emptyCard: { minHeight: 300, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.06)' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { maxWidth: 380, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyAction: { width: '100%', maxWidth: 280, marginTop: 10 },
  sectionHeading: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  sectionDetail: { fontSize: 13, lineHeight: 18 },
  metric: { flex: 1, minWidth: 104, minHeight: 128, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, justifyContent: 'space-between', boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  metricIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  status: { alignSelf: 'flex-start', minHeight: 28, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.25 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  surface: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' },
});

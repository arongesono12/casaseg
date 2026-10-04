import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { ArrowLeft, ArrowRight, Clock, RefreshCw, type IconProps } from '@/components/ui/icons';
import { actionGradient, brand, colors, fontFamily, radius, typography, withAlpha } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { iconRipple, onBrandRipple, pressRipple, usesRipple } from '@/lib/press-feedback';
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

/**
 * Cabecera de pantalla. En el rediseño B ya no es una banda con degradado: es
 * el título grande sobre el fondo del tema, con el botón circular de volver.
 * Se mantiene la API (eyebrow, icon, bleed…) para no tocar cada pantalla.
 */
export function PremiumHero({ title, description, accessory, compact = false, bleed }: HeroProps) {
  const { palette } = useAppTheme();
  const back = bleed?.onBack
    ? <CircleButton label={bleed.backLabel ?? ''} onPress={bleed.onBack}><ArrowLeft color={palette.text} size={21} /></CircleButton>
    : undefined;
  const content = (
    <View style={styles.largeTitle}>
      {back || accessory ? <View style={styles.largeTitleTop}>{back ?? <View />}{accessory}</View> : null}
      <Text accessibilityRole="header" style={[typography.display, compact && styles.heroTitleCompact, { color: palette.text }]}>{title}</Text>
      {description ? <Text style={[typography.body, { color: palette.textSecondary }]}>{description}</Text> : null}
    </View>
  );

  if (!bleed) return content;
  return (
    <View style={[styles.heroBleed, { paddingTop: bleed.topInset + 12 }]}>
      <View style={[styles.heroBleedContent, { maxWidth: bleed.contentMaxWidth }]}>{content}</View>
    </View>
  );
}

/** Contador o estado junto al título (accessory de PremiumHero). */
export function HeroBadge({ label, icon: Icon }: { label: string; icon?: IconComponent }) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.heroBadge, { backgroundColor: palette.brandSoft }]}>
      {Icon ? <Icon color={palette.brandIcon} size={14} /> : null}
      <Text style={[styles.heroBadgeText, { color: palette.brandText }]}>{label}</Text>
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

/** Cabecera de pantalla del rediseño B: título grande sobre el fondo, sin banda de degradado. */
export function LargeTitle({ title, description, accessory, leading }: { title: string; description?: string; accessory?: ReactNode; leading?: ReactNode }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.largeTitle}>
      {leading || accessory ? <View style={styles.largeTitleTop}>{leading ?? <View />}{accessory}</View> : null}
      <Text accessibilityRole="header" style={[typography.display, { color: palette.text }]}>{title}</Text>
      {description ? <Text style={[typography.body, { color: palette.textSecondary }]}>{description}</Text> : null}
    </View>
  );
}

/** Botón circular flotante (volver, guardar, compartir) sobre fotos o cabeceras. */
export function CircleButton({ label, onPress, children, disabled }: { label: string; onPress: () => void; children: ReactNode; disabled?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} android_ripple={iconRipple(40)} disabled={disabled} hitSlop={4} onPress={onPress} style={({ pressed }) => [styles.circle, { backgroundColor: palette.surface }, (disabled || (pressed && !usesRipple)) && styles.buttonPressed]}>
      {children}
    </Pressable>
  );
}

/** Píldora de estado legal que va sobre la foto de una propiedad. */
export function LegalPill({ status, labels }: { status: 'verified' | 'pending' | 'restricted'; labels: { verified: string; pending: string; restricted: string } }) {
  const verified = status === 'verified';
  return (
    <View style={[styles.legalPill, !verified && styles.legalPillMuted]}>
      {verified ? <CasasegLogo width={17} /> : <Clock color={status === 'restricted' ? colors.error : colors.textSecondary} size={14} />}
      <Text style={[styles.legalPillText, !verified && { color: colors.textSecondary }]}>{labels[status]}</Text>
    </View>
  );
}

export function SurfaceCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useAppTheme();
  return <View style={[styles.surface, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  heroBleed: { width: '100%', paddingHorizontal: 24 },
  heroBleedContent: { width: '100%', alignSelf: 'center' },
  heroTitleCompact: { fontSize: 26, lineHeight: 32 },
  heroBadge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBadgeText: { fontSize: 12, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  buttonShell: { minHeight: 52, borderRadius: radius.sm, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `0 8px 18px ${withAlpha(colors.brand, 0.18)}` },
  buttonGradient: { minHeight: 52, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButton: { minHeight: 52, borderWidth: 1, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: 'none' },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  buttonFocused: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  buttonLabel: { color: 'white', fontSize: 16, fontFamily: fontFamily.bold },
  emptyCard: { minHeight: 300, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.06)' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.bold, textAlign: 'center' },
  emptyDescription: { fontFamily: fontFamily.regular, maxWidth: 380, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyAction: { width: '100%', maxWidth: 280, marginTop: 10 },
  sectionHeading: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.3 },
  sectionDetail: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  metric: { flex: 1, minWidth: 104, minHeight: 128, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, justifyContent: 'space-between', boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  metricIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 24, lineHeight: 28, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.bold },
  status: { alignSelf: 'flex-start', minHeight: 28, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.25 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  largeTitle: { gap: 6, paddingTop: 4 },
  largeTitleTop: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(15,23,42,0.16)' },
  legalPill: { height: 30, borderRadius: radius.pill, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, boxShadow: '0 2px 6px rgba(15,23,42,0.14)' },
  legalPillMuted: { backgroundColor: 'rgba(255,255,255,0.92)' },
  legalPillText: { color: colors.text, fontSize: 13, fontFamily: fontFamily.bold },
  surface: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' },
});

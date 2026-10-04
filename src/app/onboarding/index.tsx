import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/user-avatar';
import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { ArrowRight, Home, Layers3, Star, UsersRound } from '@/components/ui/icons';
import { LegalPill, PremiumButton } from '@/components/ui/premium';
import { colors, fontFamily, radius, spacing, typography, withAlpha } from '@/constants/theme';
import {
  fetchOnboardingCommunity,
  fetchOnboardingProperty,
  onboardingKeys,
  type OnboardingCommunity,
} from '@/features/onboarding/onboarding.queries';
import { appStorage } from '@/lib/local-storage';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';
import { formatXaf } from '@/utils/formatters';

const getStartedArtwork = require('../../../assets/images/onboarding/onboarding-get-started.png');
/** Alto / ancho de la ilustración de "Empezar" (768 × 674). */
const ARTWORK_RATIO = 674 / 768;

/**
 * Estructura y reglas de datos del diseño de Stitch (stitch/casaseg-splash-screen):
 * splash → descubrir → comunidad → empezar, con vivienda y cifras reales de
 * Supabase. Lenguaje visual del rediseño B (design-demos/direction-approved.md):
 * fondo liso del tema, título grande, foto protagonista y botón con degradado de
 * acción. El onboarding ya no tiene paleta propia: usa la del ThemeProvider, así
 * que su modo oscuro coincide con el del resto de la app.
 */

const slides = [
  { id: 'discover' },
  { id: 'community' },
  { id: 'get-started' },
] as const;

type Slide = (typeof slides)[number];

type MotionBlockProps = PropsWithChildren<{
  active: boolean;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}>;

type CommonSlideProps = {
  active: boolean;
  bottomInset: number;
  height: number;
  onNext: () => void;
  topInset: number;
  width: number;
};

function useAccent() {
  // Texto grande en azul de marca, legible en claro y en oscuro (palette.brandText).
  return useAppTheme().palette.brandText;
}

function MotionBlock({ active, children, delay = 0, distance = 18, style }: MotionBlockProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    cancelAnimation(progress);
    if (!active) {
      progress.value = 0;
      return;
    }
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withSpring(1, { damping: 20, stiffness: 145, mass: 0.78 }),
    );
  }, [active, delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [distance, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.975, 1]) },
    ],
  }), [distance]);

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function Brand({ centered = false, large = false }: { centered?: boolean; large?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.brand, centered && styles.brandCentered]}>
      <CasasegLogo width={large ? 56 : 26} height={large ? 46 : 21} />
      <Text style={[large ? styles.brandNameLarge : styles.brandName, { color: palette.text }]}>CasaSeg</Text>
    </View>
  );
}

function SplashSpinner() {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    rotation.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return <Animated.View style={[styles.splashSpinner, animatedStyle]} />;
}

function SplashScreenView() {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();

  return (
    <View style={[styles.splash, { backgroundColor: palette.background }]}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <MotionBlock active delay={80} distance={10} style={styles.splashCenter}>
        <Brand large />
        <SplashSpinner />
      </MotionBlock>
      <View accessibilityLabel={t('onboardingLoadingLabel')} style={styles.splashDots}>
        <View style={[styles.splashDot, styles.splashDotActive]} />
        <View style={[styles.splashDot, { backgroundColor: palette.border }]} />
        <View style={[styles.splashDot, { backgroundColor: palette.border }]} />
      </View>
    </View>
  );
}

function PageDot({ active }: { active: boolean }) {
  const { palette } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? Number(active)
      : withSpring(Number(active), { damping: 19, stiffness: 185 });
  }, [active, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.68, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.84, 1.18]) }],
  }));

  return <Animated.View style={[styles.pageDot, { backgroundColor: active ? palette.brandIcon : palette.border }, animatedStyle]} />;
}

function Pagination({ current }: { current: number }) {
  const { t } = useI18n();

  return (
    <View
      accessibilityLabel={t('onboardingPageStatus', { current: String(current + 1), total: String(slides.length) })}
      style={styles.pagination}
    >
      {slides.map((slide, index) => <PageDot active={index === current} key={slide.id} />)}
    </View>
  );
}

function TextAction({ label, onPress, strong }: { label: string; onPress: () => void; strong?: string }) {
  const { palette } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
      <Text style={[styles.textActionLabel, { color: palette.text }]}>
        {strong ? `${label} ` : label}
        {strong ? <Text style={styles.textActionStrong}>{strong}</Text> : null}
      </Text>
    </Pressable>
  );
}

function finishOnboarding() {
  appStorage.setItem('casaseg.onboarding.seen', 'true');
  router.replace('/(tabs)/explore');
}

function AnimatedPropertyImage({ active, property }: { active: boolean; property: Property }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(scale);
    scale.value = 1;
    if (!active || reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [active, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.fill, animatedStyle]}>
      <Image
        accessibilityLabel={t('onboardingPropertyAccessibility', { location: property.location, title: property.title })}
        cachePolicy="disk"
        contentFit="cover"
        source={{ uri: property.imageUrls[0] }}
        style={styles.fill}
        transition={250}
      />
    </Animated.View>
  );
}

/** La vivienda real de Supabase, presentada igual que una tarjeta de Explorar. */
function PropertyVisual({ active, error, loading, onRetry, property }: { active: boolean; error: boolean; loading: boolean; onRetry: () => void; property: Property | null }) {
  const { t } = useI18n();
  const { palette } = useAppTheme();

  if (loading) {
    return (
      <View style={[styles.propertyFrame, styles.propertyState, { backgroundColor: palette.subtle }]}>
        <ActivityIndicator color={palette.brandIcon} size="large" />
        <Text style={[styles.stateText, { color: palette.textSecondary }]}>{t('onboardingPropertyLoading')}</Text>
      </View>
    );
  }

  if (error || !property?.imageUrls[0]) {
    return (
      <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.propertyFrame, styles.propertyState, { backgroundColor: palette.subtle }, pressed && styles.pressed]}>
        <Home color={palette.brandIcon} size={40} />
        <Text style={[styles.stateTitle, { color: palette.text }]}>{t('onboardingPropertyLoadError')}</Text>
        <Text style={[styles.stateText, styles.underline, { color: palette.text }]}>{t('onboardingTapToRetry')}</Text>
      </Pressable>
    );
  }

  const amount = formatXaf(property.price);
  const unit = formatXaf(property.price, property.priceType).slice(amount.length);

  return (
    <View style={styles.propertyCard}>
      <View style={[styles.propertyFrame, { backgroundColor: palette.subtle }]}>
        <AnimatedPropertyImage active={active} property={property} />
        <View pointerEvents="none" style={styles.propertyPill}>
          <LegalPill status={property.legalStatus} labels={{ verified: t('legalVerified'), pending: t('legalPending'), restricted: t('legalRestricted') }} />
        </View>
      </View>
      <View style={styles.propertySummary}>
        <View style={styles.propertyTitleRow}>
          <Text numberOfLines={1} style={[styles.propertyTitle, { color: palette.text }]}>{property.title}</Text>
          {property.rating ? (
            <View style={styles.rating}>
              <Star color={palette.text} fill={palette.text} size={13} />
              <Text style={[styles.propertyMeta, { color: palette.text }]}>{property.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.propertyMeta, { color: palette.textSecondary }]}>{property.location}</Text>
        <Text numberOfLines={1} style={[styles.propertyMeta, { color: palette.text }]}>
          <Text style={styles.propertyPrice}>{amount}</Text>{unit}
        </Text>
      </View>
    </View>
  );
}

function DiscoverSlide({
  active,
  bottomInset,
  height,
  onNext,
  onRetry,
  property,
  propertyError,
  propertyLoading,
  topInset,
  width,
}: CommonSlideProps & { onRetry: () => void; property: Property | null; propertyError: boolean; propertyLoading: boolean }) {
  const { t } = useI18n();
  const { palette } = useAppTheme();
  const accent = useAccent();

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.page, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg), paddingTop: topInset + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand />
      </MotionBlock>

      <MotionBlock active={active} delay={90} distance={18} style={styles.titleBlock}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          {t('onboardingDiscoverTitlePrimary')}{'\n'}
          <Text style={{ color: accent }}>{t('onboardingDiscoverTitleAccent')}</Text>
        </Text>
      </MotionBlock>

      <MotionBlock active={active} delay={170} distance={28} style={styles.discoverVisual}>
        <PropertyVisual active={active} error={propertyError} loading={propertyLoading} onRetry={onRetry} property={property} />
      </MotionBlock>

      <MotionBlock active={active} delay={260} distance={18}>
        <Text style={[styles.body, { color: palette.textSecondary }]}>{t('onboardingDiscoverBody')}</Text>
      </MotionBlock>

      <MotionBlock active={active} delay={340} distance={16} style={styles.actions}>
        <Pagination current={0} />
        <PremiumButton label={t('onboardingNext')} onPress={onNext} style={styles.cta} />
        <TextAction label={t('onboardingSkip')} onPress={finishOnboarding} />
      </MotionBlock>
    </ScrollView>
  );
}

function CommunityContent({ active, community, error, loading, onRetry }: { active: boolean; community?: OnboardingCommunity; error: boolean; loading: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const { palette } = useAppTheme();

  if (loading) {
    return (
      <View style={styles.communityState}>
        <ActivityIndicator color={palette.brandIcon} size="large" />
        <Text style={[styles.stateText, { color: palette.textSecondary }]}>{t('onboardingCommunityLoading')}</Text>
      </View>
    );
  }

  if (error || !community) {
    return (
      <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.communityState, pressed && styles.pressed]}>
        <UsersRound color={palette.brandIcon} size={40} />
        <Text style={[styles.stateTitle, { color: palette.text }]}>{t('onboardingCommunityLoadError')}</Text>
        <Text style={[styles.stateText, styles.underline, { color: palette.text }]}>{t('onboardingTapToRetry')}</Text>
      </Pressable>
    );
  }

  const stats = [
    { Icon: Home, value: community.propertyCount, label: t('onboardingActiveProperties') },
    { Icon: Layers3, value: community.ownerCount, label: t('onboardingPublishingOwners') },
    { Icon: UsersRound, value: community.memberCount, label: t('onboardingVerifiedMembers') },
  ];

  return (
    <>
      {/* Mismo bloque de confianza que el detalle de una propiedad: tres celdas con filetes. */}
      <View style={[styles.stats, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        {stats.map(({ Icon, label, value }, index) => (
          <MotionBlock
            active={active}
            delay={210 + index * 90}
            distance={18}
            key={label}
            style={[styles.stat, index > 0 && { borderLeftColor: palette.border, borderLeftWidth: StyleSheet.hairlineWidth }]}
          >
            <Icon color={palette.text} size={22} />
            <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
          </MotionBlock>
        ))}
      </View>

      {community.members.length ? (
        <MotionBlock active={active} delay={520} distance={16} style={styles.members}>
          <View style={styles.avatarRow}>
            {community.members.map((member, index) => (
              <MotionBlock
                active={active}
                delay={580 + index * 80}
                distance={12}
                key={member.id}
                style={[styles.avatarBorder, { backgroundColor: palette.subtle, borderColor: palette.background, marginLeft: index === 0 ? 0 : -10, zIndex: community.members.length - index }]}
              >
                <UserAvatar name={member.name} size={44} uri={member.avatar} />
              </MotionBlock>
            ))}
          </View>
          <Text style={[styles.activeUsers, { color: palette.text }]}>{t('onboardingActiveUsers', { count: String(community.memberCount) })}</Text>
        </MotionBlock>
      ) : null}
    </>
  );
}

function CommunitySlide({
  active,
  bottomInset,
  community,
  communityError,
  communityLoading,
  height,
  onNext,
  onRetry,
  topInset,
  width,
}: CommonSlideProps & { community?: OnboardingCommunity; communityError: boolean; communityLoading: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const { palette } = useAppTheme();

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.page, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg), paddingTop: topInset + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand />
      </MotionBlock>
      <MotionBlock active={active} delay={90} distance={18} style={styles.titleBlock}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('onboardingCommunityTitle')}</Text>
        <Text style={[styles.body, styles.subtitle, { color: palette.textSecondary }]}>{t('onboardingCommunitySubtitle')}</Text>
      </MotionBlock>

      <View style={styles.communityData}>
        <CommunityContent active={active} community={community} error={communityError} loading={communityLoading} onRetry={onRetry} />
      </View>

      <MotionBlock active={active} delay={690} distance={12} style={styles.actions}>
        <Pagination current={1} />
        <PremiumButton label={t('onboardingNext')} onPress={onNext} style={styles.cta} />
        <TextAction label={t('onboardingSkip')} onPress={finishOnboarding} />
      </MotionBlock>
    </ScrollView>
  );
}

function GetStartedSlide({ active, bottomInset, height, topInset, width }: Omit<CommonSlideProps, 'onNext'>) {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  // La ilustración ya no lleva texto ni logo horneados: se muestra entera.
  const artworkHeight = Math.min(width * ARTWORK_RATIO, height * 0.5);
  // La ilustración trae un rosa horneado en la franja inferior; el velo la funde
  // con el fondo del tema. En oscuro además baja su luz al nivel del resto.
  const overlay = resolvedMode === 'dark'
    ? (['rgba(10,10,10,0.30)', 'rgba(10,10,10,0.62)', palette.background] as const)
    : (['transparent', 'transparent', palette.background] as const);

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.getStartedPage, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg) }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={30} distance={-10}>
        <View style={[styles.artworkCrop, { height: artworkHeight + topInset, width, paddingTop: topInset }]}>
          <Image
            accessibilityLabel={t('onboardingIllustrationAccessibility')}
            contentFit="contain"
            source={getStartedArtwork}
            style={{ height: artworkHeight, width }}
          />
          <LinearGradient colors={overlay} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
        </View>
      </MotionBlock>

      <View style={styles.getStartedCopy}>
        <MotionBlock active={active} delay={150} distance={20}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('onboardingGetStartedTitle')}</Text>
        </MotionBlock>
        <MotionBlock active={active} delay={230} distance={18}>
          <Text style={[styles.body, styles.subtitleLeft, { color: palette.textSecondary }]}>{t('onboardingGetStartedBody')}</Text>
        </MotionBlock>
        <MotionBlock active={active} delay={310} distance={18} style={styles.actions}>
          <Pagination current={2} />
          <PremiumButton label={t('onboardingGetStartedCta')} onPress={finishOnboarding} trailingIcon={ArrowRight} style={styles.cta} />
          <TextAction label={t('onboardingHaveAccount')} strong={t('signIn')} onPress={() => router.push('/(auth)/login')} />
        </MotionBlock>
      </View>
    </ScrollView>
  );
}

type SlideViewProps = CommonSlideProps & {
  community?: OnboardingCommunity;
  communityError: boolean;
  communityLoading: boolean;
  item: Slide;
  onRetryCommunity: () => void;
  onRetryProperty: () => void;
  property: Property | null;
  propertyError: boolean;
  propertyLoading: boolean;
};

function SlideView(props: SlideViewProps) {
  if (props.item.id === 'discover') {
    return (
      <DiscoverSlide
        active={props.active}
        bottomInset={props.bottomInset}
        height={props.height}
        onNext={props.onNext}
        onRetry={props.onRetryProperty}
        property={props.property}
        propertyError={props.propertyError}
        propertyLoading={props.propertyLoading}
        topInset={props.topInset}
        width={props.width}
      />
    );
  }

  if (props.item.id === 'community') {
    return (
      <CommunitySlide
        active={props.active}
        bottomInset={props.bottomInset}
        community={props.community}
        communityError={props.communityError}
        communityLoading={props.communityLoading}
        height={props.height}
        onNext={props.onNext}
        onRetry={props.onRetryCommunity}
        topInset={props.topInset}
        width={props.width}
      />
    );
  }

  return <GetStartedSlide active={props.active} bottomInset={props.bottomInset} height={props.height} topInset={props.topInset} width={props.width} />;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { palette, resolvedMode } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { height, width } = useWindowDimensions();
  const pageWidth = Math.min(width, 520);
  const [current, setCurrent] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const list = useRef<FlatList<Slide>>(null);

  const propertyQuery = useQuery({
    queryKey: onboardingKeys.property,
    queryFn: ({ signal }) => fetchOnboardingProperty(signal),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
  const communityQuery = useQuery({
    queryKey: onboardingKeys.community,
    queryFn: ({ signal }) => fetchOnboardingCommunity(signal),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setShowSplash(false), reduceMotion ? 450 : 1350);
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  const retryProperty = useCallback(() => {
    void propertyQuery.refetch();
  }, [propertyQuery]);
  const retryCommunity = useCallback(() => {
    void communityQuery.refetch();
  }, [communityQuery]);

  const next = useCallback(() => {
    const nextIndex = Math.min(current + 1, slides.length - 1);
    setCurrent(nextIndex);
    list.current?.scrollToIndex({ animated: true, index: nextIndex });
  }, [current]);

  const renderSlide = useCallback<ListRenderItem<Slide>>(({ item, index }) => (
    <SlideView
      active={current === index}
      bottomInset={insets.bottom}
      community={communityQuery.data}
      communityError={communityQuery.isError}
      communityLoading={communityQuery.isLoading}
      height={height}
      item={item}
      onNext={next}
      onRetryCommunity={retryCommunity}
      onRetryProperty={retryProperty}
      property={propertyQuery.data ?? null}
      propertyError={propertyQuery.isError}
      propertyLoading={propertyQuery.isLoading}
      topInset={insets.top}
      width={pageWidth}
    />
  ), [
    communityQuery.data,
    communityQuery.isError,
    communityQuery.isLoading,
    current,
    height,
    insets.bottom,
    insets.top,
    next,
    pageWidth,
    propertyQuery.data,
    propertyQuery.isError,
    propertyQuery.isLoading,
    retryCommunity,
    retryProperty,
  ]);

  if (showSplash) return <SplashScreenView />;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <FlatList
        bounces={false}
        data={slides}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ index, length: pageWidth, offset: pageWidth * index })}
        horizontal
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          setCurrent(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
        }}
        pagingEnabled
        ref={list}
        renderItem={renderSlide}
        showsHorizontalScrollIndicator={false}
        style={{ width: pageWidth }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  pressed: { opacity: 0.72 },
  fill: { width: '100%', height: '100%' },
  underline: { textDecorationLine: 'underline' },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandCentered: { alignSelf: 'center' },
  brandName: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.bold },
  brandNameLarge: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },

  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashCenter: { alignItems: 'center', gap: 28 },
  splashSpinner: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: withAlpha(colors.primary, 0.24), borderTopColor: colors.primary },
  splashDots: { position: 'absolute', bottom: '19%', flexDirection: 'row', gap: 6 },
  splashDot: { width: 6, height: 6, borderRadius: 3 },
  splashDotActive: { backgroundColor: colors.primary, transform: [{ scale: 1.15 }] },

  pageDot: { width: 7, height: 7, borderRadius: 4 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: spacing.sm },

  page: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  titleBlock: { marginTop: spacing.xxl },
  title: typography.display,
  body: typography.body,
  subtitle: { marginTop: spacing.sm },
  subtitleLeft: { marginTop: spacing.sm, maxWidth: 340 },
  actions: { marginTop: 'auto', paddingTop: spacing.xl, alignItems: 'stretch', gap: spacing.xs },
  cta: { alignSelf: 'stretch' },
  textAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  textActionLabel: { fontSize: 15, fontFamily: fontFamily.medium, textAlign: 'center' },
  textActionStrong: { fontFamily: fontFamily.bold, textDecorationLine: 'underline' },

  discoverVisual: { marginTop: spacing.xl, marginBottom: spacing.lg },
  propertyCard: { gap: spacing.md },
  propertyFrame: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', borderRadius: radius.md, borderCurve: 'continuous' },
  propertyPill: { position: 'absolute', left: 12, top: 12 },
  propertyState: { alignItems: 'center', justifyContent: 'center', gap: 9, padding: 22 },
  propertySummary: { gap: 2 },
  propertyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  propertyTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: fontFamily.semibold },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propertyMeta: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  propertyPrice: { fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  stateTitle: { fontSize: 16, fontFamily: fontFamily.bold, textAlign: 'center' },
  stateText: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },

  communityData: { flex: 1, justifyContent: 'center', minHeight: 300, paddingVertical: spacing.xl },
  communityState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  stats: { width: '100%', flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  statValue: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  members: { alignItems: 'center', marginTop: spacing.xxxl },
  avatarRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  avatarBorder: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, overflow: 'hidden' },
  activeUsers: { marginTop: spacing.sm, fontSize: 15, fontFamily: fontFamily.semibold },

  getStartedPage: { flexGrow: 1 },
  artworkCrop: { overflow: 'hidden' },
  getStartedCopy: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
});

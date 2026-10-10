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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/user-avatar';
import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { ArrowRight, Home, Layers3, UsersRound } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { brand, colors, fontFamily, radius, spacing, typography, withAlpha } from '@/constants/theme';
import { fetchOwnerPlans, ownerPlanKeys } from '@/features/owner/owner-plan.api';
import {
  fetchOnboardingCommunity,
  onboardingKeys,
  type OnboardingCommunity,
} from '@/features/onboarding/onboarding.queries';
import { appStorage } from '@/lib/local-storage';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
const discoverArtworkLight = require('../../../assets/images/onboarding/onboarding-discover-stitch-blue.png');
const discoverArtworkDark = require('../../../assets/images/onboarding/onboarding-discover-stitch-dark.png');
const getStartedArtworkLight = require('../../../assets/images/onboarding/onboarding-get-started-stitch-blue.png');
const getStartedArtworkDark = require('../../../assets/images/onboarding/onboarding-get-started-stitch-dark.png');

/**
 * Estructura y reglas de datos del diseño de Stitch (stitch/casaseg-splash-screen):
 * splash → descubrir → comunidad → empezar. Las ilustraciones y la composición
 * siguen las revisiones azules de Stitch, con ilustraciones propias para claro
 * y oscuro. Las cifras y los avatares se consultan en Supabase.
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
  const { palette, resolvedMode } = useAppTheme();
  return (
    <View style={[styles.brand, centered && styles.brandCentered]}>
      <CasasegLogo width={large ? 56 : 26} height={large ? 46 : 21} />
      <Text style={[large ? styles.brandNameLarge : styles.brandName, { color: resolvedMode === 'dark' ? palette.text : brand.blue[900] }]}>
        CASASEG
      </Text>
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
      <LinearGradient
        colors={resolvedMode === 'dark'
          ? [brand.dark.background, brand.dark.surface]
          : [brand.neutral[0], brand.blue[50], brand.blue[100]]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />
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
      <Text style={[styles.textActionLabel, { color: strong ? palette.text : palette.brandText }]}>
        {strong ? `${label} ` : label}
        {strong ? <Text style={[styles.textActionStrong, { color: palette.brandText }]}>{strong}</Text> : null}
      </Text>
    </Pressable>
  );
}

function finishOnboarding() {
  appStorage.setItem('casaseg.onboarding.seen', 'true');
  router.replace('/(tabs)/explore');
}

function DiscoverSlide({
  active,
  bottomInset,
  height,
  onNext,
  topInset,
  width,
}: CommonSlideProps) {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  const accent = useAccent();
  const artworkHeight = Math.min(width * 0.72, height * 0.34);

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.page, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg), paddingTop: topInset + spacing.md }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand />
      </MotionBlock>

      <MotionBlock active={active} delay={90} distance={18} style={styles.discoverTitleBlock}>
        <Text accessibilityRole="header" style={[styles.title, { color: resolvedMode === 'dark' ? palette.text : brand.blue[900] }]}>
          {t('onboardingDiscoverTitlePrimary')}{'\n'}
          <Text style={{ color: accent }}>{t('onboardingDiscoverTitleAccent')}</Text>
        </Text>
      </MotionBlock>

      <MotionBlock active={active} delay={170} distance={28} style={styles.discoverVisual}>
        <View style={[styles.discoverArtworkFrame, { height: artworkHeight }]}>
          <Image
            accessibilityLabel={t('onboardingDiscoverIllustrationAccessibility')}
            contentFit="contain"
            source={resolvedMode === 'dark' ? discoverArtworkDark : discoverArtworkLight}
            style={styles.discoverArtwork}
            transition={200}
          />
        </View>
      </MotionBlock>

      <MotionBlock active={active} delay={260} distance={18}>
        <Text style={[styles.body, { color: palette.text }]}>{t('onboardingDiscoverBody')}</Text>
      </MotionBlock>

      <MotionBlock active={active} delay={340} distance={16} style={styles.actions}>
        <PremiumButton label={t('onboardingNext')} onPress={onNext} style={styles.stitchCta} variant="brand" />
        <TextAction label={t('onboardingSkip')} onPress={finishOnboarding} />
      </MotionBlock>
    </ScrollView>
  );
}

function CommunityContent({ active, community, error, loading, onRetry, planCount }: { active: boolean; community?: OnboardingCommunity; error: boolean; loading: boolean; onRetry: () => void; planCount?: number }) {
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
    { Icon: UsersRound, value: community.ownerCount, label: t('onboardingPublishingOwners') },
    planCount === undefined
      ? { Icon: Layers3, value: community.memberCount, label: t('onboardingVerifiedMembers') }
      : { Icon: Layers3, value: planCount, label: t('onboardingAvailablePlans') },
  ];

  return (
    <>
      <View style={styles.stats}>
        {stats.map(({ Icon, label, value }, index) => (
          <MotionBlock
            active={active}
            delay={210 + index * 90}
            distance={18}
            key={label}
            style={[styles.stat, { backgroundColor: palette.brandSoft, borderColor: palette.border }]}
          >
            <Icon color={palette.brandIcon} size={22} />
            <Text style={[styles.statValue, { color: palette.brandText }]}>{value}</Text>
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
                <UserAvatar name={member.name} size={44} uri={member.avatar} onPress={() => router.push({ pathname: '/users/[id]', params: { id: member.id } })} />
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
  planCount,
  topInset,
  width,
}: CommonSlideProps & { community?: OnboardingCommunity; communityError: boolean; communityLoading: boolean; onRetry: () => void; planCount?: number }) {
  const { t } = useI18n();
  const { palette } = useAppTheme();

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.page, styles.communityPage, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg), paddingTop: topInset + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand centered />
      </MotionBlock>
      <MotionBlock active={active} delay={90} distance={18} style={styles.communityTitleBlock}>
        <Text accessibilityRole="header" style={[styles.title, styles.centerText, { color: palette.text }]}>{t('onboardingCommunityTitle')}</Text>
        <Text style={[styles.body, styles.subtitle, styles.centerText, { color: palette.textSecondary }]}>{t('onboardingCommunitySubtitle')}</Text>
      </MotionBlock>

      <View style={styles.communityData}>
        <CommunityContent active={active} community={community} error={communityError} loading={communityLoading} onRetry={onRetry} planCount={planCount} />
      </View>

      <MotionBlock active={active} delay={690} distance={12} style={styles.communityActions}>
        <Pagination current={1} />
        <TextAction label={t('onboardingNext')} onPress={onNext} />
      </MotionBlock>
    </ScrollView>
  );
}

function GetStartedSlide({ active, bottomInset, height, topInset, width }: Omit<CommonSlideProps, 'onNext'>) {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  const artworkHeight = Math.min(width * 0.95, height * 0.46);
  const overlay = ['transparent', 'transparent', palette.background] as const;

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.getStartedPage, { minHeight: height, paddingBottom: Math.max(bottomInset, spacing.lg), paddingTop: topInset + spacing.md }]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={30} distance={-10} style={styles.getStartedBrand}>
        <Brand />
      </MotionBlock>

      <MotionBlock active={active} delay={90} distance={22} style={styles.getStartedArtworkBlock}>
        <View style={[styles.artworkCrop, { height: artworkHeight, width }]}>
          <Image
            accessibilityLabel={t('onboardingIllustrationAccessibility')}
            contentFit="cover"
            source={resolvedMode === 'dark' ? getStartedArtworkDark : getStartedArtworkLight}
            style={{ height: artworkHeight, width }}
            transition={200}
          />
          <LinearGradient colors={overlay} locations={[0, 0.8, 1]} style={StyleSheet.absoluteFill} />
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
          <PremiumButton label={t('onboardingGetStartedCta')} onPress={finishOnboarding} trailingIcon={ArrowRight} style={styles.stitchCta} variant="brand" />
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
  planCount?: number;
};

function SlideView(props: SlideViewProps) {
  if (props.item.id === 'discover') {
    return (
      <DiscoverSlide
        active={props.active}
        bottomInset={props.bottomInset}
        height={props.height}
        onNext={props.onNext}
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
        planCount={props.planCount}
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

  const communityQuery = useQuery({
    queryKey: onboardingKeys.community,
    queryFn: ({ signal }) => fetchOnboardingCommunity(signal),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
  const plansQuery = useQuery({
    queryKey: ownerPlanKeys.plans,
    queryFn: fetchOwnerPlans,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setShowSplash(false), reduceMotion ? 450 : 1350);
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

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
      planCount={plansQuery.data?.length || undefined}
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
    plansQuery.data,
    retryCommunity,
  ]);

  if (showSplash) return <SplashScreenView />;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <LinearGradient
        colors={resolvedMode === 'dark'
          ? [brand.dark.background, brand.dark.surface, brand.dark.background]
          : [brand.neutral[0], brand.blue[50], brand.blue[100]]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
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
  underline: { textDecorationLine: 'underline' },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandCentered: { alignSelf: 'center' },
  brandName: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.bold, letterSpacing: 0.25 },
  brandNameLarge: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },

  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashCenter: { alignItems: 'center', gap: 28 },
  splashSpinner: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: withAlpha(colors.primary, 0.24), borderTopColor: brand.blue[500] },
  splashDots: { position: 'absolute', bottom: '19%', flexDirection: 'row', gap: 6 },
  splashDot: { width: 6, height: 6, borderRadius: 3 },
  splashDotActive: { backgroundColor: colors.primary, transform: [{ scale: 1.15 }] },

  pageDot: { width: 7, height: 7, borderRadius: 4 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: spacing.sm },

  page: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  title: typography.display,
  body: typography.body,
  subtitle: { marginTop: spacing.sm },
  subtitleLeft: { marginTop: spacing.sm, maxWidth: 340 },
  centerText: { textAlign: 'center' },
  actions: { marginTop: 'auto', paddingTop: spacing.xl, alignItems: 'stretch', gap: spacing.xs },
  stitchCta: { alignSelf: 'stretch', borderRadius: radius.pill },
  textAction: { minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  textActionLabel: { fontSize: 14, fontFamily: fontFamily.medium, textAlign: 'center' },
  textActionStrong: { fontFamily: fontFamily.bold },

  discoverTitleBlock: { marginTop: spacing.xxl },
  discoverVisual: { marginTop: spacing.xl, marginBottom: spacing.lg, marginHorizontal: -spacing.md },
  discoverArtworkFrame: { width: '100%', overflow: 'hidden', borderRadius: radius.md },
  discoverArtwork: { width: '100%', height: '100%' },
  stateTitle: { fontSize: 16, fontFamily: fontFamily.bold, textAlign: 'center' },
  stateText: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },

  communityPage: { alignItems: 'stretch' },
  communityTitleBlock: { marginTop: spacing.xxl, alignItems: 'center' },
  communityData: { flex: 1, justifyContent: 'center', minHeight: 270, paddingVertical: spacing.xl },
  communityState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  stats: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: spacing.xs },
  stat: { flex: 1, minHeight: 126, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 3, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  statValue: { fontSize: 25, lineHeight: 30, fontFamily: fontFamily.extrabold, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fontFamily.medium, fontSize: 10, lineHeight: 13, textTransform: 'uppercase', textAlign: 'center' },
  members: { alignItems: 'center', marginTop: spacing.xxl },
  avatarRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  avatarBorder: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, overflow: 'hidden' },
  activeUsers: { marginTop: spacing.sm, fontSize: 14, fontFamily: fontFamily.medium },
  communityActions: { marginTop: 'auto', alignItems: 'stretch', gap: spacing.md },

  getStartedPage: { flexGrow: 1 },
  getStartedBrand: { paddingHorizontal: spacing.xxl },
  getStartedArtworkBlock: { marginTop: spacing.lg },
  artworkCrop: { overflow: 'hidden' },
  getStartedCopy: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xs },
});

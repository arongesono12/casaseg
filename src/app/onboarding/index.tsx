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
import { ArrowRight, Home, Layers3, UsersRound } from '@/components/ui/icons';
import { actionGradient, colors, radius } from '@/constants/theme';
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

const getStartedArtwork = require('../../../assets/images/onboarding/onboarding-get-started.png');

/**
 * La marca la lidera el azul; el teal solo acompaña. El onboarding traía además
 * una familia coral/rosa que no pertenecía a ninguno de los dos y era la que
 * rompía la coherencia con el resto de la app.
 */
const onboardingThemes = {
  light: {
    backgroundGradient: ['#EFF6FF', '#F6F9FC', '#E1ECFC'] as const,
    splashGradient: ['#F4F8FF', '#F8FAFC', '#E8F0FD'] as const,
    finalGradient: ['#DCE9FB', '#E7EFFB', '#F3F7FD'] as const,
    // La ilustración trae el rosa horneado en el PNG. El velo entra solo en la
    // franja final (donde el dibujo ya es fondo, no personajes) y la funde con
    // el panel, que arranca justo en ese mismo tono.
    artworkOverlay: ['transparent', 'transparent', 'rgba(220,233,251,0.74)'] as const,
    artworkOverlayStops: [0, 0.88, 1] as const,
    text: '#05090D',
    body: '#15191D',
    secondary: '#425466',
    brand: colors.brandDark,
    accent: colors.brandDark,
    surface: 'rgba(255,255,255,0.72)',
    mediaSurface: '#E8F2F3',
    border: 'rgba(12,31,43,0.22)',
    divider: 'rgba(17,24,39,0.18)',
    icon: '#111827',
    inactiveDot: '#AFC3CC',
    spinnerTrack: 'rgba(45,145,204,0.24)',
    spinner: '#2D91CC',
    avatarBorder: '#FFFFFF',
    signIn: '#222936',
    retry: '#247EC7',
  },
  dark: {
    backgroundGradient: ['#06111E', '#0B1724', '#0B2036'] as const,
    splashGradient: ['#06111E', '#0B1724', '#0B2036'] as const,
    finalGradient: ['#0D2740', '#0B1F33', '#0B1724'] as const,
    // En oscuro el velo sí cubre toda la imagen: además de fundir, es el scrim
    // que baja la ilustración al nivel de luz del resto de la pantalla.
    artworkOverlay: ['rgba(4,12,24,0.28)', 'rgba(9,28,45,0.62)', 'rgba(13,39,64,0.94)'] as const,
    artworkOverlayStops: [0, 0.7, 1] as const,
    text: '#F8FAFC',
    body: '#D6E0EA',
    secondary: '#AFC0CF',
    brand: '#67C7F3',
    accent: '#7DD3FC',
    surface: 'rgba(15,27,40,0.88)',
    mediaSurface: '#102233',
    border: 'rgba(255,255,255,0.16)',
    divider: 'rgba(255,255,255,0.18)',
    icon: '#F8FAFC',
    inactiveDot: '#64748B',
    spinnerTrack: 'rgba(103,199,243,0.22)',
    spinner: '#67C7F3',
    avatarBorder: '#132333',
    signIn: '#E2E8F0',
    retry: '#7DD3FC',
  },
} as const;

function useOnboardingTheme() {
  const { resolvedMode } = useAppTheme();
  return {
    dark: resolvedMode === 'dark',
    theme: onboardingThemes[resolvedMode],
  };
}

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

function Brand({
  centered = false,
  color = colors.brandDark,
  large = false,
}: {
  centered?: boolean;
  color?: string;
  large?: boolean;
}) {
  const logoWidth = large ? 48 : 22;

  return (
    <View style={[styles.brand, centered && styles.brandCentered]}>
      <CasasegLogo width={logoWidth} height={large ? 39 : 18} />
      <Text style={[large ? styles.brandNameLarge : styles.brandName, { color }]}>CASASEG</Text>
    </View>
  );
}

function SplashSpinner() {
  const { theme } = useOnboardingTheme();
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

  return (
    <Animated.View
      style={[
        styles.splashSpinner,
        { borderColor: theme.spinnerTrack, borderTopColor: theme.spinner },
        animatedStyle,
      ]}
    />
  );
}

function SplashScreenView() {
  const { t } = useI18n();
  const { dark, theme } = useOnboardingTheme();

  return (
    <LinearGradient
      colors={theme.splashGradient}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.splash}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <MotionBlock active delay={80} distance={10} style={styles.splashCenter}>
        <Brand color={theme.text} large />
        <SplashSpinner />
      </MotionBlock>
      <View accessibilityLabel={t('onboardingLoadingLabel')} style={styles.splashDots}>
        <View style={[styles.splashDot, { backgroundColor: theme.spinner }, styles.splashDotActive]} />
        <View style={[styles.splashDot, { backgroundColor: theme.inactiveDot }]} />
        <View style={[styles.splashDot, { backgroundColor: theme.inactiveDot }]} />
      </View>
    </LinearGradient>
  );
}

function PageDot({ active }: { active: boolean }) {
  const { theme } = useOnboardingTheme();
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

  return (
    <Animated.View
      style={[
        styles.pageDot,
        { backgroundColor: active ? theme.spinner : theme.inactiveDot },
        animatedStyle,
      ]}
    />
  );
}

function Pagination({ current }: { current: number }) {
  const { t } = useI18n();

  return (
    <View
      accessibilityLabel={t('onboardingPageStatus', {
        current: String(current + 1),
        total: String(slides.length),
      })}
      style={styles.pagination}
    >
      {slides.map((slide, index) => (
        <PageDot active={index === current} key={slide.id} />
      ))}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  showArrow = false,
}: {
  label: string;
  onPress: () => void;
  showArrow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButtonHitbox, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={actionGradient}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonLabel}>{label}</Text>
        {showArrow ? <ArrowRight color="white" size={18} /> : null}
      </LinearGradient>
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.propertyImageMotion, animatedStyle]}>
      <Image
        accessibilityLabel={t('onboardingPropertyAccessibility', {
          location: property.location,
          title: property.title,
        })}
        cachePolicy="disk"
        contentFit="cover"
        source={{ uri: property.imageUrls[0] }}
        style={styles.propertyImage}
        transition={250}
      />
    </Animated.View>
  );
}

function PropertyVisual({
  active,
  error,
  loading,
  onRetry,
  property,
}: {
  active: boolean;
  error: boolean;
  loading: boolean;
  onRetry: () => void;
  property: Property | null;
}) {
  const { t } = useI18n();
  const { theme } = useOnboardingTheme();

  if (loading) {
    return (
      <View
        style={[
          styles.propertyState,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <ActivityIndicator color={theme.spinner} size="large" />
        <Text style={[styles.stateText, { color: theme.secondary }]}>
          {t('onboardingPropertyLoading')}
        </Text>
      </View>
    );
  }

  if (error || !property?.imageUrls[0]) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.propertyState,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <Home color={theme.spinner} size={42} />
        <Text style={[styles.stateTitle, { color: theme.text }]}>
          {t('onboardingPropertyLoadError')}
        </Text>
        <Text style={[styles.retryText, { color: theme.retry }]}>
          {t('onboardingTapToRetry')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.propertyFrame,
        { backgroundColor: theme.mediaSurface, borderColor: theme.border },
      ]}
    >
      <AnimatedPropertyImage active={active} property={property} />
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
}: CommonSlideProps & {
  onRetry: () => void;
  property: Property | null;
  propertyError: boolean;
  propertyLoading: boolean;
}) {
  const { t } = useI18n();
  const { theme } = useOnboardingTheme();

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[
        styles.discoverPage,
        {
          minHeight: height,
          paddingBottom: Math.max(bottomInset, 12),
          paddingTop: topInset + 14,
        },
      ]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand color={theme.brand} />
      </MotionBlock>

      <MotionBlock active={active} delay={90} distance={18} style={styles.discoverTitleBlock}>
        <Text style={[styles.discoverTitle, { color: theme.text }]}>
          {t('onboardingDiscoverTitlePrimary')}{'\n'}
          <Text style={[styles.accentText, { color: theme.accent }]}>
            {t('onboardingDiscoverTitleAccent')}
          </Text>
        </Text>
      </MotionBlock>

      <MotionBlock active={active} delay={170} distance={28} style={styles.discoverVisual}>
        <PropertyVisual
          active={active}
          error={propertyError}
          loading={propertyLoading}
          onRetry={onRetry}
          property={property}
        />
      </MotionBlock>

      <MotionBlock active={active} delay={260} distance={18}>
        <Text style={[styles.discoverBody, { color: theme.body }]}>
          {t('onboardingDiscoverBody')}
        </Text>
      </MotionBlock>

      <MotionBlock active={active} delay={340} distance={16} style={styles.discoverActions}>
        <PrimaryButton label={t('onboardingNext')} onPress={onNext} />
        <Pressable
          accessibilityRole="button"
          onPress={finishOnboarding}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
        >
          <Text style={[styles.skipLabel, { color: theme.accent }]}>
            {t('onboardingSkip')}
          </Text>
        </Pressable>
      </MotionBlock>
    </ScrollView>
  );
}

function CommunityContent({
  active,
  community,
  error,
  loading,
  onRetry,
}: {
  active: boolean;
  community?: OnboardingCommunity;
  error: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useOnboardingTheme();

  if (loading) {
    return (
      <View style={styles.communityState}>
        <ActivityIndicator color={theme.spinner} size="large" />
        <Text style={[styles.stateText, { color: theme.secondary }]}>
          {t('onboardingCommunityLoading')}
        </Text>
      </View>
    );
  }

  if (error || !community) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.communityState, pressed && styles.pressed]}
      >
        <UsersRound color={theme.spinner} size={40} />
        <Text style={[styles.stateTitle, { color: theme.text }]}>
          {t('onboardingCommunityLoadError')}
        </Text>
        <Text style={[styles.retryText, { color: theme.retry }]}>
          {t('onboardingTapToRetry')}
        </Text>
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
      <View style={styles.statsRow}>
        {stats.map(({ Icon, label, value }, index) => (
          <MotionBlock
            active={active}
            delay={210 + index * 90}
            distance={18}
            key={label}
            style={[
              styles.stat,
              index > 0 && styles.statDivider,
              index > 0 && { borderLeftColor: theme.divider },
            ]}
          >
            <Icon color={theme.icon} size={25} />
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.body }]}>{label}</Text>
          </MotionBlock>
        ))}
      </View>

      <MotionBlock active={active} delay={520} distance={16} style={styles.communityMembers}>
        <View style={styles.avatarRow}>
          {community.members.map((member, index) => (
            <MotionBlock
              active={active}
              delay={580 + index * 80}
              distance={12}
              key={member.id}
              style={[
                styles.avatarBorder,
                {
                  backgroundColor: theme.mediaSurface,
                  borderColor: theme.avatarBorder,
                  marginLeft: index === 0 ? 0 : -9,
                  zIndex: community.members.length - index,
                },
              ]}
            >
              <UserAvatar name={member.name} size={42} uri={member.avatar} />
            </MotionBlock>
          ))}
        </View>
        <Text style={[styles.activeUsers, { color: theme.text }]}>
          {t('onboardingActiveUsers', { count: String(community.memberCount) })}
        </Text>
      </MotionBlock>
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
}: CommonSlideProps & {
  community?: OnboardingCommunity;
  communityError: boolean;
  communityLoading: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useOnboardingTheme();

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[
        styles.communityPage,
        {
          minHeight: height,
          paddingBottom: Math.max(bottomInset, 18),
          paddingTop: topInset + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={20} distance={-8}>
        <Brand centered color={theme.text} />
      </MotionBlock>
      <MotionBlock active={active} delay={90} distance={18} style={styles.communityHeading}>
        <Text style={[styles.communityTitle, { color: theme.text }]}>
          {t('onboardingCommunityTitle')}
        </Text>
        <Text style={[styles.communitySubtitle, { color: theme.body }]}>
          {t('onboardingCommunitySubtitle')}
        </Text>
      </MotionBlock>

      <View style={styles.communityData}>
        <CommunityContent
          active={active}
          community={community}
          error={communityError}
          loading={communityLoading}
          onRetry={onRetry}
        />
      </View>

      <MotionBlock active={active} delay={690} distance={12} style={styles.communityFooter}>
        <Pagination current={1} />
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={({ pressed }) => [styles.nextTextButton, pressed && styles.pressed]}
        >
          <Text style={[styles.nextTextLabel, { color: theme.text }]}>
            {t('onboardingNext')}
          </Text>
        </Pressable>
      </MotionBlock>
    </ScrollView>
  );
}

function GetStartedSlide({
  active,
  bottomInset,
  height,
  topInset,
  width,
}: Omit<CommonSlideProps, 'onNext'>) {
  const { t } = useI18n();
  const { theme } = useOnboardingTheme();
  const artworkHeight = width * 1.01;
  const fullArtworkHeight = width * (1376 / 768);
  const compactHeight = height < 720;
  const copyTopGap = compactHeight
    ? 28
    : Math.max(60, Math.min(105, height - artworkHeight - 345));
  const actionsTopGap = compactHeight ? 16 : 34;

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[
        styles.getStartedPage,
        {
          minHeight: height,
          paddingBottom: Math.max(bottomInset, 14),
          paddingTop: topInset,
        },
      ]}
      showsVerticalScrollIndicator={false}
      style={{ width }}
    >
      <MotionBlock active={active} delay={30} distance={-10}>
        <View style={[styles.finalArtworkCrop, { height: artworkHeight, width }]}>
          <Image
            accessibilityLabel={t('onboardingIllustrationAccessibility')}
            contentFit="contain"
            source={getStartedArtwork}
            style={{ height: fullArtworkHeight, width }}
          />
          <LinearGradient
            colors={theme.artworkOverlay}
            locations={theme.artworkOverlayStops}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      </MotionBlock>

      <LinearGradient
        colors={theme.finalGradient}
        locations={[0, 0.46, 1]}
        style={[
          styles.getStartedCopy,
          {
            minHeight: Math.max(0, height - artworkHeight - topInset),
            paddingTop: copyTopGap,
          },
        ]}
      >
        <MotionBlock active={active} delay={150} distance={20}>
          <Text style={[styles.getStartedTitle, { color: theme.text }]}>{t('onboardingGetStartedTitle')}</Text>
        </MotionBlock>
        <MotionBlock active={active} delay={230} distance={18}>
          <Text style={[styles.getStartedBody, { color: theme.body }]}>{t('onboardingGetStartedBody')}</Text>
        </MotionBlock>
        <MotionBlock
          active={active}
          delay={310}
          distance={18}
          style={[styles.getStartedActions, { marginTop: actionsTopGap }]}
        >
          <PrimaryButton label={t('onboardingGetStartedCta')} onPress={finishOnboarding} showArrow />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}
          >
            <Text style={[styles.signInLabel, { color: theme.signIn }]}>
              {t('onboardingHaveAccount')}{' '}
              <Text style={styles.signInStrong}>{t('signIn')}.</Text>
            </Text>
          </Pressable>
        </MotionBlock>
      </LinearGradient>
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

  return (
    <GetStartedSlide
      active={props.active}
      bottomInset={props.bottomInset}
      height={props.height}
      topInset={props.topInset}
      width={props.width}
    />
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { dark, theme } = useOnboardingTheme();
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
    <LinearGradient
      colors={theme.backgroundGradient}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.48, 1]}
      start={{ x: 0, y: 0 }}
      style={styles.container}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  pressed: { opacity: 0.72 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandCentered: { alignSelf: 'center' },
  brandName: { fontSize: 13, lineHeight: 16, fontWeight: '900', letterSpacing: 0.15 },
  brandNameLarge: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: 0.25 },

  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashCenter: { alignItems: 'center', gap: 23 },
  splashSpinner: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: 'rgba(45,145,204,0.24)',
    borderTopColor: '#2D91CC',
  },
  splashDots: {
    position: 'absolute',
    bottom: '19%',
    flexDirection: 'row',
    gap: 6,
  },
  splashDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BFC9D1' },
  splashDotActive: { backgroundColor: '#2D91CC', transform: [{ scale: 1.15 }] },

  pageDot: { width: 7, height: 7, borderRadius: 4 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },

  primaryButtonHitbox: { width: '100%', borderRadius: radius.pill },
  primaryButton: {
    minHeight: 50,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    boxShadow: '0 12px 24px rgba(15, 118, 110, 0.26)',
  },
  primaryButtonLabel: { color: 'white', fontSize: 15, fontWeight: '800' },

  discoverPage: { flexGrow: 1, paddingHorizontal: 16 },
  discoverTitleBlock: { marginTop: 29 },
  discoverTitle: {
    color: '#05090D',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  accentText: { color: colors.brandDark },
  discoverVisual: { marginTop: 25 },
  propertyFrame: {
    width: '100%',
    aspectRatio: 1.42,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#E8F2F3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(12, 31, 43, 0.22)',
    boxShadow: '0 8px 20px rgba(19, 52, 72, 0.12)',
  },
  propertyImageMotion: { width: '100%', height: '100%' },
  propertyImage: { width: '100%', height: '100%' },
  propertyState: {
    width: '100%',
    aspectRatio: 1.42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(12, 31, 43, 0.14)',
  },
  stateTitle: { color: '#111827', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#425466', fontSize: 13, textAlign: 'center' },
  retryText: { color: '#247EC7', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  discoverBody: {
    marginTop: 20,
    color: '#15191D',
    fontSize: 15,
    lineHeight: 21,
  },
  discoverActions: { marginTop: 'auto', paddingTop: 20, alignItems: 'center' },
  secondaryAction: {
    minHeight: 45,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  skipLabel: { color: colors.brandDark, fontSize: 14, fontWeight: '700' },

  communityPage: { flexGrow: 1, paddingHorizontal: 22, alignItems: 'stretch' },
  communityHeading: { alignItems: 'center', marginTop: 23 },
  communityTitle: {
    color: '#05090D',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  communitySubtitle: {
    marginTop: 10,
    maxWidth: 390,
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
  communityData: { flex: 1, justifyContent: 'center', minHeight: 305 },
  communityState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  statsRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 106 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(17,24,39,0.18)' },
  statValue: {
    color: '#05090D',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#101820',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  communityMembers: { alignItems: 'center', marginTop: 30 },
  avatarRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  avatarBorder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#E6EFF2',
  },
  activeUsers: { marginTop: 8, color: '#111827', fontSize: 13, fontWeight: '800' },
  communityFooter: { alignItems: 'center', gap: 19 },
  nextTextButton: { minWidth: 96, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  nextTextLabel: { color: '#111827', fontSize: 15, fontWeight: '600' },

  getStartedPage: { flexGrow: 1 },
  finalArtworkCrop: { overflow: 'hidden' },
  getStartedCopy: { paddingHorizontal: 16 },
  // El color lo pone el tema. Sobre el panel claro el texto va oscuro y ya no
  // necesita sombra para separarse del fondo.
  getStartedTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  getStartedBody: {
    marginTop: 8,
    maxWidth: 310,
    fontSize: 15,
    lineHeight: 21,
  },
  getStartedActions: {},
  signInButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  signInLabel: { color: '#222936', fontSize: 12, textAlign: 'center' },
  signInStrong: { fontWeight: '800' },
});

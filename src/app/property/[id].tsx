import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyGallery } from '@/components/property/property-gallery';
import { PropertyMap } from '@/components/property-map';
import { UserAvatar } from '@/components/user-avatar';
import { ArrowLeft, Bath, BedDouble, Camera, CheckCircle2, Heart, MapPin, Maximize2, ShieldCheck, Star } from '@/components/ui/icons';
import { brandGradient, colors, radius, touchTarget } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useProperty } from '@/features/properties/hooks/use-properties';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
const fallbackImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=82';

function normalizeImageUrl(value?: string) {
  if (!value?.trim()) return fallbackImage;
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

export default function PropertyDetailScreen() {
  const { id, conversationId } = useLocalSearchParams<{ id: string; conversationId?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { t, locale } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const propertyQuery = useProperty(id);
  const property = propertyQuery.data;
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [guestFavorite, setGuestFavorite] = useState(false);
  const favorites = useQuery({
    queryKey: propertyKeys.favorites(user?.id ?? 'guest'),
    queryFn: () => fetchFavorites(user!.id),
    enabled: Boolean(user),
  });
  const favoriteMutation = useFavoriteMutation(user?.id ?? 'guest');
  const images = useMemo(() => {
    const uniqueImages = Array.from(new Set((property?.imageUrls ?? []).map(normalizeImageUrl).filter(Boolean)));
    return uniqueImages.length ? uniqueImages : [fallbackImage];
  }, [property?.imageUrls]);
  const wide = width >= 900;

  if (propertyQuery.isLoading) {
    return <ScreenState palette={palette} label={t('loading')} loading />;
  }

  if (propertyQuery.isError) {
    return <ScreenState palette={palette} label={t('propertyLoadError')} actionLabel={t('retry')} onAction={() => void propertyQuery.refetch()} />;
  }

  if (!property) {
    return <ScreenState palette={palette} label={t('notFound')} actionLabel={t('back')} onAction={() => router.back()} />;
  }

  const isFavorite = isAuthenticated ? favorites.data?.includes(property.id) ?? false : guestFavorite;
  const isOwnProperty = user?.id === property.ownerId;
  const cta = isOwnProperty
    ? t('editProperty')
    : conversationId
      ? t('openConversation')
      : !isAuthenticated
        ? t('loginToContact')
        : property.isOccupied
          ? t('waitingList')
          : t('contact');
  const formattedPrice = formatXaf(property.price, property.priceType, locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'es-GQ');

  const onCta = () => {
    if (!isAuthenticated) router.push('/(auth)/login');
    else if (isOwnProperty) router.push({ pathname: '/owner/property/[id]', params: { id: property.id } });
    else router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversationId ?? `property-${property.id}` } });
  };

  const requestVisit = () => router.push({
    pathname: '/visit/[propertyId]',
    params: { propertyId: property.id },
  } as unknown as Href);

  const toggleFavorite = () => {
    const next = !isFavorite;
    if (!isAuthenticated) setGuestFavorite(next);
    else favoriteMutation.mutate({ propertyId: property.id, favorite: next });
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: wide ? 48 : 112 + insets.bottom },
        ]}
      >
        <View style={[styles.page, wide && styles.pageWide]}>
          <View style={styles.mainColumn}>
            <View style={[styles.hero, wide && styles.heroWide, { backgroundColor: palette.subtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('photos')}: ${property.title}`}
                onPress={() => setGalleryVisible(true)}
                style={styles.heroPressable}
              >
                <Image
                  source={{ uri: images[0] }}
                  placeholder={{ blurhash }}
                  cachePolicy="disk"
                  contentFit="cover"
                  transition={180}
                  style={styles.heroImage}
                  accessibilityLabel={property.title}
                />
                <LinearGradient colors={['rgba(15,23,42,0.42)', 'transparent', 'rgba(15,23,42,0.48)']} locations={[0, 0.42, 1]} style={styles.heroShade} />
                <View style={styles.imageCounter}>
                  <Camera color="white" size={16} />
                  <Text style={styles.imageCounterText}>{images.length}</Text>
                  <Text style={styles.imageCounterLabel}>{t('photos')}</Text>
                </View>
              </Pressable>

              <SafeAreaView edges={['top']} style={styles.topActions} pointerEvents="box-none">
                <CircleButton label={t('back')} onPress={() => router.back()}>
                  <ArrowLeft color={colors.text} size={23} />
                </CircleButton>
                <CircleButton
                  label={isFavorite ? t('removeFavorite') : t('saveProperty')}
                  onPress={toggleFavorite}
                  disabled={favoriteMutation.isPending}
                >
                  <Heart color={isFavorite ? colors.favorite : colors.text} fill={isFavorite ? colors.favorite : 'transparent'} size={23} />
                </CircleButton>
              </SafeAreaView>
            </View>

            <View style={styles.summary}>
              <View style={styles.badgeRow}>
                {property.isNew && <Badge label={t('newBadge')} backgroundColor={palette.brand} textColor="white" />}
                <Badge
                  label={property.isOccupied ? t('occupied') : t('available')}
                  backgroundColor={property.isOccupied ? `${colors.warning}22` : `${colors.success}1A`}
                  textColor={property.isOccupied ? colors.warning : colors.success}
                />
              </View>

              <View style={styles.titleRow}>
                <Text selectable style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.rating}>
                  <Star color={colors.warning} fill={colors.warning} size={18} />
                  <Text selectable style={[styles.ratingText, { color: palette.text }]}>{property.rating.toFixed(1)}</Text>
                  <Text selectable style={[styles.reviewCount, { color: palette.textSecondary }]}>({property.reviewCount})</Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <MapPin color={palette.textSecondary} size={18} />
                <Text selectable style={[styles.location, { color: palette.textSecondary }]}>{property.location}</Text>
              </View>

              {!wide && <Text selectable style={[styles.price, { color: palette.text }]}>{formattedPrice}</Text>}

              <View style={styles.featureGrid}>
                <Feature icon={<BedDouble color={palette.primary} size={22} />} value={t('beds', { count: String(property.bedrooms) })} palette={palette} />
                <Feature icon={<Bath color={palette.primary} size={22} />} value={t('baths', { count: String(property.bathrooms) })} palette={palette} />
                <Feature icon={<Maximize2 color={palette.primary} size={21} />} value={`${property.area || '—'} m²`} palette={palette} />
              </View>
            </View>

            <DetailCard title={t('description')} palette={palette}>
              <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{property.description}</Text>
            </DetailCard>

            <DetailCard title={t('amenities')} palette={palette}>
              {property.amenities.length ? (
                <View style={styles.chips}>
                  {property.amenities.map((amenity) => (
                    <View key={amenity} style={[styles.chip, { backgroundColor: palette.subtle }]}>
                      <CheckCircle2 color={colors.success} size={17} />
                      <Text selectable style={[styles.chipText, { color: palette.text }]}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={[styles.body, { color: palette.textSecondary }]}>—</Text>}
            </DetailCard>

            <DetailCard title={t('owner')} palette={palette}>
              <View style={styles.ownerRow}>
                <UserAvatar name={property.ownerName} uri={property.ownerAvatar} size={50} />
                <View style={styles.flex}>
                  <Text selectable style={[styles.ownerName, { color: palette.text }]}>{property.ownerName}</Text>
                  <Text style={[styles.caption, { color: palette.textSecondary }]}>{t('verifiedIdentity')}</Text>
                </View>
                <View style={[styles.verifiedIcon, { backgroundColor: `${colors.success}18` }]}><ShieldCheck color={colors.success} size={23} /></View>
              </View>
            </DetailCard>

            <DetailCard title={t('location')} palette={palette} noPadding>
              <Pressable accessibilityRole="button" accessibilityLabel={t('mapSearch')} onPress={() => router.push('/map')} style={styles.mapFrame}>
                <PropertyMap />
                <View style={styles.mapLabel}><MapPin color={colors.text} size={17} /><Text style={styles.mapLabelText}>{t('mapSearch')}</Text></View>
              </Pressable>
            </DetailCard>

            <View style={[styles.legalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.verifiedIcon, { backgroundColor: property.legalStatus === 'verified' ? `${colors.success}18` : `${colors.warning}20` }]}>
                <ShieldCheck color={property.legalStatus === 'verified' ? colors.success : colors.warning} size={23} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.ownerName, { color: palette.text }]}>{property.legalStatus === 'verified' ? t('documentVerified') : t('verificationPending')}</Text>
                <Text style={[styles.caption, { color: palette.textSecondary }]}>{property.isOccupied ? t('occupied') : t('available')}</Text>
              </View>
            </View>

            {!wide && isAuthenticated && !isOwnProperty && (
              <SecondaryButton label={t('requestVisit')} onPress={requestVisit} palette={palette} />
            )}
          </View>

          {wide && (
            <View style={[styles.asideCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text selectable style={[styles.asidePrice, { color: palette.text }]}>{formattedPrice}</Text>
              <View style={styles.asideStatus}><ShieldCheck color={colors.success} size={19} /><Text style={[styles.asideStatusText, { color: palette.textSecondary }]}>{property.legalStatus === 'verified' ? t('documentVerified') : t('verificationPending')}</Text></View>
              <PrimaryButton label={cta} onPress={onCta} />
              {isAuthenticated && !isOwnProperty && <SecondaryButton label={t('requestVisit')} onPress={requestVisit} palette={palette} />}
            </View>
          )}
        </View>
      </ScrollView>

      {!wide && (
        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.ctaPriceBlock}>
            <Text selectable numberOfLines={1} style={[styles.ctaPrice, { color: palette.text }]}>{formattedPrice}</Text>
            <Text style={[styles.ctaAvailability, { color: palette.textSecondary }]}>{property.isOccupied ? t('occupied') : t('available')}</Text>
          </View>
          <View style={styles.ctaButtonWrap}><PrimaryButton label={cta} onPress={onCta} /></View>
        </View>
      )}

      <PropertyGallery visible={galleryVisible} images={images} title={property.title} onClose={() => setGalleryVisible(false)} />
    </View>
  );
}

function ScreenState({ palette, label, loading, actionLabel, onAction }: { palette: ReturnType<typeof useAppTheme>['palette']; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={[styles.center, { backgroundColor: palette.background }]}>
      {loading && <ActivityIndicator color={palette.brand} size="large" />}
      <Text selectable style={[styles.stateText, { color: palette.text }]}>{label}</Text>
      {actionLabel && onAction && <SecondaryButton label={actionLabel} onPress={onAction} palette={palette} />}
    </View>
  );
}

function CircleButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.circle, { opacity: pressed || disabled ? 0.72 : 1 }]}>{children}</Pressable>;
}

function Badge({ label, backgroundColor, textColor }: { label: string; backgroundColor: string; textColor: string }) {
  return <View style={[styles.badge, { backgroundColor }]}><Text style={[styles.badgeText, { color: textColor }]}>{label}</Text></View>;
}

function Feature({ icon, value, palette }: { icon: ReactNode; value: string; palette: ReturnType<typeof useAppTheme>['palette'] }) {
  return <View style={[styles.feature, { backgroundColor: palette.surface, borderColor: palette.border }]}>{icon}<Text selectable numberOfLines={2} style={[styles.featureText, { color: palette.text }]}>{value}</Text></View>;
}

function DetailCard({ title, palette, children, noPadding = false }: { title: string; palette: ReturnType<typeof useAppTheme>['palette']; children: ReactNode; noPadding?: boolean }) {
  return (
    <View style={[styles.detailCard, noPadding && styles.detailCardNoPadding, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.sectionTitle, noPadding && styles.sectionTitlePadded, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.86 : 1 }]}><LinearGradient colors={brandGradient} style={styles.primaryGradient}><Text numberOfLines={2} style={styles.primaryText}>{label}</Text></LinearGradient></Pressable>;
}

function SecondaryButton({ label, onPress, palette }: { label: string; onPress: () => void; palette: ReturnType<typeof useAppTheme>['palette'] }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, { borderColor: palette.border, backgroundColor: pressed ? palette.subtle : palette.surface }]}><Text style={[styles.secondaryText, { color: palette.text }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  pageWide: { maxWidth: 1180, flexDirection: 'row', alignItems: 'flex-start', gap: 28, paddingHorizontal: 24, paddingTop: 24 },
  mainColumn: { flex: 1, minWidth: 0, gap: 18 },
  hero: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden' },
  heroWide: { aspectRatio: 16 / 10, borderRadius: radius.xl, borderCurve: 'continuous' },
  heroPressable: { flex: 1 },
  heroImage: { flex: 1 },
  heroShade: { ...StyleSheet.absoluteFillObject },
  topActions: { position: 'absolute', left: 16, right: 16, top: 0, flexDirection: 'row', justifyContent: 'space-between' },
  circle: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(15,23,42,0.18)' },
  imageCounter: { position: 'absolute', right: 16, bottom: 16, minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.72)' },
  imageCounterText: { color: 'white', fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  imageCounterLabel: { color: 'white', fontSize: 13, fontWeight: '700' },
  summary: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  title: { flex: 1, fontSize: 29, lineHeight: 35, fontWeight: '900' },
  rating: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  ratingText: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  reviewCount: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  location: { flex: 1, fontSize: 15, lineHeight: 22 },
  price: { fontSize: 23, lineHeight: 29, fontWeight: '900', fontVariant: ['tabular-nums'] },
  featureGrid: { flexDirection: 'row', gap: 10 },
  feature: { flex: 1, minHeight: 84, minWidth: 0, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 7 },
  featureText: { textAlign: 'center', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  detailCard: { marginHorizontal: 20, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 18, gap: 12 },
  detailCardNoPadding: { paddingHorizontal: 0, paddingBottom: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900' },
  sectionTitlePadded: { paddingHorizontal: 18 },
  body: { fontSize: 15, lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, borderRadius: radius.pill, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipText: { fontSize: 13, fontWeight: '700' },
  ownerRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  ownerName: { fontSize: 15, lineHeight: 21, fontWeight: '900' },
  caption: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  verifiedIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  mapFrame: { height: 220, overflow: 'hidden' },
  mapLabel: { position: 'absolute', left: 14, bottom: 14, minHeight: 40, borderRadius: radius.pill, paddingHorizontal: 13, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', gap: 6, boxShadow: '0 3px 12px rgba(15,23,42,0.16)' },
  mapLabelText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  legalCard: { marginHorizontal: 20, minHeight: 78, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  asideCard: { width: 340, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 20, gap: 16, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' },
  asidePrice: { fontSize: 25, lineHeight: 31, fontWeight: '900', fontVariant: ['tabular-nums'] },
  asideStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  asideStatusText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  primaryButton: { minHeight: 56, borderRadius: radius.md, overflow: 'hidden' },
  primaryGradient: { flex: 1, minHeight: 56, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  secondaryButton: { minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { textAlign: 'center', fontSize: 14, fontWeight: '900' },
  ctaBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 78, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 -8px 24px rgba(15,23,42,0.08)' },
  ctaPriceBlock: { flex: 1, minWidth: 0 },
  ctaPrice: { fontSize: 16, lineHeight: 21, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ctaAvailability: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  ctaButtonWrap: { minWidth: 148, maxWidth: '56%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  stateText: { maxWidth: 420, textAlign: 'center', fontSize: 16, lineHeight: 24, fontWeight: '700' },
});

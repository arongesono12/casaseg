import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyGallery } from '@/components/property/property-gallery';
import { UserAvatar } from '@/components/user-avatar';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Heart,
  HomeCheck,
  MapPin,
  Moon,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
} from '@/components/ui/icons';
import { actionGradient, colors, radius, touchTarget, type AppPalette } from '@/constants/theme';
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

const detailCopy = {
  es: {
    dark: 'Cambiar al tema oscuro', light: 'Cambiar al tema claro', share: 'Compartir propiedad',
    host: 'Anfitrión', excellentLocation: 'Ubicación excelente', locationDetail: 'Una zona bien valorada por la comunidad.',
    secureBooking: 'Proceso de reserva seguro', secureBookingDetail: 'Protección de tus datos durante todo el proceso.',
    fastCommunication: 'Comunicación rápida', fastCommunicationDetail: 'Contacta directamente con el anfitrión.',
    legalTitle: 'Información legal y de reserva', registration: 'Registro / licencia',
    registrationValue: 'No requerida / no indicada', verification: 'Estado de verificación',
    category: 'Categoría', cancellation: 'Cancelación', standard: 'Estándar',
    reviews: 'Reseñas verificadas', noReviews: 'Aún no hay valoraciones publicadas por inquilinos con reserva completada.',
    reviewsAvailable: 'valoraciones verificadas publicadas.', amenities: 'Lo que ofrece este lugar',
    noAmenities: 'El anfitrión todavía no ha detallado los servicios.', service: 'Servicio', cleaning: 'Limpieza',
    taxes: 'Impuestos', deposit: 'Depósito / fianza', availability: 'Disponibilidad', immediate: 'Inmediata',
    housingState: 'Estado de la vivienda', ready: 'Amueblada y lista', reserveVisit: 'Reservar visita',
    maps: 'Cómo llegar con Google Maps', noCharge: 'No se te cobrará nada todavía', total: 'Total',
    contactHost: 'Contactar al anfitrión', verified: 'Verificada', pending: 'En revisión', restricted: 'Restringida',
    longTerm: 'Largo plazo', shortTerm: 'Corta estancia', sale: 'Venta',
    perMonth: 'Por mes', perNight: 'Por noche', salePrice: 'Precio de venta',
  },
  fr: {
    dark: 'Passer au thème sombre', light: 'Passer au thème clair', share: 'Partager le logement',
    host: 'Hôte', excellentLocation: 'Excellent emplacement', locationDetail: 'Un quartier apprécié par la communauté.',
    secureBooking: 'Réservation sécurisée', secureBookingDetail: 'Protection de vos données pendant tout le processus.',
    fastCommunication: 'Communication rapide', fastCommunicationDetail: 'Contactez directement l’hôte.',
    legalTitle: 'Informations légales et réservation', registration: 'Enregistrement / licence',
    registrationValue: 'Non requise / non indiquée', verification: 'État de vérification',
    category: 'Catégorie', cancellation: 'Annulation', standard: 'Standard',
    reviews: 'Avis vérifiés', noReviews: 'Aucun avis publié par des locataires ayant terminé leur réservation.',
    reviewsAvailable: 'avis vérifiés publiés.', amenities: 'Ce que propose ce logement',
    noAmenities: 'L’hôte n’a pas encore détaillé les équipements.', service: 'Service', cleaning: 'Nettoyage',
    taxes: 'Taxes', deposit: 'Dépôt / caution', availability: 'Disponibilité', immediate: 'Immédiate',
    housingState: 'État du logement', ready: 'Meublé et prêt', reserveVisit: 'Réserver une visite',
    maps: 'Itinéraire avec Google Maps', noCharge: 'Aucun montant ne sera débité pour le moment', total: 'Total',
    contactHost: 'Contacter l’hôte', verified: 'Vérifié', pending: 'En cours', restricted: 'Restreint',
    longTerm: 'Longue durée', shortTerm: 'Court séjour', sale: 'Vente',
    perMonth: 'Par mois', perNight: 'Par nuit', salePrice: 'Prix de vente',
  },
  en: {
    dark: 'Switch to dark theme', light: 'Switch to light theme', share: 'Share property',
    host: 'Host', excellentLocation: 'Excellent location', locationDetail: 'A neighborhood highly rated by the community.',
    secureBooking: 'Secure booking process', secureBookingDetail: 'Your data is protected throughout the process.',
    fastCommunication: 'Fast communication', fastCommunicationDetail: 'Contact the host directly.',
    legalTitle: 'Legal and booking information', registration: 'Registration / license',
    registrationValue: 'Not required / not provided', verification: 'Verification status',
    category: 'Category', cancellation: 'Cancellation', standard: 'Standard',
    reviews: 'Verified reviews', noReviews: 'There are no published ratings from tenants with a completed booking yet.',
    reviewsAvailable: 'verified ratings published.', amenities: 'What this place offers',
    noAmenities: 'The host has not listed the amenities yet.', service: 'Service', cleaning: 'Cleaning',
    taxes: 'Taxes', deposit: 'Security deposit', availability: 'Availability', immediate: 'Immediate',
    housingState: 'Property condition', ready: 'Furnished and ready', reserveVisit: 'Book a visit',
    maps: 'Directions with Google Maps', noCharge: 'You will not be charged yet', total: 'Total',
    contactHost: 'Contact the host', verified: 'Verified', pending: 'Under review', restricted: 'Restricted',
    longTerm: 'Long term', shortTerm: 'Short stay', sale: 'Sale',
    perMonth: 'Per month', perNight: 'Per night', salePrice: 'Sale price',
  },
} as const;

type Copy = (typeof detailCopy)[keyof typeof detailCopy];

function normalizeImageUrl(value?: string) {
  if (!value?.trim()) return fallbackImage;
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

const HeroSlide = memo(function HeroSlide({
  uri,
  index,
  total,
  width,
  title,
  photosLabel,
  photoLabel,
  onOpen,
}: {
  uri: string;
  index: number;
  total: number;
  width: number;
  title: string;
  photosLabel: string;
  photoLabel: string;
  onOpen: (index: number) => void;
}) {
  const open = useCallback(() => onOpen(index), [index, onOpen]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${photosLabel} ${index + 1} / ${total}: ${title}`}
      onPress={open}
      style={[styles.heroSlide, { width }]}
    >
      <Image
        source={{ uri }}
        placeholder={{ blurhash }}
        cachePolicy="disk"
        contentFit="cover"
        transition={180}
        style={styles.heroImage}
        accessibilityLabel={`${title}, ${photoLabel}`}
      />
    </Pressable>
  );
});

export default function PropertyDetailScreen() {
  const { id, conversationId } = useLocalSearchParams<{ id: string; conversationId?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette, resolvedMode, setMode } = useAppTheme();
  const { t, locale } = useI18n();
  const copy = detailCopy[locale];
  const { user, isAuthenticated } = useAuth();
  const propertyQuery = useProperty(id);
  const property = propertyQuery.data;
  const wide = width >= 900;
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(() => Math.max(1, Math.min(width - 32, 760)));
  const [guestFavorite, setGuestFavorite] = useState(false);
  const favorites = useQuery({
    queryKey: propertyKeys.favorites(user?.id ?? 'guest'),
    queryFn: () => fetchFavorites(user!.id),
    enabled: Boolean(user),
  });
  const favoriteMutation = useFavoriteMutation(user?.id ?? 'guest');
  const images = useMemo(() => {
    const uniqueImages = Array.from(new Set((property?.imageUrls ?? []).map(normalizeImageUrl)));
    return uniqueImages.length ? uniqueImages : [fallbackImage];
  }, [property?.imageUrls]);
  const openGalleryAt = useCallback((index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  }, []);
  const renderHeroImage = useCallback<ListRenderItem<string>>(
    ({ item, index }) => (
      <HeroSlide
        uri={item}
        index={index}
        total={images.length}
        width={heroWidth}
        title={property?.title ?? ''}
        photosLabel={t('photos')}
        photoLabel={t('photo', { count: String(index + 1) })}
        onOpen={openGalleryAt}
      />
    ),
    [heroWidth, images.length, openGalleryAt, property?.title, t],
  );

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
  const numberLocale = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'es-GQ';
  const price = formatXaf(property.price, undefined, numberLocale);
  const priceUnit = property.priceType === 'per_month' ? copy.perMonth : property.priceType === 'per_night' ? copy.perNight : copy.salePrice;
  const category = property.priceType === 'per_month' ? copy.longTerm : property.priceType === 'per_night' ? copy.shortTerm : copy.sale;
  const legalStatus = property.legalStatus === 'verified' ? copy.verified : property.legalStatus === 'pending' ? copy.pending : copy.restricted;
  const actionLabel = isOwnProperty ? t('editProperty') : property.isOccupied ? t('waitingList') : copy.reserveVisit;
  const contactLabel = conversationId ? t('openConversation') : !isAuthenticated ? t('loginToContact') : copy.contactHost;

  const requestVisit = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
    } else if (isOwnProperty) {
      router.push({ pathname: '/owner/property/[id]', params: { id: property.id } });
    } else if (property.isOccupied) {
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversationId ?? `property-${property.id}` } });
    } else {
      router.push({ pathname: '/visit/[propertyId]', params: { propertyId: property.id } } as unknown as Href);
    }
  };

  const contactHost = () => {
    if (!isAuthenticated) router.push('/(auth)/login');
    else if (isOwnProperty) router.push({ pathname: '/owner/property/[id]', params: { id: property.id } });
    else router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversationId ?? `property-${property.id}` } });
  };

  const toggleFavorite = () => {
    const next = !isFavorite;
    if (!isAuthenticated) setGuestFavorite(next);
    else favoriteMutation.mutate({ propertyId: property.id, favorite: next });
  };

  const shareProperty = () => {
    const webUrl = `https://casaseg.com/${locale}/property/${property.id}`;
    void Share.share({ title: property.title, message: `${property.title}\n${webUrl}`, url: webUrl });
  };

  const openMaps = () => {
    const query = property.coordinates
      ? `${property.coordinates.latitude},${property.coordinates.longitude}`
      : property.location;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  const updateHeroIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setGalleryIndex(Math.min(Math.round(event.nativeEvent.contentOffset.x / heroWidth), images.length - 1));
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: wide ? 52 : 112 + insets.bottom }]}
      >
        <View style={[styles.page, wide && styles.pageWide]}>
          <PropertyNavigation
            palette={palette}
            dark={resolvedMode === 'dark'}
            favorite={isFavorite}
            favoritePending={favoriteMutation.isPending}
            backLabel={t('back')}
            themeLabel={resolvedMode === 'dark' ? copy.light : copy.dark}
            shareLabel={copy.share}
            favoriteLabel={isFavorite ? t('removeFavorite') : t('saveProperty')}
            onBack={() => router.back()}
            onTheme={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
            onShare={shareProperty}
            onFavorite={toggleFavorite}
          />

          <View style={[styles.content, wide && styles.contentWide]}>
            <View style={styles.mainColumn}>
              <View style={styles.intro}>
                <Text selectable style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.rating}>
                    <Star color={colors.warning} fill={colors.warning} size={17} />
                    <Text selectable style={[styles.ratingText, { color: palette.text }]}>{property.rating.toFixed(1)}</Text>
                    <Text selectable style={[styles.reviewCount, { color: palette.textSecondary }]}>({property.reviewCount})</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <MapPin color={palette.textSecondary} size={18} />
                    <Text selectable style={[styles.location, { color: palette.text }]}>{property.location}</Text>
                  </View>
                </View>
                <View style={styles.badgeRow}>
                  {property.isNew && <Badge label={t('newBadge')} backgroundColor={palette.brand} textColor="white" />}
                  <Badge
                    label={property.isOccupied ? t('occupied') : t('available')}
                    backgroundColor={property.isOccupied ? `${colors.warning}20` : `${colors.accent}1C`}
                    textColor={property.isOccupied ? colors.warning : colors.accentDark}
                  />
                </View>
              </View>

              <View
                onLayout={(event) => setHeroWidth(Math.max(1, event.nativeEvent.layout.width))}
                style={[styles.hero, wide && styles.heroWide, { backgroundColor: palette.subtle }]}
              >
                <FlatList
                  data={images}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  keyExtractor={(image) => image}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={updateHeroIndex}
                  renderItem={renderHeroImage}
                />
                <View pointerEvents="none" style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>{galleryIndex + 1} / {images.length}</Text>
                </View>
                {images.length > 1 && (
                  <View pointerEvents="none" style={styles.dots}>
                    {images.map((image, index) => <View key={image} style={[styles.dot, index === galleryIndex && styles.dotActive]} />)}
                  </View>
                )}
              </View>

              <View style={[styles.hostBlock, { borderBottomColor: palette.border }]}>
                <View style={styles.hostCopy}>
                  <Text style={[styles.hostEyebrow, { color: palette.textSecondary }]}>{copy.host}</Text>
                  <Text selectable style={[styles.ownerName, { color: palette.text }]}>{property.ownerName}</Text>
                  <Text style={[styles.propertyFacts, { color: palette.textSecondary }]}>
                    {t('beds', { count: String(property.bedrooms) })} · {t('baths', { count: String(property.bathrooms) })} · {property.area || '—'} m²
                  </Text>
                </View>
                <View>
                  <UserAvatar name={property.ownerName} uri={property.ownerAvatar} size={58} />
                  <View style={[styles.avatarCheck, { borderColor: palette.background }]}><CheckCircle2 color="white" fill={colors.accentDark} size={22} /></View>
                </View>
              </View>

              <View style={[styles.trustList, { borderBottomColor: palette.border }]}>
                <TrustRow icon={<MapPin color={colors.accent} size={23} />} title={copy.excellentLocation} detail={copy.locationDetail} palette={palette} />
                <TrustRow icon={<ShieldCheck color={colors.accent} size={23} />} title={copy.secureBooking} detail={copy.secureBookingDetail} palette={palette} />
                <TrustRow icon={<Clock color={colors.accent} size={23} />} title={copy.fastCommunication} detail={copy.fastCommunicationDetail} palette={palette} />
              </View>

              <Section title={t('description')} palette={palette}>
                <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{property.description || '—'}</Text>
              </Section>

              <Section title={copy.legalTitle} palette={palette}>
                <View style={[styles.infoList, { backgroundColor: palette.subtle }]}>
                  <InfoRow label={copy.registration} value={copy.registrationValue} palette={palette} />
                  <InfoRow label={copy.verification} value={legalStatus} palette={palette} />
                  <InfoRow label={copy.category} value={category} palette={palette} />
                  <InfoRow label={copy.cancellation} value={copy.standard} palette={palette} last />
                </View>
              </Section>

              <Section title={copy.reviews} palette={palette}>
                <View style={[styles.emptyReview, { backgroundColor: palette.subtle }]}>
                  <Star color={colors.warning} fill={property.reviewCount ? colors.warning : 'transparent'} size={25} />
                  <Text selectable style={[styles.body, { color: palette.textSecondary }]}>
                    {property.reviewCount ? `${property.reviewCount} ${copy.reviewsAvailable}` : copy.noReviews}
                  </Text>
                </View>
              </Section>

              <Section title={copy.amenities} palette={palette}>
                {property.amenities.length ? (
                  <View style={styles.amenitiesGrid}>
                    {property.amenities.map((amenity) => (
                      <View key={amenity} style={styles.amenity}>
                        <Sparkles color={colors.accent} size={22} />
                        <Text selectable style={[styles.amenityText, { color: palette.text }]}>{amenity}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.noAmenities}</Text>
                )}
              </Section>

              {!wide && (
                <ReservationCard
                  palette={palette}
                  price={price}
                  priceUnit={priceUnit}
                  rating={property.rating}
                  category={category}
                  available={!property.isOccupied}
                  actionLabel={actionLabel}
                  contactLabel={contactLabel}
                  copy={copy}
                  onAction={requestVisit}
                  onContact={contactHost}
                  onMaps={openMaps}
                />
              )}
            </View>

            {wide && (
              <View style={styles.aside}>
                <ReservationCard
                  palette={palette}
                  price={price}
                  priceUnit={priceUnit}
                  rating={property.rating}
                  category={category}
                  available={!property.isOccupied}
                  actionLabel={actionLabel}
                  contactLabel={contactLabel}
                  copy={copy}
                  onAction={requestVisit}
                  onContact={contactHost}
                  onMaps={openMaps}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!wide && (
        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.ctaPriceBlock}>
            <Text selectable numberOfLines={1} style={[styles.ctaPrice, { color: palette.text }]}>{price}</Text>
            <Text style={[styles.ctaAvailability, { color: palette.textSecondary }]}>{priceUnit}</Text>
          </View>
          <View style={styles.ctaButtonWrap}><PrimaryButton label={actionLabel} onPress={requestVisit} /></View>
        </View>
      )}

      <PropertyGallery
        visible={galleryVisible}
        images={images}
        initialIndex={galleryIndex}
        title={property.title}
        onClose={() => setGalleryVisible(false)}
      />
    </View>
  );
}

function ScreenState({ palette, label, loading, actionLabel, onAction }: { palette: AppPalette; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={[styles.center, { backgroundColor: palette.background }]}>
      {loading && <ActivityIndicator color={palette.brand} size="large" />}
      <Text selectable style={[styles.stateText, { color: palette.text }]}>{label}</Text>
      {actionLabel && onAction && <SecondaryButton label={actionLabel} onPress={onAction} palette={palette} />}
    </View>
  );
}

function PropertyNavigation({
  palette,
  dark,
  favorite,
  favoritePending,
  backLabel,
  themeLabel,
  shareLabel,
  favoriteLabel,
  onBack,
  onTheme,
  onShare,
  onFavorite,
}: {
  palette: AppPalette;
  dark: boolean;
  favorite: boolean;
  favoritePending: boolean;
  backLabel: string;
  themeLabel: string;
  shareLabel: string;
  favoriteLabel: string;
  onBack: () => void;
  onTheme: () => void;
  onShare: () => void;
  onFavorite: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.navigation}>
      <HeaderAction label={backLabel} onPress={onBack} palette={palette} text>
        <ArrowLeft color={palette.text} size={22} />
      </HeaderAction>
      <View style={styles.navigationActions}>
        <HeaderAction label={themeLabel} onPress={onTheme} palette={palette}>
          {dark ? <Sun color={palette.text} size={21} /> : <Moon color={palette.text} size={21} />}
        </HeaderAction>
        <HeaderAction label={shareLabel} onPress={onShare} palette={palette}>
          <Share2 color={palette.text} size={21} />
        </HeaderAction>
        <HeaderAction label={favoriteLabel} onPress={onFavorite} disabled={favoritePending} palette={palette}>
          <Heart color={favorite ? colors.favorite : palette.text} fill={favorite ? colors.favorite : 'transparent'} size={22} />
        </HeaderAction>
      </View>
    </SafeAreaView>
  );
}

function HeaderAction({ label, onPress, disabled, palette, text: withText, children }: { label: string; onPress: () => void; disabled?: boolean; palette: AppPalette; text?: boolean; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.headerAction, withText && styles.headerActionText, { backgroundColor: pressed ? palette.subtle : 'transparent', opacity: disabled ? 0.5 : 1 }]}
    >
      {children}
      {withText && <Text style={[styles.headerActionLabel, { color: palette.text }]}>{label}</Text>}
    </Pressable>
  );
}

function Badge({ label, backgroundColor, textColor }: { label: string; backgroundColor: string; textColor: string }) {
  return <View style={[styles.badge, { backgroundColor }]}><Text style={[styles.badgeText, { color: textColor }]}>{label}</Text></View>;
}

function TrustRow({ icon, title, detail, palette }: { icon: ReactNode; title: string; detail: string; palette: AppPalette }) {
  return (
    <View style={styles.trustRow}>
      <View style={[styles.trustIcon, { backgroundColor: `${colors.accent}14` }]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={[styles.trustTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.caption, { color: palette.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  );
}

function Section({ title, palette, children }: { title: string; palette: AppPalette; children: ReactNode }) {
  return (
    <View style={[styles.section, { borderBottomColor: palette.border }]}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, palette, last }: { label: string; value: string; palette: AppPalette; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text selectable style={[styles.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function PriceRow({ label, value, palette }: { label: string; value: string; palette: AppPalette }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceRowLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.priceRowValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function ReservationCard({
  palette, price, priceUnit, rating, category, available, actionLabel, contactLabel, copy, onAction, onContact, onMaps,
}: {
  palette: AppPalette; price: string; priceUnit: string; rating: number; category: string; available: boolean;
  actionLabel: string; contactLabel: string; copy: Copy; onAction: () => void; onContact: () => void; onMaps: () => void;
}) {
  return (
    <View style={[styles.reservationCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.reservationHeader}>
        <View style={styles.flex}>
          <Text selectable style={[styles.reservationPrice, { color: palette.text }]}>{price}</Text>
          <Text style={[styles.reservationUnit, { color: palette.textSecondary }]}>{priceUnit}</Text>
        </View>
        <View style={styles.rating}>
          <Star color={colors.warning} fill={colors.warning} size={17} />
          <Text style={[styles.ratingText, { color: palette.text }]}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={[styles.priceBreakdown, { borderColor: palette.border }]}>
        <PriceRow label={copy.service} value="0 FCFA" palette={palette} />
        <PriceRow label={copy.cleaning} value="0 FCFA" palette={palette} />
        <PriceRow label={copy.taxes} value="0 FCFA" palette={palette} />
        <PriceRow label={copy.deposit} value="0 FCFA" palette={palette} />
      </View>

      <View style={[styles.bookingFacts, { backgroundColor: palette.subtle }]}>
        <View style={styles.bookingFact}><HomeCheck color={colors.accent} size={20} /><Text style={[styles.bookingFactLabel, { color: palette.textSecondary }]}>{copy.category}</Text><Text style={[styles.bookingFactValue, { color: palette.text }]}>{category}</Text></View>
        <View style={styles.bookingFact}><CheckCircle2 color={available ? colors.success : colors.warning} size={20} /><Text style={[styles.bookingFactLabel, { color: palette.textSecondary }]}>{copy.availability}</Text><Text style={[styles.bookingFactValue, { color: palette.text }]}>{available ? copy.immediate : copy.pending}</Text></View>
        <View style={styles.bookingFact}><Sparkles color={colors.accent} size={20} /><Text style={[styles.bookingFactLabel, { color: palette.textSecondary }]}>{copy.housingState}</Text><Text style={[styles.bookingFactValue, { color: palette.text }]}>{copy.ready}</Text></View>
      </View>

      <PrimaryButton label={actionLabel} onPress={onAction} />
      <SecondaryButton label={contactLabel} onPress={onContact} palette={palette} icon={<Send color={palette.text} size={19} />} />
      <SecondaryButton label={copy.maps} onPress={onMaps} palette={palette} icon={<MapPin color={palette.text} size={19} />} />
      <Text style={[styles.noCharge, { color: palette.textSecondary }]}>{copy.noCharge}</Text>
      <View style={[styles.totalRow, { borderTopColor: palette.border }]}>
        <Text style={[styles.totalLabel, { color: palette.text }]}>{copy.total}</Text>
        <Text selectable style={[styles.totalPrice, { color: palette.text }]}>{price}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <LinearGradient colors={actionGradient} style={styles.primaryGradient}>
        <Text numberOfLines={2} style={styles.primaryText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, palette, icon }: { label: string; onPress: () => void; palette: AppPalette; icon?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, { borderColor: palette.border, backgroundColor: pressed ? palette.subtle : palette.surface }]}
    >
      {icon}
      <Text style={[styles.secondaryText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  pageWide: { maxWidth: 1180, paddingHorizontal: 24 },
  navigation: { minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerAction: { minWidth: touchTarget, minHeight: touchTarget, borderRadius: radius.pill, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerActionText: { paddingHorizontal: 10 },
  headerActionLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  content: { gap: 24 },
  contentWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 28, paddingBottom: 20 },
  mainColumn: { flex: 1, minWidth: 0 },
  intro: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  rating: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  reviewCount: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', fontVariant: ['tabular-nums'] },
  locationRow: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '700', textDecorationLine: 'underline' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  hero: { marginHorizontal: 16, aspectRatio: 1.16, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  heroWide: { aspectRatio: 16 / 10 },
  heroSlide: { height: '100%' },
  heroImage: { width: '100%', height: '100%' },
  imageCounter: { position: 'absolute', right: 14, top: 14, minHeight: 32, borderRadius: radius.pill, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.74)' },
  imageCounterText: { color: 'white', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 13, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.56)' },
  dotActive: { width: 20, backgroundColor: 'white' },
  hostBlock: { marginHorizontal: 16, paddingVertical: 22, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 16 },
  hostCopy: { flex: 1, minWidth: 0, gap: 3 },
  hostEyebrow: { fontSize: 12, lineHeight: 17, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  ownerName: { fontSize: 16, lineHeight: 22, fontWeight: '900' },
  propertyFacts: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  avatarCheck: { position: 'absolute', right: -4, bottom: -3, width: 25, height: 25, borderRadius: 13, borderWidth: 2, backgroundColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  trustList: { marginHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  trustRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 13 },
  trustIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  trustTitle: { fontSize: 14, lineHeight: 20, fontWeight: '900' },
  caption: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  flex: { flex: 1, minWidth: 0 },
  section: { marginHorizontal: 16, paddingVertical: 24, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  sectionTitle: { fontSize: 21, lineHeight: 27, fontWeight: '900', letterSpacing: -0.25 },
  body: { fontSize: 15, lineHeight: 24 },
  infoList: { borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', paddingHorizontal: 14 },
  infoRow: { minHeight: 62, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoLabel: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  infoValue: { maxWidth: '54%', textAlign: 'right', fontSize: 13, lineHeight: 19, fontWeight: '900' },
  emptyReview: { borderRadius: radius.md, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  amenity: { width: '50%', minHeight: 28, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  amenityText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  aside: { width: 356, paddingTop: 8 },
  reservationCard: { marginHorizontal: 16, marginTop: 24, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 18, gap: 14, boxShadow: '0 14px 36px rgba(15,23,42,0.10)' },
  reservationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reservationPrice: { fontSize: 24, lineHeight: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  reservationUnit: { fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  priceBreakdown: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, gap: 9 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceRowLabel: { flex: 1, fontSize: 13, lineHeight: 19 },
  priceRowValue: { fontSize: 13, lineHeight: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bookingFacts: { borderRadius: radius.md, borderCurve: 'continuous', padding: 12, gap: 11 },
  bookingFact: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingFactLabel: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  bookingFactValue: { maxWidth: '42%', textAlign: 'right', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  primaryButton: { minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  primaryGradient: { flex: 1, minHeight: 56, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  secondaryButton: { minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { textAlign: 'center', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  noCharge: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
  totalRow: { minHeight: 52, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalLabel: { flex: 1, fontSize: 15, fontWeight: '900' },
  totalPrice: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  ctaBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 78, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 -8px 24px rgba(15,23,42,0.08)' },
  ctaPriceBlock: { flex: 1, minWidth: 0 },
  ctaPrice: { fontSize: 16, lineHeight: 21, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ctaAvailability: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  ctaButtonWrap: { minWidth: 148, maxWidth: '56%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  stateText: { maxWidth: 420, textAlign: 'center', fontSize: 16, lineHeight: 24, fontWeight: '700' },
});

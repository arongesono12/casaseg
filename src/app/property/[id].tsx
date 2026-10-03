import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PropertyGallery } from "@/components/property/property-gallery";
import {
    AmenityChip,
    Badge,
    FactTile,
    HostCard,
    PrimaryButton,
    SecondaryButton,
    Section,
} from "@/components/property/detail/detail-parts";
import { detailCopy } from "@/components/property/detail/detail-copy";
import { ReservationCard } from "@/components/property/detail/reservation-card";
import {
    ArrowLeft,
    BedDouble,
    Bath,
    Heart,
    MapPin,
    Ruler,
    Share2,
    Star,
} from "@/components/ui/icons";
import { colors, radius, touchTarget, type AppPalette } from "@/constants/theme";
import { propertyKeys } from "@/features/properties/api/property.keys";
import { fetchFavorites } from "@/features/properties/api/property.queries";
import { useProfileId } from "@/features/auth/use-profile-id";
import { amenityLabel } from "@/features/properties/amenities";
import { useFavoriteMutation } from "@/features/properties/hooks/use-favorite-mutation";
import { useProperty } from "@/features/properties/hooks/use-properties";
import { haptics } from "@/lib/haptics";
import { useAuth } from "@/providers/auth-context";
import { useI18n } from "@/providers/i18n-context";
import { useAppTheme } from "@/providers/theme-context";
import { formatXaf } from "@/utils/formatters";

// Escala de espaciado de la pantalla: un solo margen lateral y un solo ritmo
// vertical entre bloques evitan que cada sección invente el suyo.
const gutter = 16;
const blockGap = 28;
const sheetOverlap = 28;

const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
const fallbackImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=82";

function normalizeImageUrl(value?: string) {
  if (!value?.trim()) return fallbackImage;
  if (value.startsWith("//")) return `https:${value}`;
  return value.replace(/^http:/, "https:");
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
  const { id, conversationId } = useLocalSearchParams<{
    id: string;
    conversationId?: string;
  }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { t, locale } = useI18n();
  const copy = detailCopy[locale];
  const { user, isAuthenticated } = useAuth();
  // owner_id guarda el uuid de Supabase; user.id es el id de Clerk.
  const profileId = useProfileId();
  const propertyQuery = useProperty(id);
  const property = propertyQuery.data;
  const wide = width >= 900;
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(() =>
    Math.max(1, wide ? Math.min(width - 48, 760) : width),
  );
  const [guestFavorite, setGuestFavorite] = useState(false);
  const favorites = useQuery({
    queryKey: propertyKeys.favorites(user?.id ?? "guest"),
    queryFn: () => fetchFavorites(user!.id),
    enabled: Boolean(user),
  });
  const favoriteMutation = useFavoriteMutation(user?.id ?? "guest");
  const images = useMemo(() => {
    const uniqueImages = Array.from(
      new Set((property?.imageUrls ?? []).map(normalizeImageUrl)),
    );
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
        title={property?.title ?? ""}
        photosLabel={t("photos")}
        photoLabel={t("photo", { count: String(index + 1) })}
        onOpen={openGalleryAt}
      />
    ),
    [heroWidth, images.length, openGalleryAt, property?.title, t],
  );

  if (propertyQuery.isLoading) {
    return <ScreenState palette={palette} label={t("loading")} loading />;
  }
  if (propertyQuery.isError) {
    return (
      <ScreenState
        palette={palette}
        label={t("propertyLoadError")}
        actionLabel={t("retry")}
        onAction={() => void propertyQuery.refetch()}
      />
    );
  }
  if (!property) {
    return (
      <ScreenState
        palette={palette}
        label={t("notFound")}
        actionLabel={t("back")}
        onAction={() => router.back()}
      />
    );
  }

  const isFavorite = isAuthenticated
    ? (favorites.data?.includes(property.id) ?? false)
    : guestFavorite;
  const isOwnProperty = Boolean(profileId) && profileId === property.ownerId;
  const numberLocale =
    locale === "fr" ? "fr-FR" : locale === "en" ? "en-US" : "es-GQ";
  const price = formatXaf(property.price, undefined, numberLocale);
  const priceUnit =
    property.priceType === "per_month"
      ? copy.perMonth
      : property.priceType === "per_night"
        ? copy.perNight
        : copy.salePrice;
  const category =
    property.priceType === "per_month"
      ? copy.longTerm
      : property.priceType === "per_night"
        ? copy.shortTerm
        : copy.sale;
  const actionLabel = isOwnProperty
    ? t("editProperty")
    : property.isOccupied
      ? t("waitingList")
      : copy.reserveVisit;
  const contactLabel = conversationId
    ? t("openConversation")
    : !isAuthenticated
      ? t("loginToContact")
      : copy.contactHost;

  const requestVisit = () => {
    if (!isAuthenticated) {
      router.push("/(auth)/login");
    } else if (isOwnProperty) {
      router.push({
        pathname: "/owner/property/[id]",
        params: { id: property.id },
      });
    } else if (property.isOccupied) {
      router.push({
        pathname: "/chat/[conversationId]",
        params: { conversationId: conversationId ?? `property-${property.id}` },
      });
    } else {
      router.push({
        pathname: "/visit/[propertyId]",
        params: { propertyId: property.id },
      } as unknown as Href);
    }
  };

  const contactHost = () => {
    if (!isAuthenticated) router.push("/(auth)/login");
    else if (isOwnProperty)
      router.push({
        pathname: "/owner/property/[id]",
        params: { id: property.id },
      });
    else
      router.push({
        pathname: "/chat/[conversationId]",
        params: { conversationId: conversationId ?? `property-${property.id}` },
      });
  };

  const toggleFavorite = () => {
    // Misma respuesta táctil que la tarjeta de propiedad: marcar favorito se
    // sentía distinto según se hiciera desde el listado o desde el detalle.
    const next = !isFavorite;
    haptics.toggle(next);
    if (!isAuthenticated) setGuestFavorite(next);
    else favoriteMutation.mutate({ propertyId: property.id, favorite: next });
  };

  const shareProperty = () => {
    const webUrl = `https://casaseg.com/${locale}/property/${property.id}`;
    void Share.share({
      title: property.title,
      message: `${property.title}\n${webUrl}`,
      url: webUrl,
    });
  };

  const openMaps = () => {
    const query = property.coordinates
      ? `${property.coordinates.latitude},${property.coordinates.longitude}`
      : property.location;
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    );
  };

  const updateHeroIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setGalleryIndex(
      Math.min(
        Math.round(event.nativeEvent.contentOffset.x / heroWidth),
        images.length - 1,
      ),
    );
  };

  const reservationCard = (
    <ReservationCard
      palette={palette}
      price={price}
      priceUnit={priceUnit}
      actionLabel={actionLabel}
      contactLabel={contactLabel}
      copy={copy}
      onAction={requestVisit}
      onContact={contactHost}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: wide ? 52 : 112 + insets.bottom },
        ]}
      >
        <View style={[styles.page, wide && styles.pageWide, wide && { paddingTop: insets.top + 12 }]}>
          <View style={[styles.content, wide && styles.contentWide]}>
            <View style={styles.mainColumn}>
              <View
                onLayout={(event) =>
                  setHeroWidth(Math.max(1, event.nativeEvent.layout.width))
                }
                style={[
                  styles.hero,
                  wide && styles.heroWide,
                  { backgroundColor: palette.subtle },
                ]}
              >
                <FlatList
                  data={images}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  keyExtractor={(image) => image}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={updateHeroIndex}
                  getItemLayout={(_, index) => ({
                    length: heroWidth,
                    offset: heroWidth * index,
                    index,
                  })}
                  renderItem={renderHeroImage}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(15,23,42,0.42)", "transparent"]}
                  style={styles.topShade}
                />
                <HeroControls
                  top={wide ? 14 : insets.top + 8}
                  favorite={isFavorite}
                  favoritePending={favoriteMutation.isPending}
                  backLabel={t("back")}
                  shareLabel={copy.share}
                  favoriteLabel={isFavorite ? t("removeFavorite") : t("saveProperty")}
                  onBack={() => router.back()}
                  onShare={shareProperty}
                  onFavorite={toggleFavorite}
                />
                <View pointerEvents="none" style={[styles.imageCounter, !wide && styles.imageCounterOverSheet]}>
                  <Text style={styles.imageCounterText}>
                    {galleryIndex + 1} / {images.length}
                  </Text>
                </View>
                {images.length > 1 && (
                  <View pointerEvents="none" style={[styles.dots, !wide && styles.dotsOverSheet]}>
                    {images.map((image, index) => (
                      <View
                        key={image}
                        style={[
                          styles.dot,
                          index === galleryIndex && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.sheet,
                  !wide && styles.sheetOverlap,
                  !wide && { backgroundColor: palette.background },
                ]}
              >
                <View style={styles.intro}>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={category}
                      backgroundColor={`${colors.accent}1C`}
                      textColor={colors.accentDark}
                    />
                    {property.isNew && (
                      <Badge
                        label={t("newBadge")}
                        backgroundColor={palette.brand}
                        textColor="white"
                      />
                    )}
                    {property.legalStatus === "verified" && (
                      <Badge
                        label={copy.verified}
                        backgroundColor={`${colors.accent}1C`}
                        textColor={colors.accentDark}
                      />
                    )}
                    <Badge
                      label={property.isOccupied ? t("occupied") : t("available")}
                      backgroundColor={
                        property.isOccupied
                          ? `${colors.warning}20`
                          : `${colors.success}1C`
                      }
                      textColor={
                        property.isOccupied ? colors.warning : colors.success
                      }
                    />
                  </View>
                  <Text selectable style={[styles.title, { color: palette.text }]}>
                    {property.title}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin color={palette.brandIcon} size={18} />
                    <Text
                      selectable
                      numberOfLines={2}
                      style={[styles.location, { color: palette.textSecondary }]}
                    >
                      {property.location}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text
                      selectable
                      numberOfLines={1}
                      style={[styles.price, { color: palette.text }]}
                    >
                      {price}
                    </Text>
                    <Text style={[styles.priceUnit, { color: palette.textSecondary }]}>
                      {priceUnit}
                    </Text>
                  </View>
                </View>

                <View style={styles.facts}>
                  <FactTile
                    icon={BedDouble}
                    value={String(property.bedrooms)}
                    label={copy.bedroomsLabel}
                    palette={palette}
                  />
                  <FactTile
                    icon={Bath}
                    value={String(property.bathrooms)}
                    label={copy.bathroomsLabel}
                    palette={palette}
                  />
                  <FactTile
                    icon={Ruler}
                    value={property.area ? `${property.area} m²` : "—"}
                    label={copy.areaLabel}
                    palette={palette}
                  />
                  <FactTile
                    icon={Star}
                    value={property.rating.toFixed(1)}
                    label={copy.ratingLabel}
                    palette={palette}
                  />
                </View>

                <HostCard
                  palette={palette}
                  name={property.ownerName}
                  avatar={property.ownerAvatar}
                  eyebrow={copy.host}
                  verifiedLabel={copy.hostVerified}
                  contactLabel={contactLabel}
                  onContact={contactHost}
                />

                <Section title={t("description")} palette={palette}>
                  <Text
                    selectable
                    style={[styles.body, { color: palette.textSecondary }]}
                  >
                    {property.description || "—"}
                  </Text>
                </Section>

                <Section title={copy.amenities} palette={palette}>
                  {property.amenities.length ? (
                    <View style={styles.amenitiesGrid}>
                      {property.amenities.map((amenity) => (
                        <AmenityChip
                          key={amenity}
                          amenity={amenity}
                          label={amenityLabel(amenity, locale)}
                          palette={palette}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.body, { color: palette.textSecondary }]}>
                      {copy.noAmenities}
                    </Text>
                  )}
                </Section>

                {/* La dirección ya aparece bajo el título: aquí solo la acción. */}
                <Section title={copy.locationTitle} palette={palette}>
                  <SecondaryButton
                    label={copy.maps}
                    onPress={openMaps}
                    palette={palette}
                    icon={<MapPin color={palette.brandIcon} size={19} />}
                  />
                </Section>
              </View>
            </View>

            {wide && <View style={styles.aside}>{reservationCard}</View>}
          </View>
        </View>
      </ScrollView>

      {!wide && (
        <View
          style={[
            styles.ctaBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.ctaPriceBlock}>
            <Text
              selectable
              numberOfLines={1}
              style={[styles.ctaPrice, { color: palette.text }]}
            >
              {price}
            </Text>
            <Text style={[styles.ctaUnit, { color: palette.textSecondary }]}>
              {priceUnit}
            </Text>
          </View>
          <View style={styles.ctaButtonWrap}>
            <PrimaryButton label={actionLabel} onPress={requestVisit} />
          </View>
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

function ScreenState({
  palette,
  label,
  loading,
  actionLabel,
  onAction,
}: {
  palette: AppPalette;
  label: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.center, { backgroundColor: palette.background }]}>
      {loading && <ActivityIndicator color={palette.brand} size="large" />}
      <Text selectable style={[styles.stateText, { color: palette.text }]}>
        {label}
      </Text>
      {actionLabel && onAction && (
        <SecondaryButton
          label={actionLabel}
          onPress={onAction}
          palette={palette}
        />
      )}
    </View>
  );
}

// Controles flotantes sobre la foto: claros en ambos temas porque se apoyan en
// la imagen, no en el fondo de la pantalla.
function HeroControls({
  top,
  favorite,
  favoritePending,
  backLabel,
  shareLabel,
  favoriteLabel,
  onBack,
  onShare,
  onFavorite,
}: {
  top: number;
  favorite: boolean;
  favoritePending: boolean;
  backLabel: string;
  shareLabel: string;
  favoriteLabel: string;
  onBack: () => void;
  onShare: () => void;
  onFavorite: () => void;
}) {
  return (
    <View style={[styles.controls, { top }]}>
      <GlassButton label={backLabel} onPress={onBack}>
        <ArrowLeft color={colors.text} size={22} />
      </GlassButton>
      <View style={styles.controlsEnd}>
        <GlassButton label={shareLabel} onPress={onShare}>
          <Share2 color={colors.text} size={21} />
        </GlassButton>
        <GlassButton label={favoriteLabel} onPress={onFavorite} disabled={favoritePending}>
          <Heart
            color={favorite ? colors.favorite : colors.text}
            fill={favorite ? colors.favorite : "transparent"}
            size={22}
          />
        </GlassButton>
      </View>
    </View>
  );
}

function GlassButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassButton,
        { opacity: disabled ? 0.6 : pressed ? 0.8 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { width: "100%", maxWidth: 780, alignSelf: "center" },
  pageWide: { maxWidth: 1180, paddingHorizontal: 24 },
  content: { gap: 24 },
  contentWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 28,
    paddingBottom: 20,
  },
  mainColumn: { flex: 1, minWidth: 0 },
  hero: { aspectRatio: 1.05, overflow: "hidden" },
  heroWide: {
    aspectRatio: 16 / 10,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  heroSlide: { height: "100%" },
  heroImage: { width: "100%", height: "100%" },
  topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  controls: {
    position: "absolute",
    left: gutter,
    right: gutter,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlsEnd: { flexDirection: "row", alignItems: "center", gap: 10 },
  glassButton: {
    width: touchTarget - 4,
    height: touchTarget - 4,
    borderRadius: (touchTarget - 4) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    boxShadow: "0 6px 16px rgba(15,23,42,0.18)",
  },
  imageCounter: {
    position: "absolute",
    right: 14,
    bottom: 14,
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.74)",
  },
  // En móvil la hoja de contenido tapa el borde inferior de la foto: se
  // elevan los indicadores para que no queden bajo ella.
  imageCounterOverSheet: { bottom: sheetOverlap + 14 },
  imageCounterText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dotsOverSheet: { bottom: sheetOverlap + 20 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.56)",
  },
  dotActive: { width: 20, backgroundColor: "white" },
  sheet: { paddingHorizontal: gutter, paddingTop: 22, gap: blockGap },
  sheetOverlap: {
    marginTop: -sheetOverlap,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
  },
  intro: { gap: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  location: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  price: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  priceUnit: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  facts: { flexDirection: "row", gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  body: { fontSize: 15, lineHeight: 24 },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    columnGap: 10,
  },
  aside: { width: 356 },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: gutter,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 -8px 24px rgba(15,23,42,0.08)",
  },
  ctaPriceBlock: { flex: 1, minWidth: 0 },
  ctaPrice: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  ctaUnit: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  ctaButtonWrap: { minWidth: 148, maxWidth: "56%" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },
  stateText: {
    maxWidth: 420,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
  },
});

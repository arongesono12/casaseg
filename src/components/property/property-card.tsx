import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, Home, Star } from '@/components/ui/icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { iconRipple, usesRipple } from '@/lib/press-feedback';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import type { Property } from '@/types';
import { formatXaf } from '@/utils/formatters';

const blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
const MAX_DOTS = 5;

function normalizeImageUrl(value: string) {
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

type PropertyCardProps = { property: Property; compact?: boolean; isFavorite?: boolean; onFavoriteChange?: (propertyId: string, favorite: boolean) => void };
type PropertyImageItem = { id: string; uri: string };

const PropertyCardImage = memo(function PropertyCardImage({ image, width, height, title }: { image: PropertyImageItem; width: number; height: number; title: string }) {
  const { t } = useI18n();
  return (
    <Image
      source={{ uri: normalizeImageUrl(image.uri) }}
      placeholder={{ blurhash }}
      cachePolicy="disk"
      contentFit="cover"
      transition={180}
      style={{ width, height }}
      accessibilityLabel={t('propertyImageLabel', { title })}
    />
  );
});

/** Tarjeta del rediseño B: la foto manda, el texto va debajo sin caja. */
function PropertyCardComponent({ property, compact = false, isFavorite, onFavoriteChange }: PropertyCardProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const [activeImage, setActiveImage] = useState(0);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const images = useMemo<PropertyImageItem[]>(() => {
    const uniqueUrls = Array.from(new Set(property.imageUrls.filter((uri) => uri.trim())));
    return uniqueUrls.map((uri) => ({ id: uri, uri }));
  }, [property.imageUrls]);

  const isSaved = isFavorite ?? false;
  const amount = formatXaf(property.price, undefined, locale);
  const unit = formatXaf(property.price, property.priceType, locale).slice(amount.length);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!frame.width) return;
    setActiveImage(Math.round(event.nativeEvent.contentOffset.x / frame.width));
  }, [frame.width]);

  const toggleSaved = useCallback(() => {
    if (!onFavoriteChange) {
      router.push('/(auth)/login');
      return;
    }
    const next = !isSaved;
    haptics.toggle(next);
    onFavoriteChange(property.id, next);
  }, [isSaved, onFavoriteChange, property.id, router]);

  const renderImage = useCallback<ListRenderItem<PropertyImageItem>>(
    ({ item }) => <PropertyCardImage image={item} width={frame.width} height={frame.height} title={property.title} />,
    [frame.height, frame.width, property.title],
  );

  // El corazón va fuera del Pressable de la tarjeta, superpuesto: anidar un
  // botón dentro de otro es HTML inválido en web y confunde a los lectores de pantalla.
  return (
    <View style={styles.cardShell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('viewProperty', { title: property.title })}
        onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View
          style={[styles.imageFrame, compact && styles.imageFrameCompact, { backgroundColor: palette.subtle }]}
          onLayout={(event) => setFrame({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
        >
          {images.length === 0 ? (
            <View style={styles.noPhoto} accessibilityLabel={t('noPhotos')}>
              <Home color={palette.brandIcon} size={32} />
              <Text style={[styles.noPhotoText, { color: palette.textSecondary }]}>{t('noPhotos')}</Text>
            </View>
          ) : frame.width > 0 && (
            <FlatList
              data={images}
              style={StyleSheet.absoluteFill}
              horizontal
              pagingEnabled
              bounces={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={onMomentumScrollEnd}
              showsHorizontalScrollIndicator={false}
              renderItem={renderImage}
            />
          )}

          <View pointerEvents="none" style={styles.pill}>
            <LegalPill status={property.legalStatus} labels={{ verified: t('legalVerified'), pending: t('legalPending'), restricted: t('legalRestricted') }} />
          </View>

          {images.length > 1 && (
            <View pointerEvents="none" style={styles.dots}>
              {images.slice(0, MAX_DOTS).map((image, index) => <View key={image.id} style={[styles.dot, index === Math.min(activeImage, MAX_DOTS - 1) && styles.dotActive]} />)}
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{property.title}</Text>
            <View style={styles.rating}>
              <Star color={palette.text} fill={palette.text} size={13} />
              <Text style={[styles.meta, compact && styles.metaCompact, { color: palette.text }]}>{property.rating.toFixed(1)}{property.reviewCount ? ` (${property.reviewCount})` : ''}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.meta, compact && styles.metaCompact, { color: palette.textSecondary }]}>
            {t('beds', { count: String(property.bedrooms) })} · {t('baths', { count: String(property.bathrooms) })} · {property.area} m²
          </Text>
          {!compact && <Text numberOfLines={1} style={[styles.meta, { color: palette.textSecondary }]}>{property.location}</Text>}
          <Text numberOfLines={1} style={[styles.meta, styles.price, compact && styles.metaCompact, { color: palette.text }]}>
            <Text style={styles.priceAmount}>{amount}</Text>{unit}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={!onFavoriteChange ? `${t('saveProperty')}. ${t('signIn')}` : isSaved ? t('removeFavorite') : t('saveProperty')}
        accessibilityState={{ selected: isSaved }}
        android_ripple={iconRipple(48)}
        onPress={toggleSaved}
        style={({ pressed }) => [styles.favorite, { opacity: pressed && !usesRipple ? 0.7 : 1 }]}
      >
        {/* Corazón blanco con relleno translúcido: se lee sobre fotos claras y oscuras. */}
        <Heart color="white" fill={isSaved ? colors.favorite : 'rgba(15,23,42,0.38)'} size={27} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

const styles = StyleSheet.create({
  cardShell: { position: 'relative' },
  card: { gap: 12 },
  imageFrame: { width: '100%', aspectRatio: 20 / 19, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  imageFrameCompact: { aspectRatio: 1 },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noPhotoText: { fontSize: 13, fontFamily: fontFamily.medium },
  pill: { position: 'absolute', left: 12, top: 12 },
  favorite: { position: 'absolute', right: 4, top: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', alignSelf: 'center', bottom: 12, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { backgroundColor: 'white' },
  summary: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: fontFamily.semibold },
  titleCompact: { fontSize: 15, lineHeight: 20 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21, fontVariant: ['tabular-nums'] },
  metaCompact: { fontSize: 13, lineHeight: 18 },
  price: { marginTop: 4 },
  priceAmount: { fontFamily: fontFamily.bold },
});

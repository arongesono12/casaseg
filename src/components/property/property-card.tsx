import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, MapPin, Star } from '@/components/ui/icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, touchTarget } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { pressRipple, usesRipple } from '@/lib/press-feedback';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import type { Property } from '@/types';
import { formatXaf } from '@/utils/formatters';

const blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
const fallbackImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

function normalizeImageUrl(value?: string) {
  if (!value?.trim()) return fallbackImage;
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

type PropertyCardProps = { property: Property; compact?: boolean; isFavorite?: boolean; onFavoriteChange?: (propertyId: string, favorite: boolean) => void };
type PropertyImageItem = { id: string; uri: string };

const PropertyCardImage = memo(function PropertyCardImage({ image, imageWidth, title }: { image: PropertyImageItem; imageWidth: number; title: string }) {
  const { t } = useI18n();
  return (
    <Image
      source={{ uri: normalizeImageUrl(image.uri) }}
      placeholder={{ blurhash }}
      cachePolicy="disk"
      contentFit="cover"
      transition={180}
      style={[styles.carouselImage, { width: imageWidth }]}
      accessibilityLabel={t('propertyImageLabel', { title })}
    />
  );
});

function PropertyCardComponent({ property, compact = false, isFavorite, onFavoriteChange }: PropertyCardProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const [localSaved, setLocalSaved] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const images = useMemo<PropertyImageItem[]>(() => {
    const uniqueUrls = Array.from(new Set(property.imageUrls.length ? property.imageUrls : [fallbackImage]));
    return uniqueUrls.map((uri) => ({ id: uri, uri }));
  }, [property.imageUrls]);

  const isSaved = isFavorite ?? localSaved;

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!imageWidth) return;
    setActiveImage(Math.round(event.nativeEvent.contentOffset.x / imageWidth));
  }, [imageWidth]);

  const toggleSaved = useCallback(async () => {
    const next = !isSaved;
    haptics.toggle(next);
    if (isFavorite === undefined) setLocalSaved(next);
    onFavoriteChange?.(property.id, next);
  }, [isFavorite, isSaved, onFavoriteChange, property.id]);

  const renderImage = useCallback<ListRenderItem<PropertyImageItem>>(
    ({ item }) => <PropertyCardImage image={item} imageWidth={imageWidth} title={property.title} />,
    [imageWidth, property.title],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('viewProperty', { title: property.title })}
      onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.994 : 1 }] }]}
    >
      <View style={[styles.imageFrame, compact && styles.imageFrameCompact]} onLayout={compact ? undefined : (event) => setImageWidth(event.nativeEvent.layout.width)}>
        {compact ? (
          <Image source={{ uri: normalizeImageUrl(images[0].uri) }} placeholder={{ blurhash }} cachePolicy="disk" contentFit="cover" transition={180} style={styles.compactImage} accessibilityLabel={t('propertyImageLabel', { title: property.title })} />
        ) : imageWidth > 0 && (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            bounces={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={onMomentumScrollEnd}
            showsHorizontalScrollIndicator={false}
            renderItem={renderImage}
          />
        )}
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.42)']} style={styles.imageShade} pointerEvents="none" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('removeFavorite') : t('saveProperty')}
          hitSlop={compact ? 8 : 4}
          android_ripple={pressRipple}
          onPress={(event) => { event.stopPropagation(); void toggleSaved(); }}
          style={({ pressed }) => [styles.favorite, compact && styles.favoriteCompact, { opacity: pressed && !usesRipple ? 0.78 : 1 }]}
        >
          <Heart color={isSaved ? colors.favorite : colors.text} fill={isSaved ? colors.favorite : 'transparent'} size={compact ? 18 : 22} strokeWidth={2.2} />
        </Pressable>

        {!compact && images.length > 1 && (
          <View style={styles.dots}>
            {images.map((image, index) => <View key={image.id} style={[styles.dot, index === activeImage && styles.dotActive]} />)}
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <View style={styles.titleRow}>
          <Text numberOfLines={compact ? 2 : 1} style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{property.title}</Text>
          <View style={styles.rating}><Star color={colors.warning} fill={colors.warning} size={compact ? 13 : 16} /><Text style={[styles.ratingText, compact && styles.ratingTextCompact, { color: palette.text }]}>{property.rating.toFixed(1)}</Text></View>
        </View>
        <View style={styles.metaRow}><MapPin color={palette.textSecondary} size={compact ? 14 : 17} /><Text numberOfLines={1} style={[styles.location, compact && styles.locationCompact, { color: palette.textSecondary }]}>{property.location}</Text></View>
        <Text numberOfLines={compact ? 1 : undefined} style={[styles.price, compact && styles.priceCompact, { color: palette.text }]}>{formatXaf(property.price, property.priceType, locale)}</Text>
      </View>
    </Pressable>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

const styles = StyleSheet.create({
  card: { gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 8, boxShadow: '0 10px 26px rgba(15,23,42,0.07)' },
  cardCompact: { gap: 7, borderWidth: 0, borderRadius: 0, padding: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  imageFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.subtle },
  imageFrameCompact: { aspectRatio: 1.08, borderRadius: radius.sm },
  carouselImage: { height: '100%' },
  compactImage: { width: '100%', height: '100%' },
  imageShade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '55%' },
  favorite: { position: 'absolute', right: 12, top: 12, width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', overflow: 'hidden' },
  favoriteCompact: { right: 6, top: 6, width: 44, height: 44, borderRadius: 22 },
  dots: { position: 'absolute', alignSelf: 'center', bottom: 16, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 16, backgroundColor: 'white' },
  summary: { paddingHorizontal: 2, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  titleCompact: { fontSize: 14, lineHeight: 19 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ratingTextCompact: { fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { flex: 1, fontSize: 14, lineHeight: 20 },
  locationCompact: { fontSize: 12, lineHeight: 17 },
  price: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  priceCompact: { fontSize: 14, lineHeight: 19 },
});

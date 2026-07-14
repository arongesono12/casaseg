import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bath, BedDouble, Camera, Heart, MapPin, Maximize2, Star } from '@/components/ui/icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';
import { useI18n } from '@/providers/i18n-provider';
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

function PropertyCardComponent({ property, compact = false, isFavorite, onFavoriteChange }: PropertyCardProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [localSaved, setLocalSaved] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const images = useMemo(() => (property.imageUrls.length ? property.imageUrls : [fallbackImage]), [property.imageUrls]);

  const isSaved = isFavorite ?? localSaved;

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!imageWidth) return;
    setActiveImage(Math.round(event.nativeEvent.contentOffset.x / imageWidth));
  }, [imageWidth]);

  const toggleSaved = useCallback(async () => {
    if (Platform.OS !== 'web') await Haptics.selectionAsync();
    const next = !isSaved;
    if (isFavorite === undefined) setLocalSaved(next);
    onFavoriteChange?.(property.id, next);
  }, [isFavorite, isSaved, onFavoriteChange, property.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('viewProperty', { title: property.title })}
      onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, { opacity: pressed ? 0.96 : 1 }]}
    >
      <View style={[styles.imageFrame, compact && styles.imageFrameCompact]} onLayout={(event) => setImageWidth(event.nativeEvent.layout.width)}>
        {imageWidth > 0 && (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            bounces={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={onMomentumScrollEnd}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image
                source={{ uri: normalizeImageUrl(item) }}
                placeholder={{ blurhash }}
                cachePolicy="disk"
                contentFit="cover"
                transition={180}
                style={{ width: imageWidth, height: '100%' }}
                accessibilityLabel={`${property.title}, imagen de la propiedad`}
              />
            )}
          />
        )}
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.42)']} style={styles.imageShade} pointerEvents="none" />

        {property.isNew && (
          <LinearGradient colors={[colors.brand, colors.primary]} style={styles.statusBadge}>
            <Text style={styles.statusText}>{t('newBadge')}</Text>
          </LinearGradient>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('removeFavorite') : t('saveProperty')}
          hitSlop={4}
          onPress={(event) => { event.stopPropagation(); void toggleSaved(); }}
          style={({ pressed }) => [styles.favorite, compact && styles.favoriteCompact, { opacity: pressed ? 0.78 : 1 }]}
        >
          <Heart color={isSaved ? colors.favorite : colors.text} fill={isSaved ? colors.favorite : 'transparent'} size={compact ? 18 : 22} strokeWidth={2.2} />
        </Pressable>

        {!compact && <View style={styles.counter}>
          <Camera color="white" size={14} />
          <Text style={styles.counterText}>{activeImage + 1} / {images.length}</Text>
        </View>}

        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, index) => <View key={index} style={[styles.dot, index === activeImage && styles.dotActive]} />)}
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <View style={styles.titleRow}>
          <Text numberOfLines={compact ? 2 : 1} style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{property.title}</Text>
          {!compact && <View style={styles.rating}><Star color={colors.warning} fill={colors.warning} size={16} /><Text style={[styles.ratingText, { color: palette.text }]}>{property.rating.toFixed(1)}</Text></View>}
        </View>
        <View style={styles.metaRow}><MapPin color={palette.textSecondary} size={compact ? 14 : 17} /><Text numberOfLines={1} style={[styles.location, compact && styles.locationCompact, { color: palette.textSecondary }]}>{property.location}</Text></View>
        {!compact && <View style={[styles.features, { borderColor: palette.border }]}>
          <View style={styles.feature}><BedDouble color={palette.textSecondary} size={18} /><Text style={[styles.featureText, { color: palette.textSecondary }]}>{property.bedrooms} hab</Text></View>
          <View style={[styles.feature, styles.featureDivider, { borderColor: palette.border }]}><Bath color={palette.textSecondary} size={18} /><Text style={[styles.featureText, { color: palette.textSecondary }]}>{property.bathrooms} baños</Text></View>
          <View style={[styles.feature, styles.featureDivider, { borderColor: palette.border }]}><Maximize2 color={palette.textSecondary} size={17} /><Text style={[styles.featureText, { color: palette.textSecondary }]}>{property.area} m²</Text></View>
        </View>}
        <Text numberOfLines={compact ? 1 : undefined} style={[styles.price, compact && styles.priceCompact, { color: palette.text }]}>{formatXaf(property.price, property.priceType)}</Text>
      </View>
    </Pressable>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

const styles = StyleSheet.create({
  card: { gap: 12 },
  cardCompact: { gap: 8 },
  imageFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.subtle },
  imageFrameCompact: { borderRadius: radius.md },
  imageShade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '55%' },
  statusBadge: { position: 'absolute', left: 12, top: 12, minHeight: 28, borderRadius: radius.pill, paddingHorizontal: 12, justifyContent: 'center' },
  statusText: { color: 'white', fontSize: 12, fontWeight: '800' },
  favorite: { position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  favoriteCompact: { right: 8, top: 8, width: 36, height: 36, borderRadius: 18 },
  counter: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: 'rgba(15,23,42,0.64)' },
  counterText: { color: 'white', fontSize: 12, fontWeight: '700' },
  dots: { position: 'absolute', alignSelf: 'center', bottom: 16, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 16, backgroundColor: 'white' },
  summary: { paddingHorizontal: 2, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  titleCompact: { fontSize: 14, lineHeight: 18 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { flex: 1, fontSize: 14, lineHeight: 20 },
  locationCompact: { fontSize: 12, lineHeight: 16 },
  features: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  featureDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  featureText: { fontSize: 13, fontWeight: '600' },
  price: { fontSize: 19, lineHeight: 25, fontWeight: '900' },
  priceCompact: { fontSize: 14, lineHeight: 19 },
});

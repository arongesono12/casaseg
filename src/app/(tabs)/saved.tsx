import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';
import { PropertyCard } from '@/components/property/property-card';
import { Heart, Home, Sparkles } from '@/components/ui/icons';
import { HeroBadge, PremiumEmptyState, PremiumErrorState, PremiumHero } from '@/components/ui/premium';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useFavoritesUserId } from '@/features/properties/hooks/use-favorites-user-id';
import { responsiveGridColumns } from '@/lib/responsive-grid';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { defaultPropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';

const MAX_CONTENT_WIDTH = 720;
const LIST_PADDING = 16;
const GRID_GAP = 12;

function PropertySeparator() {
  return <View style={styles.separator} />;
}

export default function SavedScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const { t } = useI18n();
  const { width, fontScale } = useWindowDimensions();
  const columns = responsiveGridColumns(width, MAX_CONTENT_WIDTH, LIST_PADDING, GRID_GAP, fontScale, 3);
  // Ancho fijo por celda: con flex:1 una última fila de un solo elemento se estiraría a todo el ancho.
  const itemWidth = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - LIST_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);
  const favoritesUserId = useFavoritesUserId();
  const userId = favoritesUserId ?? 'guest';
  const favorites = useQuery({ queryKey: propertyKeys.favorites(userId), queryFn: () => fetchFavorites(userId), enabled: Boolean(favoritesUserId) });
  const properties = useProperties(defaultPropertyFilters);
  const mutation = useFavoriteMutation(userId);
  const favoriteIds = useMemo(() => new Set(favorites.data ?? []), [favorites.data]);
  const saved = useMemo(() => (properties.data ?? []).filter((property) => favoriteIds.has(property.id)), [favoriteIds, properties.data]);
  const handleFavoriteChange = useCallback((propertyId: string, favorite: boolean) => mutation.mutate({ propertyId, favorite }), [mutation]);
  const renderProperty = useCallback<ListRenderItem<Property>>(
    ({ item }) => (
      <View style={[styles.gridItem, { width: itemWidth }]}>
        <PropertyCard compact={columns > 1} property={item} isFavorite onFavoriteChange={handleFavoriteChange} />
      </View>
    ),
    [columns, handleFavoriteChange, itemWidth],
  );

  const listHeader = (
    <View style={styles.header} onLayout={onHeroLayout}>
      <PremiumHero
        title={t('saved')}
        description={t('savedSubtitle')}
        eyebrow={t('savedEyebrow')}
        icon={Heart}
        bleed={{ topInset: insets.top }}
        accessory={saved.length ? <HeroBadge label={t('savedCount', { count: String(saved.length) })} icon={Heart} /> : undefined}
      />
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
        <HeroStatusBar pastHero={false} />
        <ScrollView contentContainerStyle={[styles.guestScroll, Platform.OS === 'android' && styles.androidScrollEnd]} showsVerticalScrollIndicator={false}>
          <PremiumHero title={t('saved')} description={t('savedSubtitle')} eyebrow={t('savedEyebrow')} icon={Heart} bleed={{ topInset: insets.top }} />
          <View style={styles.guestContent}>
            <PremiumEmptyState icon={Heart} title={t('savedGuestTitle')} description={t('savedGuestBody')} actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isLoading = favorites.isLoading || properties.isLoading;
  const isError = favorites.isError || properties.isError;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <HeroStatusBar pastHero={pastHero} />
      <FlatList
        key={`saved-grid-${columns}`}
        data={isLoading || isError ? [] : saved}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={[styles.list, Platform.OS === 'android' && styles.androidScrollEnd]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderProperty}
        ItemSeparatorComponent={PropertySeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={isLoading
          ? <PremiumEmptyState icon={Sparkles} title={t('savedLoadingTitle')} description={t('savedLoadingBody')} loading />
          : isError
            ? <PremiumErrorState title={t('savedErrorTitle')} description={t('savedErrorBody')} onRetry={() => { void favorites.refetch(); void properties.refetch(); }} />
            : <PremiumEmptyState icon={Home} title={t('noSaved')} description={t('saveHint')} actionLabel={t('exploreProperties')} onAction={() => router.push('/(tabs)/explore')} />}
        showsVerticalScrollIndicator={false}
      />
      {pastHero && <StatusBarScrim />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: LIST_PADDING, paddingBottom: 130, gap: 0 },
  guestScroll: { flexGrow: 1, paddingBottom: 100 },
  // NativeTabs ya reserva el área segura de la barra inferior en Android.
  androidScrollEnd: { paddingBottom: 24 },
  guestContent: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingTop: 20, gap: 20 },
  // A sangre: anula el padding lateral de la lista para ocupar todo el ancho.
  header: { marginHorizontal: -LIST_PADDING, paddingBottom: 20 },
  gridRow: { gap: GRID_GAP },
  gridItem: { minWidth: 0 },
  separator: { height: 18 },
});

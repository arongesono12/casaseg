import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreMenu } from '@/components/explore-menu';
import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyCard } from '@/components/property/property-card';
import { BedDouble, Building2, Grid2X2, Home, Map, Menu, MessageCircle, Search, Sparkles } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState } from '@/components/ui/premium';
import { actionGradient, colors, fontFamily, radius, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useFavoritesUserId } from '@/features/properties/hooks/use-favorites-user-id';
import { useInfiniteProperties, usePropertyCount } from '@/features/properties/hooks/use-properties';
import { haptics } from '@/lib/haptics';
import { iconRipple, onBrandRipple, pressRipple, rippleClip, usesRipple } from '@/lib/press-feedback';
import { responsiveGridColumns } from '@/lib/responsive-grid';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';
import { useExplorerStore } from '@/stores/explorer-store';
import type { Property } from '@/types';

const categoryKeys = ['Todos', 'Apartamentos', 'Casas', 'Estudios'] as const;
type CategoryKey = (typeof categoryKeys)[number];
const categoryIcons = { Todos: Grid2X2, Apartamentos: Building2, Casas: Home, Estudios: BedDouble } as const;

const MAX_CONTENT_WIDTH = 1180;
const LIST_PADDING = 20;
const GRID_GAP = 16;

/** Pestaña de categoría del rediseño B: icono sobre la etiqueta y subrayado de marca. */
const CategoryTab = memo(function CategoryTab({ category, label, selected, palette, onSelect }: { category: CategoryKey; label: string; selected: boolean; palette: AppPalette; onSelect: (category: CategoryKey) => void }) {
  const Icon = categoryIcons[category];
  const handlePress = () => {
    haptics.selection();
    onSelect(category);
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      android_ripple={pressRipple}
      onPress={handlePress}
      style={({ pressed }) => [styles.category, { borderBottomColor: selected ? palette.brandIcon : 'transparent' }, pressed && !usesRipple && styles.pressed]}>
      <Icon color={selected ? palette.text : palette.textSecondary} size={24} />
      <Text numberOfLines={1} style={[styles.categoryText, { color: selected ? palette.text : palette.textSecondary }, selected && styles.categoryTextSelected]}>{label}</Text>
    </Pressable>
  );
});

const PropertyGridCard = memo(function PropertyGridCard({ property, compact, favorite, itemWidth, onFavoriteChange }: { property: Property; compact: boolean; favorite: boolean; itemWidth: number; onFavoriteChange?: (propertyId: string, favorite: boolean) => void }) {
  return (
    <View style={[styles.gridItem, { width: itemWidth }]}>
      <PropertyCard compact={compact} property={property} isFavorite={favorite} onFavoriteChange={onFavoriteChange} />
    </View>
  );
});

function PropertySeparator() {
  return <View style={styles.separator} />;
}

export default function ExploreScreen() {
  const router = useRouter();
  const sheetRef = useRef<FilterSheetHandle>(null);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { width, fontScale } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { messageUnreadCount } = useNotifications();
  const unreadLabel = messageUnreadCount > 99 ? '99+' : String(messageUnreadCount);
  const columns = responsiveGridColumns(width, MAX_CONTENT_WIDTH, LIST_PADDING, GRID_GAP, fontScale, 4);
  const useCompactCards = columns > 1;
  // Ancho fijo por celda: con flex:1 una última fila de un solo elemento se estiraría a todo el ancho.
  const itemWidth = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - LIST_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);
  const filters = useExplorerStore((state) => state.filters);
  const setCategory = useExplorerStore((state) => state.setCategory);
  const setViewMode = useExplorerStore((state) => state.setViewMode);
  const propertyQuery = useInfiniteProperties(filters);
  const propertyCountQuery = usePropertyCount(filters);
  const favoritesUserId = useFavoritesUserId();
  const favoritesQuery = useQuery({ queryKey: propertyKeys.favorites(favoritesUserId ?? 'guest'), queryFn: () => fetchFavorites(favoritesUserId!), enabled: Boolean(favoritesUserId) });
  const favoriteMutation = useFavoriteMutation(favoritesUserId ?? 'guest');
  const properties = useMemo(() => propertyQuery.data?.pages.flatMap((page) => page.items) ?? [], [propertyQuery.data?.pages]);

  const categoryLabels = useMemo<Record<CategoryKey, string>>(
    () => ({ Todos: t('all'), Apartamentos: t('apartments'), Casas: t('houses'), Estudios: t('studios') }),
    [t],
  );
  const favoriteIds = useMemo(() => new Set(favoritesQuery.data ?? []), [favoritesQuery.data]);
  const handleFavoriteChange = useCallback((propertyId: string, favorite: boolean) => favoriteMutation.mutate({ propertyId, favorite }), [favoriteMutation]);
  const renderProperty = useCallback<ListRenderItem<Property>>(
    ({ item }) => <PropertyGridCard property={item} compact={useCompactCards} favorite={favoriteIds.has(item.id)} itemWidth={itemWidth} onFavoriteChange={user ? handleFavoriteChange : undefined} />,
    [favoriteIds, handleFavoriteChange, itemWidth, useCompactCards, user],
  );
  const openMap = useCallback(() => {
    setViewMode('map');
    router.push('/map');
  }, [router, setViewMode]);
  const loadNextPage = useCallback(() => {
    if (propertyQuery.hasNextPage && !propertyQuery.isFetchingNextPage) void propertyQuery.fetchNextPage();
  }, [propertyQuery]);

  const searchSummary = filters.location || filters.name;
  const count = propertyCountQuery.data;
  // La barra de pestañas nativa de iOS es translúcida y el contenido pasa por debajo.
  const mapBottom = Platform.OS === 'ios' ? insets.bottom + 64 : 20;

  return (
    <SafeAreaView collapsable={false} edges={['top']} style={[styles.safe, { backgroundColor: palette.surface }]}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.searchRow}>
            <Pressable
              accessibilityLabel={`${t('searchTitle')}: ${searchSummary || t('whereToLive')}`}
              accessibilityRole="button"
              android_ripple={pressRipple}
              onPress={() => sheetRef.current?.present()}
              style={({ pressed }) => [styles.search, rippleClip, { backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}
            >
              <Search color={palette.text} size={20} />
              <View style={styles.searchCopy}>
                <Text numberOfLines={1} style={[styles.searchTitle, { color: palette.text }]}>{searchSummary || t('whereToLive')}</Text>
                <Text numberOfLines={1} style={[styles.searchDetail, { color: palette.textSecondary }]}>
                  {count === undefined ? t('searchSubtitle') : `${count} ${t('properties')} · ${t('sort')}`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={messageUnreadCount > 0 ? `${t('messages')}, ${t('unreadCount', { count: unreadLabel })}` : t('messages')}
              accessibilityRole="button"
              android_ripple={iconRipple(48)}
              onPress={() => router.push('/(tabs)/messages')}
              style={({ pressed }) => [styles.menuButton, { borderColor: palette.border, backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}
            >
              <MessageCircle color={palette.text} size={21} />
              {messageUnreadCount > 0 ? (
                <View pointerEvents="none" style={[styles.badge, { borderColor: palette.surface }]}>
                  <Text style={styles.badgeText}>{unreadLabel}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityLabel={t('menu')}
              accessibilityRole="button"
              accessibilityState={{ expanded: isMenuOpen }}
              android_ripple={iconRipple(48)}
              onPress={() => setIsMenuOpen(true)}
              style={({ pressed }) => [styles.menuButton, { borderColor: palette.border, backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}
            >
              <Menu color={palette.text} size={21} />
            </Pressable>
          </View>
          <View accessibilityRole="tablist" style={styles.categories}>
            {categoryKeys.map((category) => (
              <CategoryTab key={category} category={category} label={categoryLabels[category]} selected={category === filters.category} palette={palette} onSelect={setCategory} />
            ))}
          </View>
        </View>
      </View>

      <FlatList<Property>
        key={`explore-grid-${columns}`}
        data={properties}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        ItemSeparatorComponent={PropertySeparator}
        ListEmptyComponent={propertyQuery.isLoading
          ? <PremiumEmptyState icon={Sparkles} title={t('exploreLoadingTitle')} description={t('exploreLoadingBody')} loading />
          : propertyQuery.isError
            ? <PremiumErrorState title={t('exploreErrorTitle')} description={t('propertyLoadError')} onRetry={() => void propertyQuery.refetch()} />
            : <PremiumEmptyState icon={Home} title={t('exploreEmptyTitle')} description={t('noPropertyResults')} actionLabel={t('changeFilters')} onAction={() => sheetRef.current?.present()} />}
        ListFooterComponent={propertyQuery.isFetchingNextPage ? <View style={styles.pageLoader}><ActivityIndicator color={palette.brandIcon} /><Text style={[styles.pageLoaderText, { color: palette.textSecondary }]}>{t('loadingMoreProperties')}</Text></View> : null}
        contentContainerStyle={[styles.listContent, { backgroundColor: palette.surface }]}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.45}
        onRefresh={() => void propertyQuery.refetch()}
        refreshing={propertyQuery.isRefetching && !propertyQuery.isFetchingNextPage}
        showsVerticalScrollIndicator={false}
      />

      <Pressable accessibilityLabel={t('map')} accessibilityRole="button" android_ripple={onBrandRipple} onPress={openMap} style={({ pressed }) => [styles.mapButton, { bottom: mapBottom }, pressed && !usesRipple && styles.pressed]}>
        <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.mapGradient}>
          <Text style={styles.mapText}>{t('map')}</Text>
          <Map color={colors.onBrand} size={18} />
        </LinearGradient>
      </Pressable>

      <FilterSheet ref={sheetRef} />
      <ExploreMenu onClose={() => setIsMenuOpen(false)} visible={isMenuOpen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, boxShadow: '0 6px 12px -10px rgba(15,23,42,0.35)', zIndex: 2 },
  headerContent: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: LIST_PADDING, paddingTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { flex: 1, minWidth: 0, height: 60, borderRadius: radius.pill, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, boxShadow: '0 3px 12px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.04)' },
  searchCopy: { flex: 1, minWidth: 0 },
  searchTitle: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bold },
  searchDetail: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 17 },
  menuButton: { width: 48, height: 48, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  // Mismo rojo que la insignia de la pestaña Mensajes.
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.onBrand, fontSize: 11, lineHeight: 13, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  categories: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12 },
  // Cada pestaña crece desde el ancho de su etiqueta: con cuartos iguales «Apartamentos» se cortaba.
  category: { flexGrow: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingBottom: 10, borderBottomWidth: 2, overflow: 'hidden' },
  categoryText: { fontSize: 12, fontFamily: fontFamily.medium },
  categoryTextSelected: { fontFamily: fontFamily.bold },
  listContent: { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: LIST_PADDING, paddingTop: 20, paddingBottom: 140 },
  gridRow: { gap: GRID_GAP },
  gridItem: { minWidth: 0 },
  separator: { height: 28 },
  pageLoader: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageLoaderText: { fontSize: 13, fontFamily: fontFamily.semibold },
  mapButton: { position: 'absolute', alignSelf: 'center', borderRadius: radius.pill, overflow: 'hidden', boxShadow: '0 6px 16px rgba(15,23,42,0.28)' },
  mapGradient: { height: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapText: { color: colors.onBrand, fontSize: 15, fontFamily: fontFamily.bold },
  pressed: { opacity: 0.78 },
});

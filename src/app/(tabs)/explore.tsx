import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExploreMenu } from '@/components/explore-menu';
import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyCard } from '@/components/property/property-card';
import { BedDouble, Building2, ChevronDown, Grid2X2, Home, Map, Menu, Search, Sparkles } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState } from '@/components/ui/premium';
import { colors, exploreGradient, radius, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useInfiniteProperties, usePropertyCount } from '@/features/properties/hooks/use-properties';
import { haptics } from '@/lib/haptics';
import { onBrandRipple, pressRipple, rippleClip, usesRipple } from '@/lib/press-feedback';
import { responsiveGridColumns } from '@/lib/responsive-grid';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { useExplorerStore } from '@/stores/explorer-store';
import type { Property } from '@/types';

const categoryKeys = ['Todos', 'Apartamentos', 'Casas', 'Estudios'] as const;
type CategoryKey = (typeof categoryKeys)[number];

const HERO_COLLAPSE_DISTANCE = 140;
const MAX_CONTENT_WIDTH = 1180;
const LIST_PADDING = 12;
const GRID_GAP = 12;

const CategoryChip = memo(function CategoryChip({ category, label, selected, palette, onSelect }: { category: CategoryKey; label: string; selected: boolean; palette: AppPalette; onSelect: (category: CategoryKey) => void }) {
  const Icon = category === 'Todos' ? Grid2X2 : category === 'Apartamentos' ? Building2 : category === 'Casas' ? Home : BedDouble;
  const handlePress = () => {
    haptics.selection();
    onSelect(category);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={pressRipple}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.category,
        selected
          ? { backgroundColor: colors.brandSoft, borderColor: `${colors.brand}55` }
          : { backgroundColor: palette.surface, borderColor: 'transparent' },
        pressed && !usesRipple && styles.pressed,
      ]}>
      <Icon color={selected ? colors.brandDark : palette.muted} size={16} />
      <Text style={[styles.categoryText, { color: selected ? colors.brandDark : palette.textSecondary }]}>{label}</Text>
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
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { width, height, fontScale } = useWindowDimensions();
  const shortViewport = height < 600;
  const reduceMotion = useReducedMotion();
  const heroCollapseProgress = useSharedValue(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [isHeroHidden, setIsHeroHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const columns = responsiveGridColumns(width, MAX_CONTENT_WIDTH, LIST_PADDING, GRID_GAP, fontScale, 4);
  const useCompactCards = columns > 1;
  // Ancho fijo por celda: con flex:1 una última fila de un solo elemento se estiraría a todo el ancho.
  const itemWidth = Math.floor((Math.min(width, MAX_CONTENT_WIDTH) - LIST_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);
  const filters = useExplorerStore((state) => state.filters);
  const setCategory = useExplorerStore((state) => state.setCategory);
  const setViewMode = useExplorerStore((state) => state.setViewMode);
  const propertyQuery = useInfiniteProperties(filters);
  const propertyCountQuery = usePropertyCount(filters);
  const favoritesQuery = useQuery({ queryKey: propertyKeys.favorites(user?.id ?? 'guest'), queryFn: () => fetchFavorites(user!.id), enabled: Boolean(user) });
  const favoriteMutation = useFavoriteMutation(user?.id ?? 'guest');
  const filteredProperties = useMemo(
    () => propertyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [propertyQuery.data?.pages],
  );

  const categoryLabels = useMemo<Record<CategoryKey, string>>(
    () => ({ Todos: t('all'), Apartamentos: t('apartments'), Casas: t('houses'), Estudios: t('studios') }),
    [t],
  );
  const sortLabels = useMemo(
    () => ({
      recommended: t('recommended'),
      rating: t('sortRating'),
      'price-asc': t('sortPriceAsc'),
      'price-desc': t('sortPriceDesc'),
      newest: t('sortNewest'),
    }),
    [t],
  );
  const favoriteIds = useMemo(() => new Set(favoritesQuery.data ?? []), [favoritesQuery.data]);
  const handleFavoriteChange = useCallback((propertyId: string, favorite: boolean) => favoriteMutation.mutate({ propertyId, favorite }), [favoriteMutation]);
  const renderCategory = useCallback<ListRenderItem<CategoryKey>>(
    ({ item }) => <CategoryChip category={item} label={categoryLabels[item]} selected={item === filters.category} palette={palette} onSelect={setCategory} />,
    [categoryLabels, filters.category, palette, setCategory],
  );
  const renderProperty = useCallback<ListRenderItem<Property>>(
    ({ item }) => <PropertyGridCard property={item} compact={useCompactCards} favorite={favoriteIds.has(item.id)} itemWidth={itemWidth} onFavoriteChange={user ? handleFavoriteChange : undefined} />,
    [favoriteIds, handleFavoriteChange, itemWidth, useCompactCards, user],
  );
  const openMap = useCallback(() => {
    setViewMode('map');
    router.push('/map');
  }, [router, setViewMode]);
  const loadNextPage = useCallback(() => {
    if (propertyQuery.hasNextPage && !propertyQuery.isFetchingNextPage) {
      void propertyQuery.fetchNextPage();
    }
  }, [propertyQuery]);
  const handleHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeroHeight((currentHeight) => Math.abs(currentHeight - measuredHeight) > 1 ? measuredHeight : currentHeight);
  }, []);
  const handlePropertyScroll = useAnimatedScrollHandler((event) => {
    const offset = Math.max(0, event.contentOffset.y);
    heroCollapseProgress.value = reduceMotion
      ? Number(offset >= HERO_COLLAPSE_DISTANCE)
      : interpolate(offset, [0, HERO_COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
  }, [reduceMotion]);
  const collapsibleHeroStyle = useAnimatedStyle(() => {
    const progress = heroCollapseProgress.value;

    return {
      height: heroHeight > 0 ? heroHeight * (1 - progress) : undefined,
      opacity: interpolate(progress, [0, 0.72, 1], [1, 0.9, 0], Extrapolation.CLAMP),
      transform: [{ translateY: -12 * progress }],
    };
  }, [heroHeight]);

  useAnimatedReaction(
    () => heroCollapseProgress.value >= 0.995,
    (hidden, wasHidden) => {
      if (hidden !== wasHidden) {
        scheduleOnRN(setIsHeroHidden, hidden);
      }
    },
    [],
  );

  const searchSummary = filters.location || filters.name || t('searchSubtitle');

  const persistentHeader = (
    <View style={styles.persistentHeader}>
      <View style={styles.primaryRow}>
        <Pressable
          accessibilityLabel={t('menu')}
          accessibilityRole="button"
          accessibilityState={{ expanded: isMenuOpen }}
          android_ripple={pressRipple}
          onPress={() => setIsMenuOpen(true)}
          style={({ pressed }) => [
            styles.menuButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && !usesRipple && styles.pressed,
          ]}
        >
          <Menu color={palette.text} size={23} />
        </Pressable>

        <Pressable
          accessibilityLabel={`${t('searchTitle')}: ${searchSummary}`}
          accessibilityRole="button"
          android_ripple={pressRipple}
          onPress={() => sheetRef.current?.present()}
          style={({ pressed }) => [
            styles.search,
            rippleClip,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && !usesRipple && styles.pressed,
          ]}
        >
          <Search color={palette.muted} size={20} />
          <Text numberOfLines={1} style={[styles.searchText, { color: palette.textSecondary }]}>{searchSummary}</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={t('map')}
          accessibilityRole="button"
          android_ripple={onBrandRipple}
          onPress={openMap}
          style={({ pressed }) => [styles.viewToggle, pressed && !usesRipple && styles.pressed]}
        >
          <LinearGradient colors={exploreGradient} style={styles.viewToggleGradient}>
            <Map color="white" size={21} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  const collapsibleHero = (
    <View collapsable={false} onLayout={handleHeroLayout} style={styles.collapsibleHeroContent}>
      <FlatList
        data={categoryKeys}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={renderCategory}
      />

      {!shortViewport && <View style={[styles.divider, { backgroundColor: palette.border }]} />}

      {!shortViewport && <View style={styles.sectionHeading}>
        <View style={styles.eyebrowRow}>
          <Text style={[styles.eyebrow, { color: palette.brandText }]}>{t('exploreEyebrow')}</Text>
          <View style={[styles.countPill, { backgroundColor: palette.subtle }]}>
            <Text style={[styles.countText, { color: palette.textSecondary }]}>{propertyCountQuery.data ?? '…'} {t('properties')}</Text>
          </View>
        </View>
        <Text style={[styles.featuredTitle, { color: palette.text }]}>{t('featuredProperties')}</Text>
        <Text style={[styles.featuredDescription, { color: palette.textSecondary }]}>{t('featuredDescription')}</Text>
      </View>}

      {!shortViewport && <Pressable accessibilityRole="button" accessibilityLabel={t('changeSortOrder')} android_ripple={pressRipple} onPress={() => sheetRef.current?.present()} style={({ pressed }) => [styles.sort, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && !usesRipple && styles.pressed]}>
        <Text style={[styles.sortLabel, { color: palette.textSecondary }]}>{t('sort')}</Text>
        <View style={styles.sortValue}>
          <Text numberOfLines={1} style={[styles.sortText, { color: palette.text }]}>{sortLabels[filters.sort]}</Text>
          <ChevronDown color={palette.text} size={18} />
        </View>
      </Pressable>}
    </View>
  );

  return (
    <SafeAreaView collapsable={false} edges={['top']} style={[styles.safe, { backgroundColor: palette.surface }]}>
      <View style={[styles.fixedHeader, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <View style={styles.headerContent}>
          {persistentHeader}
          <Animated.View
            accessibilityElementsHidden={isHeroHidden}
            importantForAccessibility={isHeroHidden ? 'no-hide-descendants' : 'auto'}
            pointerEvents={isHeroHidden ? 'none' : 'auto'}
            style={[styles.collapsibleHero, collapsibleHeroStyle]}>
            {collapsibleHero}
          </Animated.View>
        </View>
      </View>
      <Animated.FlatList<Property>
        key={`explore-grid-${columns}`}
        data={filteredProperties}
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
        contentContainerStyle={[styles.listContent, { backgroundColor: palette.background }]}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.45}
        onRefresh={() => void propertyQuery.refetch()}
        onScroll={handlePropertyScroll}
        refreshing={propertyQuery.isRefetching && !propertyQuery.isFetchingNextPage}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      <FilterSheet ref={sheetRef} />
      <ExploreMenu onClose={() => setIsMenuOpen(false)} visible={isMenuOpen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fixedHeader: { borderBottomWidth: StyleSheet.hairlineWidth, boxShadow: '0 8px 22px rgba(15,23,42,0.06)', zIndex: 2 },
  listContent: { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: LIST_PADDING, paddingTop: 14, paddingBottom: 32 },
  gridRow: { gap: GRID_GAP },
  gridItem: { minWidth: 0 },
  headerContent: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 12 },
  persistentHeader: { paddingBottom: 8, paddingTop: 8 },
  collapsibleHero: { overflow: 'hidden' },
  collapsibleHeroContent: { gap: 10, paddingBottom: 12, paddingTop: 6 },
  primaryRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  menuButton: { alignItems: 'center', borderRadius: 25, borderWidth: 1, height: 50, justifyContent: 'center', overflow: 'hidden', width: 50 },
  search: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, boxShadow: '0 7px 18px rgba(15,23,42,0.06)', flex: 1, flexDirection: 'row', gap: 9, height: 50, minWidth: 0, paddingHorizontal: 16 },
  searchText: { flex: 1, fontSize: 13, fontWeight: '700' },
  viewToggle: { borderRadius: 25, height: 50, overflow: 'hidden', width: 50 },
  viewToggleGradient: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  categories: { gap: 8, paddingRight: 14 },
  category: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, overflow: 'hidden' },
  categoryText: { fontSize: 12, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -12 },
  sectionHeading: { gap: 6 },
  eyebrowRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.brandDark, fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1 },
  countPill: { minHeight: 24, borderRadius: radius.pill, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  featuredTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  featuredDescription: { maxWidth: 620, fontSize: 13, lineHeight: 19 },
  sort: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, overflow: 'hidden' },
  sortLabel: { fontSize: 13, fontWeight: '700' },
  sortValue: { maxWidth: '65%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  separator: { height: 18 },
  pageLoader: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageLoaderText: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});

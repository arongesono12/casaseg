import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyCard } from '@/components/property/property-card';
import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { BedDouble, Building2, ChevronDown, Grid2X2, Home, Map, Moon, Search, Sparkles, Sun, UserRound } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState } from '@/components/ui/premium';
import { colors, exploreGradient, radius, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useInfiniteProperties } from '@/features/properties/hooks/use-properties';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { useExplorerStore } from '@/stores/explorer-store';
import type { Property } from '@/types';

const categoryKeys = ['Todos', 'Apartamentos', 'Casas', 'Estudios'] as const;
type CategoryKey = (typeof categoryKeys)[number];

const localeFlags = { es: '🇬🇶', fr: '🇫🇷', en: '🇬🇧' } as const;
const localeOrder = ['es', 'fr', 'en'] as const;
const HERO_COLLAPSE_DISTANCE = 140;

const CategoryChip = memo(function CategoryChip({ category, label, selected, palette, onSelect }: { category: CategoryKey; label: string; selected: boolean; palette: AppPalette; onSelect: (category: CategoryKey) => void }) {
  const Icon = category === 'Todos' ? Grid2X2 : category === 'Apartamentos' ? Building2 : category === 'Casas' ? Home : BedDouble;
  const handlePress = () => {
    if (Platform.OS === 'ios') void Haptics.selectionAsync();
    onSelect(category);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.category,
        selected
          ? { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}55` }
          : { backgroundColor: palette.surface, borderColor: 'transparent' },
        pressed && styles.pressed,
      ]}>
      <Icon color={selected ? colors.accentDark : palette.muted} size={16} />
      <Text style={[styles.categoryText, { color: selected ? colors.accentDark : palette.textSecondary }]}>{label}</Text>
    </Pressable>
  );
});

const PropertyGridCard = memo(function PropertyGridCard({ property, compact, favorite, onFavoriteChange }: { property: Property; compact: boolean; favorite: boolean; onFavoriteChange?: (propertyId: string, favorite: boolean) => void }) {
  return (
    <View style={styles.gridItem}>
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
  const { user, isAuthenticated } = useAuth();
  const { palette, resolvedMode, setMode } = useAppTheme();
  const { t, locale, setLocale } = useI18n();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const heroCollapseProgress = useSharedValue(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [isHeroHidden, setIsHeroHidden] = useState(false);
  const columns = width >= 1280 ? 4 : width >= 760 ? 3 : width >= 360 ? 2 : 1;
  const useCompactCards = columns > 1;
  const filters = useExplorerStore((state) => state.filters);
  const setCategory = useExplorerStore((state) => state.setCategory);
  const setViewMode = useExplorerStore((state) => state.setViewMode);
  const propertyQuery = useInfiniteProperties(filters);
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
    ({ item }) => <PropertyGridCard property={item} compact={useCompactCards} favorite={favoriteIds.has(item.id)} onFavoriteChange={user ? handleFavoriteChange : undefined} />,
    [favoriteIds, handleFavoriteChange, useCompactCards, user],
  );
  const cycleLocale = useCallback(() => {
    const currentIndex = localeOrder.indexOf(locale);
    setLocale(localeOrder[(currentIndex + 1) % localeOrder.length]);
  }, [locale, setLocale]);
  const toggleTheme = useCallback(() => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode, setMode]);
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
        runOnJS(setIsHeroHidden)(hidden);
      }
    },
    [],
  );

  const searchSummary = filters.location || filters.name || t('searchSubtitle');
  const accountLabel = isAuthenticated ? user?.name.split(' ')[0] || t('profile') : t('accessShort');

  const persistentHeader = (
    <View style={styles.persistentHeader}>
      <View style={styles.topBar}>
        <View accessibilityLabel="CasaSeg" style={styles.brand}>
          <CasasegLogo width={29} height={24} />
          <Text style={[styles.brandText, { color: palette.text }]}>CASASEG</Text>
        </View>

        <View style={styles.topActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cambiar idioma" onPress={cycleLocale} style={({ pressed }) => [styles.languageButton, { borderColor: palette.border }, pressed && styles.pressed]}>
            <Text style={styles.flag}>{localeFlags[locale]}</Text>
            <ChevronDown color={palette.textSecondary} size={15} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accountLabel}
            onPress={() => router.push(isAuthenticated ? '/(tabs)/profile' : '/(auth)/login')}
            style={({ pressed }) => [styles.accountButton, { borderColor: palette.border, backgroundColor: palette.surface }, pressed && styles.pressed]}>
            <LinearGradient colors={exploreGradient} style={styles.accountIcon}>
              <UserRound color="white" fill="white" size={21} />
            </LinearGradient>
            <Text numberOfLines={1} style={[styles.accountText, { color: palette.textSecondary }]}>{accountLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={resolvedMode === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'} onPress={toggleTheme} style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}>
            {resolvedMode === 'dark' ? <Sun color={palette.text} size={20} /> : <Moon color={palette.textSecondary} size={20} />}
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros de búsqueda" onPress={() => sheetRef.current?.present()} style={({ pressed }) => [styles.search, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
        <View style={[styles.searchLead, { backgroundColor: palette.subtle }]}>
          <Search color={palette.muted} size={20} />
        </View>
        <View style={styles.searchCopy}>
          <Text style={[styles.searchTitle, { color: palette.text }]}>{t('searchTitle')}</Text>
          <Text numberOfLines={1} style={[styles.searchSubtitle, { color: palette.textSecondary }]}>{searchSummary}</Text>
        </View>
        <LinearGradient colors={exploreGradient} style={styles.searchAction}>
          <Search color="white" size={21} />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const collapsibleHero = (
    <View collapsable={false} onLayout={handleHeroLayout} style={styles.collapsibleHeroContent}>
      <View style={[styles.segmented, { backgroundColor: palette.subtle }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: true }} onPress={() => setViewMode('list')} style={styles.segmentButton}>
          <LinearGradient colors={exploreGradient} style={styles.segmentSelected}>
            <Grid2X2 color="white" fill="white" size={18} />
            <Text style={styles.segmentSelectedText}>{t('list')}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: false }} onPress={openMap} style={({ pressed }) => [styles.segment, pressed && styles.pressed]}>
          <Map color={palette.textSecondary} size={18} />
          <Text style={[styles.segmentText, { color: palette.textSecondary }]}>{t('map')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={categoryKeys}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={renderCategory}
      />

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.sectionHeading}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>{t('exploreEyebrow')}</Text>
          <View style={[styles.countPill, { backgroundColor: palette.subtle }]}>
            <Text style={[styles.countText, { color: palette.textSecondary }]}>{filteredProperties.length} {t('properties')}</Text>
          </View>
        </View>
        <Text style={[styles.featuredTitle, { color: palette.text }]}>{t('featuredProperties')}</Text>
        <Text style={[styles.featuredDescription, { color: palette.textSecondary }]}>{t('featuredDescription')}</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar orden de propiedades" onPress={() => sheetRef.current?.present()} style={({ pressed }) => [styles.sort, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
        <Text style={[styles.sortLabel, { color: palette.textSecondary }]}>{t('sort')}</Text>
        <View style={styles.sortValue}>
          <Text numberOfLines={1} style={[styles.sortText, { color: palette.text }]}>{sortLabels[filters.sort]}</Text>
          <ChevronDown color={palette.text} size={18} />
        </View>
      </Pressable>
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
          ? <PremiumEmptyState icon={Sparkles} title="Buscando propiedades" description="Estamos preparando las mejores opciones para ti." loading />
          : propertyQuery.isError
            ? <PremiumErrorState title="No pudimos cargar las propiedades" description={t('propertyLoadError')} onRetry={() => void propertyQuery.refetch()} />
            : <PremiumEmptyState icon={Home} title="Sin resultados para estos filtros" description={t('noPropertyResults')} actionLabel="Cambiar filtros" onAction={() => sheetRef.current?.present()} />}
        ListFooterComponent={propertyQuery.isFetchingNextPage ? <View style={styles.pageLoader}><ActivityIndicator color={colors.accent} /><Text style={[styles.pageLoaderText, { color: palette.textSecondary }]}>Cargando más propiedades…</Text></View> : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fixedHeader: { borderBottomWidth: StyleSheet.hairlineWidth, boxShadow: '0 8px 22px rgba(15,23,42,0.06)', zIndex: 2 },
  listContent: { flexGrow: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 32 },
  gridRow: { gap: 12 },
  gridItem: { flex: 1, minWidth: 0 },
  headerContent: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 12 },
  persistentHeader: { gap: 10, paddingTop: 2 },
  collapsibleHero: { overflow: 'hidden' },
  collapsibleHeroContent: { gap: 10, paddingTop: 10, paddingBottom: 12 },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 0.5 },
  topActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  languageButton: { height: 40, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  flag: { fontSize: 20, lineHeight: 24 },
  accountButton: { maxWidth: 118, height: 42, borderWidth: 1, borderRadius: radius.pill, paddingLeft: 4, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(15,23,42,0.05)' },
  accountIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accountText: { flexShrink: 1, fontSize: 12, fontWeight: '700' },
  themeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  search: { minHeight: 58, borderRadius: radius.lg, borderWidth: 1, paddingLeft: 8, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 9, boxShadow: '0 8px 22px rgba(15,23,42,0.06)' },
  searchLead: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  searchCopy: { flex: 1, minWidth: 0, gap: 1 },
  searchTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  searchSubtitle: { fontSize: 12, lineHeight: 16 },
  searchAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', boxShadow: '0 7px 16px rgba(20,184,166,0.2)' },
  segmented: { width: 242, height: 54, padding: 4, borderRadius: radius.sm, flexDirection: 'row', alignSelf: 'center' },
  segmentButton: { flex: 1 },
  segment: { flex: 1, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentSelected: { flex: 1, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 5px 14px rgba(37,99,235,0.18)' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  segmentSelectedText: { color: 'white', fontSize: 13, fontWeight: '800' },
  categories: { gap: 8, paddingRight: 14 },
  category: { minHeight: 40, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -12 },
  sectionHeading: { gap: 6 },
  eyebrowRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.accentDark, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1 },
  countPill: { minHeight: 24, borderRadius: radius.pill, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  featuredTitle: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  featuredDescription: { maxWidth: 620, fontSize: 13, lineHeight: 19 },
  sort: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sortLabel: { fontSize: 13, fontWeight: '700' },
  sortValue: { maxWidth: '65%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  separator: { height: 18 },
  pageLoader: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageLoaderText: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});

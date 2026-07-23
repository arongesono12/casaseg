import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, Home, List, Map, Search, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, PremiumHero } from '@/components/ui/premium';
import { memo, useCallback, useMemo, useRef } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyCard } from '@/components/property/property-card';
import { brandGradient, colors, radius, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';
import { useExplorerStore } from '@/stores/explorer-store';
import type { Property } from '@/types';

const categoryKeys = ['Todos', 'Apartamentos', 'Casas', 'Estudios'] as const;
type CategoryKey = (typeof categoryKeys)[number];

const CategoryChip = memo(function CategoryChip({ category, label, selected, palette, onSelect }: { category: CategoryKey; label: string; selected: boolean; palette: AppPalette; onSelect: (category: CategoryKey) => void }) {
  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(category);
  };
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.category, selected ? styles.categorySelected : { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.categoryText, { color: selected ? 'white' : palette.textSecondary }]}>{label}</Text></Pressable>;
});

const PropertyGridCard = memo(function PropertyGridCard({ property, compact, favorite, onFavoriteChange }: { property: Property; compact: boolean; favorite: boolean; onFavoriteChange?: (propertyId: string, favorite: boolean) => void }) {
  return <View style={styles.gridItem}><PropertyCard compact={compact} property={property} isFavorite={favorite} onFavoriteChange={onFavoriteChange} /></View>;
});

function PropertySeparator() {
  return <View style={styles.separator} />;
}

export default function ExploreScreen() {
  const router = useRouter();
  const sheetRef = useRef<FilterSheetHandle>(null);
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const columns = width >= 720 ? 3 : width >= 360 ? 2 : 1;
  const useCompactCards = columns > 1;
  const filters = useExplorerStore((state) => state.filters);
  const setCategory = useExplorerStore((state) => state.setCategory);
  const propertyQuery = useProperties(filters);
  const favoritesQuery = useQuery({ queryKey: propertyKeys.favorites(user?.id ?? 'guest'), queryFn: () => fetchFavorites(user!.id), enabled: Boolean(user) });
  const favoriteMutation = useFavoriteMutation(user?.id ?? 'guest');
  const filteredProperties = propertyQuery.data ?? [];

  const greeting = user ? t('greeting', { name: user.name.split(' ')[0] }) : t('guestGreeting');
  const categoryLabels = useMemo<Record<CategoryKey, string>>(() => ({ Todos: t('all'), Apartamentos: t('apartments'), Casas: t('houses'), Estudios: t('studios') }), [t]);
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

  const header = (
    <View style={styles.headerContent}>
      <PremiumHero title={greeting} description={t('greetingSubtitle')} eyebrow="PROPIEDADES VERIFICADAS" icon={ShieldCheck} accessory={(
        <Pressable accessibilityRole="button" accessibilityLabel={isAuthenticated ? 'Notificaciones' : 'Iniciar sesión'} onPress={() => router.push(isAuthenticated ? '/notifications' : '/(auth)/login')} style={styles.notificationButton}>
          {isAuthenticated ? <Bell color={palette.text} size={23} /> : <UserRound color={palette.text} size={23} />}
          {isAuthenticated && unreadCount > 0 && <View style={styles.notificationDot}><Text style={styles.notificationCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
        </Pressable>
      )} />

      <Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros" onPress={() => sheetRef.current?.present()} style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Search color={palette.textSecondary} size={23} />
        <View style={styles.searchCopy}><Text style={[styles.searchTitle, { color: palette.text }]}>{filters.location || filters.name || t('searchTitle')}</Text><Text numberOfLines={1} style={[styles.searchSubtitle, { color: palette.textSecondary }]}>{t('searchSubtitle')}</Text></View>
        <LinearGradient colors={brandGradient} style={styles.searchAction}><SlidersHorizontal color="white" size={21} /></LinearGradient>
      </Pressable>

      <View style={[styles.segmented, { backgroundColor: palette.subtle }]}>
        <LinearGradient colors={brandGradient} style={styles.segmentSelected}><List color="white" size={19} /><Text style={styles.segmentSelectedText}>{t('list')}</Text></LinearGradient>
        <Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={styles.segment}><Map color={palette.textSecondary} size={19} /><Text style={[styles.segmentText, { color: palette.textSecondary }]}>{t('map')}</Text></Pressable>
      </View>

      <FlatList
        data={categoryKeys}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={renderCategory}
      />

      <View style={styles.resultsRow}><Text style={[styles.results, { color: palette.text }]}>{filteredProperties.length} {t('properties')}</Text><Pressable accessibilityRole="button" onPress={() => sheetRef.current?.present()} style={styles.sort}><Text style={[styles.sortText, { color: palette.textSecondary }]}>{t('sort')}</Text><ChevronDown color={palette.textSecondary} size={18} /></Pressable></View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <FlatList
        key={`explore-grid-${columns}`}
        data={filteredProperties}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        ItemSeparatorComponent={PropertySeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={propertyQuery.isLoading ? <PremiumEmptyState icon={Sparkles} title="Buscando propiedades" description="Estamos preparando las mejores opciones para ti." loading /> : propertyQuery.isError ? <PremiumErrorState title="No pudimos cargar las propiedades" description={t('propertyLoadError')} onRetry={() => void propertyQuery.refetch()} /> : <PremiumEmptyState icon={Home} title="Sin resultados para estos filtros" description={t('noPropertyResults')} actionLabel="Cambiar filtros" onAction={() => sheetRef.current?.present()} />}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
      />
      <FilterSheet ref={sheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 132 },
  gridRow: { gap: 12 },
  gridItem: { flex: 1, minWidth: 0 },
  headerContent: { gap: 16, paddingTop: 8, paddingBottom: 20 },
  notificationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: -2, top: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationCount: { color: 'white', fontSize: 11, fontWeight: '900' },
  search: { minHeight: 62, borderRadius: radius.lg, borderWidth: 1, paddingLeft: 16, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 10px 24px rgba(15,23,42,0.07)' },
  searchCopy: { flex: 1, gap: 2 },
  searchTitle: { fontSize: 16, fontWeight: '800' },
  searchSubtitle: { fontSize: 13 },
  searchAction: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  segmented: { height: 48, padding: 4, borderRadius: radius.md, flexDirection: 'row' },
  segment: { flex: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segmentSelected: { flex: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segmentText: { fontSize: 14, fontWeight: '700' },
  segmentSelectedText: { color: 'white', fontSize: 14, fontWeight: '800' },
  categories: { gap: 8, paddingRight: 16 },
  category: { height: 42, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center' },
  categorySelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  categoryText: { fontSize: 14, fontWeight: '700' },
  resultsRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  results: { fontSize: 18, fontWeight: '900' },
  sort: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 },
  sortText: { fontSize: 14, fontWeight: '700' },
  separator: { height: 18 },
});

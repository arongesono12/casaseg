import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, List, Map, Search, SlidersHorizontal, UserRound } from '@/components/ui/icons';
import { useRef } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyCard } from '@/components/property/property-card';
import { brandGradient, colors, radius } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { useExplorerStore } from '@/stores/explorer-store';

const categoryKeys = ['Todos', 'Apartamentos', 'Casas', 'Estudios'] as const;

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
  const categoryLabels = { Todos: t('all'), Apartamentos: t('apartments'), Casas: t('houses'), Estudios: t('studios') };

  const header = (
    <View style={styles.headerContent}>
      <LinearGradient colors={['rgba(37,99,235,0.18)', 'rgba(59,130,246,0.08)']} style={styles.hero}>
        <View style={styles.heroCopy}><Text style={[styles.heroTitle, { color: palette.text }]}>{greeting}</Text><Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>{t('greetingSubtitle')}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={isAuthenticated ? 'Notificaciones' : 'Iniciar sesión'} onPress={() => router.push(isAuthenticated ? '/notifications' : '/(auth)/login')} style={[styles.notificationButton, { backgroundColor: palette.surface }]}>
          {isAuthenticated ? <Bell color={palette.text} size={23} /> : <UserRound color={palette.text} size={23} />}
          {isAuthenticated && unreadCount > 0 && <View style={styles.notificationDot}><Text style={styles.notificationCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
        </Pressable>
      </LinearGradient>

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
        renderItem={({ item }) => {
          const selected = item === filters.category;
          return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync(); setCategory(item); }} style={[styles.category, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.categoryText, { color: selected ? 'white' : palette.textSecondary }]}>{categoryLabels[item]}</Text></Pressable>;
        }}
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
        renderItem={({ item }) => <View style={styles.gridItem}><PropertyCard compact={useCompactCards} property={item} isFavorite={favoritesQuery.data?.includes(item.id)} onFavoriteChange={user ? (propertyId, favorite) => favoriteMutation.mutate({ propertyId, favorite }) : undefined} /></View>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListEmptyComponent={propertyQuery.isLoading ? <ActivityIndicator color={colors.brand} size="large" style={styles.empty} /> : propertyQuery.isError ? <Pressable onPress={() => void propertyQuery.refetch()}><Text style={[styles.empty, { color: colors.error }]}>{t('propertyLoadError')}</Text></Pressable> : <Text style={[styles.empty, { color: palette.textSecondary }]}>{t('noPropertyResults')}</Text>}
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
  listContent: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 32 },
  gridRow: { gap: 12 },
  gridItem: { flex: 1, minWidth: 0 },
  headerContent: { gap: 16, paddingTop: 8, paddingBottom: 20 },
  hero: { minHeight: 148, borderRadius: radius.hero, padding: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', overflow: 'hidden' },
  heroCopy: { flex: 1, paddingTop: 4, paddingRight: 12, gap: 8 },
  heroTitle: { fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.7 },
  heroSubtitle: { fontSize: 15, lineHeight: 21 },
  notificationButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: -2, top: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationCount: { color: 'white', fontSize: 11, fontWeight: '900' },
  search: { minHeight: 58, borderRadius: radius.lg, borderWidth: 1, paddingLeft: 16, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  categoryText: { fontSize: 14, fontWeight: '700' },
  resultsRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  results: { fontSize: 18, fontWeight: '900' },
  sort: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 },
  sortText: { fontSize: 14, fontWeight: '700' },
  separator: { height: 18 },
  empty: { textAlign: 'center', paddingVertical: 48, fontSize: 15 },
});

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';
import { PropertyCard } from '@/components/property/property-card';
import { ArrowRight, Heart, Sparkles } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState } from '@/components/ui/premium';
import { fontFamily, radius, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useFavoritesUserId } from '@/features/properties/hooks/use-favorites-user-id';
import { responsiveGridColumns } from '@/lib/responsive-grid';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { defaultPropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';

const MAX_CONTENT_WIDTH = 720;
const LIST_PADDING = 16;
const GRID_GAP = 12;

const savedCopy = defineCopy({
  es: { start: 'Tu colección empieza aquí', startBody: 'Guarda las viviendas que te interesen y vuelve a ellas cuando quieras.' },
  fr: { start: 'Votre collection commence ici', startBody: 'Enregistrez les logements qui vous plaisent pour les retrouver quand vous le souhaitez.' },
  en: { start: 'Your collection starts here', startBody: 'Save the homes you like and return to them whenever you want.' },
});

function CollectionEmpty({ title, description, actionLabel, onAction, palette }: { title: string; description: string; actionLabel: string; onAction: () => void; palette: AppPalette }) {
  return (
    <View style={[styles.emptyPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.brandSoft }]}><Heart color={palette.brandIcon} size={27} /></View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>{description}</Text>
      <PremiumButton label={actionLabel} onPress={onAction} trailingIcon={ArrowRight} style={styles.emptyButton} />
    </View>
  );
}

function PropertySeparator() {
  return <View style={styles.separator} />;
}

export default function SavedScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const { t } = useI18n();
  const copy = useCopy(savedCopy);
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
    <View style={[styles.header, { paddingTop: insets.top + 20 }]} onLayout={onHeroLayout}>
      <Text style={[styles.eyebrow, { color: palette.brandText }]}>{t('savedEyebrow')}</Text>
      <View style={styles.titleLine}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('saved')}</Text>
        {saved.length > 0 ? <View style={[styles.count, { backgroundColor: palette.brandSoft }]}><Text style={[styles.countText, { color: palette.brandText }]}>{saved.length}</Text></View> : null}
      </View>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{saved.length ? t('savedDetailFilled') : t('savedTitleEmpty')}</Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
        <HeroStatusBar pastHero={false} />
        <ScrollView contentContainerStyle={[styles.guestScroll, Platform.OS === 'android' && styles.androidScrollEnd]} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <Text style={[styles.eyebrow, { color: palette.brandText }]}>{t('savedEyebrow')}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('saved')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('savedTitleEmpty')}</Text>
          </View>
          <View style={styles.guestContent}>
            <CollectionEmpty title={t('savedGuestTitle')} description={t('savedGuestBody')} actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} palette={palette} />
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
            : <CollectionEmpty title={copy.start} description={copy.startBody} actionLabel={t('exploreProperties')} onAction={() => router.push('/(tabs)/explore')} palette={palette} />}
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
  guestContent: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20 },
  header: { paddingHorizontal: 4, paddingBottom: 23, gap: 8 },
  eyebrow: { fontSize: 10, lineHeight: 15, fontFamily: fontFamily.bold, letterSpacing: 1.1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 31, lineHeight: 38, fontFamily: fontFamily.extrabold, letterSpacing: -0.8 },
  count: { minWidth: 25, height: 25, borderRadius: 13, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontFamily: fontFamily.bold },
  subtitle: { maxWidth: 530, fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular },
  emptyPanel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 24, alignItems: 'flex-start' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  emptyTitle: { maxWidth: 420, fontSize: 24, lineHeight: 30, fontFamily: fontFamily.bold, letterSpacing: -0.5 },
  emptyBody: { maxWidth: 420, marginTop: 9, fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular },
  emptyButton: { marginTop: 26, width: '100%', maxWidth: 320 },
  gridRow: { gap: GRID_GAP },
  gridItem: { minWidth: 0 },
  separator: { height: 18 },
});

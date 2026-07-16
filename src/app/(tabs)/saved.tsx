import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PropertyCard } from '@/components/property/property-card';
import { Heart } from '@/components/ui/icons';
import { colors, type AppPalette } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { fetchFavorites } from '@/features/properties/api/property.queries';
import { useFavoriteMutation } from '@/features/properties/hooks/use-favorite-mutation';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { defaultPropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';

function PropertySeparator() {
  return <View style={styles.separator} />;
}

export default function SavedScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const userId = user?.id ?? 'guest';
  const favorites = useQuery({ queryKey: propertyKeys.favorites(userId), queryFn: () => fetchFavorites(userId), enabled: Boolean(user) });
  const properties = useProperties(defaultPropertyFilters);
  const mutation = useFavoriteMutation(userId);
  const favoriteIds = useMemo(() => new Set(favorites.data ?? []), [favorites.data]);
  const saved = useMemo(() => (properties.data ?? []).filter((property) => favoriteIds.has(property.id)), [favoriteIds, properties.data]);
  const handleFavoriteChange = useCallback((propertyId: string, favorite: boolean) => mutation.mutate({ propertyId, favorite }), [mutation]);
  const renderProperty = useCallback<ListRenderItem<Property>>(
    ({ item }) => <PropertyCard property={item} isFavorite onFavoriteChange={handleFavoriteChange} />,
    [handleFavoriteChange],
  );

  if (!user) return <AuthRequiredScreen title={t('saved')} subtitle={t('savedSubtitle')} action={t('signIn')} palette={palette} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.header}><Text style={[styles.title, { color: palette.text }]}>{t('saved')}</Text><Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('savedSubtitle')}</Text></View>
      <FlatList data={saved} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={renderProperty} ItemSeparatorComponent={PropertySeparator} ListEmptyComponent={<View style={styles.empty}><Heart color={colors.favorite} size={36} /><Text style={[styles.emptyTitle, { color: palette.text }]}>{t('noSaved')}</Text><Text style={[styles.emptyCopy, { color: palette.textSecondary }]}>{t('saveHint')}</Text></View>} />
    </SafeAreaView>
  );
}

function AuthRequiredScreen({ title, subtitle, action, palette }: { title: string; subtitle: string; action: string; palette: AppPalette }) {
  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}><View style={styles.authRequired}><Heart color={colors.favorite} size={42} /><Text style={[styles.title, { color: palette.text }]}>{title}</Text><Text style={[styles.emptyCopy, { color: palette.textSecondary }]}>{subtitle}</Text><Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginButton}><Text style={styles.loginText}>{action}</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { padding: 20, gap: 5 }, title: { fontSize: 28, fontWeight: '900' }, subtitle: { fontSize: 14 }, list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 28 }, separator: { height: 24 }, empty: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 10 }, emptyTitle: { fontSize: 18, fontWeight: '900' }, emptyCopy: { fontSize: 14, textAlign: 'center', lineHeight: 20 }, authRequired: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }, loginButton: { marginTop: 8, minHeight: 48, borderRadius: 24, backgroundColor: colors.brand, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }, loginText: { color: 'white', fontSize: 15, fontWeight: '900' } });

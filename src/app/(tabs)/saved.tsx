import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property/property-card';
import { Heart, Home, Sparkles } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, PremiumHero, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
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

  const listHeader = (
    <View style={styles.header}>
      <PremiumHero title={t('saved')} description={t('savedSubtitle')} eyebrow="TU COLECCIÓN" icon={Heart} />
      <SectionTitle
        title={saved.length ? 'Hogares que te inspiran' : 'Tu selección personal'}
        detail={saved.length ? 'Compara tus favoritos y elige con calma.' : 'Guarda propiedades para encontrarlas rápidamente.'}
        action={saved.length ? <StatusPill label={`${saved.length} guardadas`} tone={colors.favorite} icon={Heart} /> : undefined}
      />
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
        <View style={styles.guestContent}>
          <PremiumHero title={t('saved')} description={t('savedSubtitle')} eyebrow="TU COLECCIÓN" icon={Heart} />
          <PremiumEmptyState icon={Heart} title="Tus favoritos, siempre contigo" description="Inicia sesión para guardar propiedades, compararlas y sincronizarlas en todos tus dispositivos." actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = favorites.isLoading || properties.isLoading;
  const isError = favorites.isError || properties.isError;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <FlatList
        data={isLoading || isError ? [] : saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderProperty}
        ItemSeparatorComponent={PropertySeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={isLoading
          ? <PremiumEmptyState icon={Sparkles} title="Preparando tu colección" description="Estamos sincronizando las propiedades que has guardado." loading />
          : isError
            ? <PremiumErrorState title="No pudimos cargar tus favoritos" description="Tu colección sigue segura. Comprueba la conexión e inténtalo de nuevo." onRetry={() => { void favorites.refetch(); void properties.refetch(); }} />
            : <PremiumEmptyState icon={Home} title={t('noSaved')} description={t('saveHint')} actionLabel="Explorar propiedades" onAction={() => router.push('/(tabs)/explore')} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 130, gap: 0 },
  guestContent: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 120, gap: 20 },
  header: { gap: 22, paddingTop: 8, paddingBottom: 20 },
  separator: { height: 24 },
});

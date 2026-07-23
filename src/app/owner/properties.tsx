import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, CheckCircle2, Clock, MapPin, Plus } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchOwnerProperties } from '@/features/properties/api/property.queries';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const fallbackImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

export default function OwnerProperties() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const properties = useQuery({ queryKey: ['properties', 'owner', user!.id], queryFn: () => fetchOwnerProperties(user!.id) });

  return (
    <RouteScreen title={t('myProperties')} description={t('myPropertiesSubtitle')}>
      <PremiumButton label={t('createProperty')} icon={Plus} onPress={() => router.push('/owner/property/create')} />
      <SectionTitle title="Tu cartera" detail="Controla el estado y la presentación de cada anuncio." action={properties.data?.length ? <StatusPill label={`${properties.data.length} propiedades`} /> : undefined} />

      {properties.isLoading ? <PremiumEmptyState icon={Building2} title="Cargando propiedades" description="Estamos preparando tu cartera de publicaciones." loading /> : null}
      {properties.isError ? <PremiumErrorState title="No pudimos cargar tus propiedades" description="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void properties.refetch()} /> : null}
      {!properties.isLoading && !properties.isError && !properties.data?.length ? <PremiumEmptyState icon={Building2} title="Tu primera propiedad empieza aquí" description="Crea una publicación completa con fotos, precio y características para llegar a nuevos clientes." actionLabel={t('createProperty')} onAction={() => router.push('/owner/property/create')} /> : null}

      <View style={styles.list}>
        {properties.data?.map((property) => {
          const verified = property.legalStatus === 'verified';
          return (
            <Pressable key={property.id} accessibilityRole="button" accessibilityLabel={`Editar ${property.title}`} onPress={() => router.push({ pathname: '/owner/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: property.imageUrls[0] || fallbackImage }} contentFit="cover" cachePolicy="disk" transition={180} style={styles.image} />
                <View style={styles.statusOverlay}><StatusPill label={verified ? 'Verificada' : 'En revisión'} tone={verified ? colors.success : colors.warning} icon={verified ? CheckCircle2 : Clock} /></View>
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.meta}><MapPin color={palette.textSecondary} size={15} /><Text numberOfLines={1} style={[styles.location, { color: palette.textSecondary }]}>{property.location}</Text></View>
                <Text style={[styles.price, { color: palette.text }]}>{formatXaf(property.price, property.priceType)}</Text>
                <View style={styles.editRow}><Text style={styles.edit}>{t('editPublication')}</Text><ArrowRight color={colors.brand} size={18} /></View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { minHeight: 134, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 10, flexDirection: 'row', gap: 13, boxShadow: '0 10px 26px rgba(15,23,42,0.06)' },
  imageWrap: { width: 126, minHeight: 112, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.subtle },
  image: { width: '100%', height: '100%' },
  statusOverlay: { position: 'absolute', left: 7, top: 7 },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 7 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { flex: 1, fontSize: 12 },
  price: { fontSize: 14, fontWeight: '900' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  edit: { color: colors.brand, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});

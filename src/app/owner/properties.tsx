import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, CheckCircle2, Clock, MapPin, Plus } from '@/components/ui/icons';
import { HeroBadge, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { useOwnerProperties } from '@/features/owner/use-owner-properties';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const fallbackImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

const ownerPropertiesCopy = defineCopy({
  es: { count: '{count} propiedades', loadingTitle: 'Cargando propiedades', loadingBody: 'Estamos preparando tu cartera de publicaciones.', errorTitle: 'No pudimos cargar tus propiedades', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Tu primera propiedad empieza aquí', emptyBody: 'Crea una publicación completa con fotos, precio y características para llegar a nuevos clientes.', editLabel: 'Editar {title}', verified: 'Verificada', inReview: 'En revisión' },
  fr: { count: '{count} logements', loadingTitle: 'Chargement des logements', loadingBody: 'Nous préparons votre portefeuille d’annonces.', errorTitle: 'Impossible de charger vos logements', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Votre premier logement commence ici', emptyBody: 'Créez une annonce complète avec photos, prix et caractéristiques pour toucher de nouveaux clients.', editLabel: 'Modifier {title}', verified: 'Vérifié', inReview: 'En cours de vérification' },
  en: { count: '{count} properties', loadingTitle: 'Loading properties', loadingBody: 'We are preparing your listing portfolio.', errorTitle: 'We could not load your properties', errorBody: 'Check your connection and try again.', emptyTitle: 'Your first property starts here', emptyBody: 'Create a complete listing with photos, price and features to reach new clients.', editLabel: 'Edit {title}', verified: 'Verified', inReview: 'Under review' },
});

export default function OwnerProperties() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(ownerPropertiesCopy);
  const properties = useOwnerProperties();

  return (
    <RouteScreen
      title={t('myProperties')}
      description={t('myPropertiesSubtitle')}
      headerContent={properties.data?.length ? <HeroBadge label={interpolate(copy.count, { count: properties.data.length })} icon={Building2} /> : undefined}
    >
      <PremiumButton label={t('createProperty')} icon={Plus} onPress={() => router.push('/owner/property/create')} />

      {properties.isPending ? <PremiumEmptyState icon={Building2} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {properties.isError ? <PremiumErrorState title={copy.errorTitle} description={copy.errorBody} onRetry={() => void properties.refetch()} /> : null}
      {!properties.isPending && !properties.isError && !properties.data?.length ? <PremiumEmptyState icon={Building2} title={copy.emptyTitle} description={copy.emptyBody} actionLabel={t('createProperty')} onAction={() => router.push('/owner/property/create')} /> : null}

      <View style={styles.list}>
        {properties.data?.map((property) => {
          const verified = property.legalStatus === 'verified';
          return (
            <Pressable key={property.id} accessibilityRole="button" accessibilityLabel={interpolate(copy.editLabel, { title: property.title })} onPress={() => router.push({ pathname: '/owner/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: property.imageUrls[0] || fallbackImage }} contentFit="cover" cachePolicy="disk" transition={180} style={styles.image} />
                <View style={styles.statusOverlay}><StatusPill label={verified ? copy.verified : copy.inReview} tone={verified ? colors.success : colors.warning} icon={verified ? CheckCircle2 : Clock} /></View>
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.meta}><MapPin color={palette.textSecondary} size={15} /><Text numberOfLines={1} style={[styles.location, { color: palette.textSecondary }]}>{property.location}</Text></View>
                <Text style={[styles.price, { color: palette.text }]}>{formatXaf(property.price, property.priceType, locale)}</Text>
                <View style={styles.editRow}><Text style={[styles.edit, { color: palette.brandText }]}>{t('editPublication')}</Text><ArrowRight color={palette.brandIcon} size={18} /></View>
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
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { flex: 1, fontSize: 12 },
  price: { fontSize: 14, fontWeight: '700' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  edit: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, CheckCircle2, Clock, FileText, MapPin, Plus, ShieldCheck } from '@/components/ui/icons';
import { HeroBadge, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { latestVerificationByProperty, ownershipStatusSummary } from '@/features/owner/property-ownership';
import { fetchOwnPropertyOwnershipVerifications, ownershipKeys } from '@/features/owner/property-ownership.api';
import { ownershipCopy, ownershipToneColor, ownershipToneIcon } from '@/features/owner/property-ownership-copy';
import { useOwnerProperties } from '@/features/owner/use-owner-properties';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const ownerPropertiesCopy = defineCopy({
  es: { count: '{count} viviendas', loadingTitle: 'Cargando viviendas', loadingBody: 'Estamos preparando tu cartera de publicaciones.', errorTitle: 'No pudimos cargar tus viviendas', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Tu primera vivienda empieza aquí', emptyBody: 'Crea una publicación completa con fotos, precio y características para llegar a nuevos clientes.', editLabel: 'Editar {title}', verified: 'Verificada', inReview: 'En revisión', template: 'Plantilla de contrato' },
  fr: { count: '{count} logements', loadingTitle: 'Chargement des logements', loadingBody: 'Nous préparons votre portefeuille d’annonces.', errorTitle: 'Impossible de charger vos logements', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Votre premier logement commence ici', emptyBody: 'Créez une annonce complète avec photos, prix et caractéristiques pour toucher de nouveaux clients.', editLabel: 'Modifier {title}', verified: 'Vérifié', inReview: 'En cours de vérification', template: 'Modèle de contrat' },
  en: { count: '{count} homes', loadingTitle: 'Loading homes', loadingBody: 'We are preparing your listing portfolio.', errorTitle: 'We could not load your homes', errorBody: 'Check your connection and try again.', emptyTitle: 'Your first home starts here', emptyBody: 'Create a complete listing with photos, price and features to reach new clients.', editLabel: 'Edit {title}', verified: 'Verified', inReview: 'Under review', template: 'Contract template' },
});

export default function OwnerProperties() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(ownerPropertiesCopy);
  const properties = useOwnerProperties();
  const ownership = useCopy(ownershipCopy);
  const profileId = useProfileId();
  // Sin la migración de verificación la consulta falla: la lista se muestra igual, sin el estado.
  const verifications = useQuery({ queryKey: ownershipKeys.own(profileId ?? 'none'), queryFn: () => fetchOwnPropertyOwnershipVerifications(profileId!), enabled: Boolean(profileId), retry: false });
  const latestByProperty = latestVerificationByProperty(verifications.data ?? []);

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
          const summary = property.ownershipVerificationStatus ? ownershipStatusSummary(property, latestByProperty.get(property.id)) : null;
          return (
            <View key={property.id} style={styles.item}>
            <Pressable accessibilityRole="button" accessibilityLabel={interpolate(copy.editLabel, { title: property.title })} onPress={() => router.push({ pathname: '/owner/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <View style={[styles.imageWrap, { backgroundColor: palette.subtle }]}>
                {property.imageUrls[0] ? (
                  <Image source={{ uri: property.imageUrls[0] }} contentFit="cover" cachePolicy="disk" transition={180} style={styles.image} />
                ) : (
                  <View style={styles.noPhoto}>
                    <Building2 color={palette.brandIcon} size={28} />
                    <Text style={[styles.noPhotoText, { color: palette.textSecondary }]}>{t('noPhotos')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.status}><StatusPill label={verified ? copy.verified : copy.inReview} tone={verified ? colors.success : colors.warning} icon={verified ? CheckCircle2 : Clock} /></View>
                <View style={styles.meta}><MapPin color={palette.textSecondary} size={15} /><Text numberOfLines={1} style={[styles.location, { color: palette.textSecondary }]}>{property.location}</Text></View>
                <Text style={[styles.price, { color: palette.text }]}>{formatXaf(property.price, property.priceType, locale)}</Text>
                <View style={styles.editRow}><Text style={[styles.edit, { color: palette.brandText }]}>{t('editPublication')}</Text><ArrowRight color={palette.brandIcon} size={18} /></View>
              </View>
            </Pressable>
            {summary ? (
              <View style={styles.ownership}>
                <StatusPill label={ownership[`status_${summary.key}`]} tone={ownershipToneColor[summary.tone]} icon={ownershipToneIcon[summary.tone]} />
                {summary.canSubmit ? <PremiumButton size="md" variant={summary.tone === 'neutral' ? 'secondary' : 'primary'} icon={ShieldCheck} label={ownership.verify} onPress={() => router.push(`/owner/property/ownership/${property.id}` as Href)} /> : null}
              </View>
            ) : null}
            <PremiumButton variant="secondary" icon={FileText} label={copy.template} onPress={() => router.push(`/owner/contract-template/${property.id}` as Href)} />
            </View>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: { gap: 8 },
  ownership: { gap: 8, alignItems: 'flex-start' },
  card: { width: '100%', minHeight: 134, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 13, boxShadow: '0 10px 26px rgba(15,23,42,0.06)' },
  imageWrap: { width: 112, height: 112, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: 112, height: 112 },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  noPhotoText: { fontSize: 11, fontFamily: fontFamily.medium, textAlign: 'center' },
  status: { alignItems: 'flex-start' },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 7 },
  title: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12 },
  price: { fontSize: 14, fontFamily: fontFamily.bold },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  edit: { color: colors.brand, fontSize: 12, fontFamily: fontFamily.bold },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});

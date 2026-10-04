import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, CheckCircle2, Clock, MapPin, ShieldCheck, XCircle } from '@/components/ui/icons';
import { HeroBadge, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchAdminProperties, type AdminProperty } from '@/features/admin/admin.api';
import { adminCopy, statusLabel } from '@/features/admin/admin-copy';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type LegalFilter = 'all' | AdminProperty['legalStatus'];
const propertiesCopy = defineCopy({
  es: { all: 'Todas', pending: 'Pendientes', verified: 'Verificadas', restricted: 'Restringidas', verifiedOne: 'Verificada', restrictedOne: 'Restringida', pendingOne: 'Pendiente', title: 'Supervisión de propiedades', subtitle: 'Consulta el estado operativo y de verificación de las publicaciones.', loadingTitle: 'Cargando propiedades', loadingBody: 'Estamos consultando las publicaciones disponibles para administración.', errorTitle: 'No pudimos cargar las propiedades', emptyTitle: 'No hay propiedades en este estado', emptyBody: 'Selecciona otro filtro para consultar el resto de publicaciones.', reviewLabel: 'Revisar {title}' },
  fr: { all: 'Toutes', pending: 'En attente', verified: 'Vérifiées', restricted: 'Restreintes', verifiedOne: 'Vérifiée', restrictedOne: 'Restreinte', pendingOne: 'En attente', title: 'Supervision des logements', subtitle: 'Consultez le statut opérationnel et de vérification des annonces.', loadingTitle: 'Chargement des logements', loadingBody: 'Nous consultons les annonces disponibles pour l’administration.', errorTitle: 'Impossible de charger les logements', emptyTitle: 'Aucun logement dans ce statut', emptyBody: 'Choisissez un autre filtre pour voir les autres annonces.', reviewLabel: 'Examiner {title}' },
  en: { all: 'All', pending: 'Pending', verified: 'Verified', restricted: 'Restricted', verifiedOne: 'Verified', restrictedOne: 'Restricted', pendingOne: 'Pending', title: 'Property oversight', subtitle: 'Check the operational and verification status of listings.', loadingTitle: 'Loading properties', loadingBody: 'We are fetching the listings available to administrators.', errorTitle: 'We could not load the properties', emptyTitle: 'No properties with this status', emptyBody: 'Pick another filter to see the rest of the listings.', reviewLabel: 'Review {title}' },
});
type PropertiesCopy = (typeof propertiesCopy)['es'];
const filters: LegalFilter[] = ['all', 'pending', 'verified', 'restricted'];

function legalPresentation(status: AdminProperty['legalStatus'], copy: PropertiesCopy) {
  if (status === 'verified') return { label: copy.verifiedOne, tone: colors.success, icon: CheckCircle2 };
  if (status === 'restricted') return { label: copy.restrictedOne, tone: colors.error, icon: XCircle };
  return { label: copy.pendingOne, tone: colors.warning, icon: Clock };
}

export default function AdminProperties() {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(propertiesCopy);
  const shared = useCopy(adminCopy);
  const properties = useQuery({ queryKey: ['admin', 'properties'], queryFn: fetchAdminProperties });
  const [filter, setFilter] = useState<LegalFilter>('pending');
  const filteredProperties = useMemo(() => (properties.data ?? []).filter((property) => filter === 'all' || property.legalStatus === filter), [filter, properties.data]);

  return (
    <RouteScreen
      title={copy.title}
      description={copy.subtitle}
      headerContent={properties.data ? <HeroBadge label={interpolate(shared.visibleCount, { count: filteredProperties.length })} icon={Building2} /> : undefined}
    >
      <View style={styles.filters}>
        {filters.map((item) => {
          const selected = item === filter;
          return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.filterText, { color: selected ? 'white' : palette.textSecondary }]}>{copy[item]}</Text></Pressable>;
        })}
      </View>

      {properties.isLoading ? <PremiumEmptyState icon={Building2} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {properties.isError ? <PremiumErrorState title={copy.errorTitle} description={shared.retryBody} onRetry={() => void properties.refetch()} /> : null}
      {!properties.isLoading && !properties.isError && !filteredProperties.length ? <PremiumEmptyState icon={ShieldCheck} title={copy.emptyTitle} description={copy.emptyBody} /> : null}

      <View style={styles.list}>
        {filteredProperties.map((property) => {
          const legal = legalPresentation(property.legalStatus, copy);
          return (
            <Pressable key={property.id} accessibilityRole="button" accessibilityLabel={interpolate(copy.reviewLabel, { title: property.title })} onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <View style={[styles.imageWrap, { backgroundColor: palette.subtle }]}>{property.imageUrl ? <Image source={{ uri: property.imageUrl }} contentFit="cover" cachePolicy="disk" style={styles.image} /> : <Building2 color={palette.muted} size={28} />}</View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.location}><MapPin color={palette.textSecondary} size={15} /><Text numberOfLines={1} style={[styles.locationText, { color: palette.textSecondary }]}>{property.location}</Text></View>
                <View style={styles.badges}><StatusPill label={legal.label} tone={legal.tone} icon={legal.icon} /><StatusPill label={statusLabel(property.status, locale)} tone={colors.brand} /></View>
              </View>
              <ArrowRight color={palette.muted} size={20} />
            </Pressable>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  list: { gap: 10 },
  card: { minHeight: 104, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  imageWrap: { width: 88, height: 82, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 15, fontFamily: fontFamily.bold },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});

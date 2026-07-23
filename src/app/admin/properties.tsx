import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, CheckCircle2, Clock, MapPin, ShieldCheck, XCircle } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchAdminProperties, type AdminProperty } from '@/features/admin/admin.api';
import { useAppTheme } from '@/providers/theme-context';

type LegalFilter = 'all' | AdminProperty['legalStatus'];
const filters: { value: LegalFilter; label: string }[] = [{ value: 'all', label: 'Todas' }, { value: 'pending', label: 'Pendientes' }, { value: 'verified', label: 'Verificadas' }, { value: 'restricted', label: 'Restringidas' }];

function legalPresentation(status: AdminProperty['legalStatus']) {
  if (status === 'verified') return { label: 'Verificada', tone: colors.success, icon: CheckCircle2 };
  if (status === 'restricted') return { label: 'Restringida', tone: colors.error, icon: XCircle };
  return { label: 'Pendiente', tone: colors.warning, icon: Clock };
}

export default function AdminProperties() {
  const { palette } = useAppTheme();
  const properties = useQuery({ queryKey: ['admin', 'properties'], queryFn: fetchAdminProperties });
  const [filter, setFilter] = useState<LegalFilter>('pending');
  const filteredProperties = useMemo(() => (properties.data ?? []).filter((property) => filter === 'all' || property.legalStatus === filter), [filter, properties.data]);

  return (
    <RouteScreen title="Supervisión de propiedades" description="Consulta el estado operativo y de verificación de las publicaciones.">
      <View style={[styles.notice, { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}24` }]}><ShieldCheck color={colors.brand} size={23} /><Text style={[styles.noticeText, { color: palette.textSecondary }]}>Las decisiones administrativas deben confirmarse en el servidor y quedan sujetas a las políticas de acceso.</Text></View>
      <View style={styles.filters}>
        {filters.map((item) => {
          const selected = item.value === filter;
          return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item.value)} style={[styles.filter, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.filterText, { color: selected ? 'white' : palette.textSecondary }]}>{item.label}</Text></Pressable>;
        })}
      </View>
      <SectionTitle title="Publicaciones" detail="Abre una propiedad para revisar su ficha pública completa." action={properties.data ? <StatusPill label={`${filteredProperties.length} visibles`} icon={Building2} /> : undefined} />

      {properties.isLoading ? <PremiumEmptyState icon={Building2} title="Cargando propiedades" description="Estamos consultando las publicaciones disponibles para administración." loading /> : null}
      {properties.isError ? <PremiumErrorState title="No pudimos cargar las propiedades" description="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void properties.refetch()} /> : null}
      {!properties.isLoading && !properties.isError && !filteredProperties.length ? <PremiumEmptyState icon={ShieldCheck} title="No hay propiedades en este estado" description="Selecciona otro filtro para consultar el resto de publicaciones." /> : null}

      <View style={styles.list}>
        {filteredProperties.map((property) => {
          const legal = legalPresentation(property.legalStatus);
          return (
            <Pressable key={property.id} accessibilityRole="button" accessibilityLabel={`Revisar ${property.title}`} onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <View style={[styles.imageWrap, { backgroundColor: palette.subtle }]}>{property.imageUrl ? <Image source={{ uri: property.imageUrl }} contentFit="cover" cachePolicy="disk" style={styles.image} /> : <Building2 color={palette.muted} size={28} />}</View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{property.title}</Text>
                <View style={styles.location}><MapPin color={palette.textSecondary} size={15} /><Text numberOfLines={1} style={[styles.locationText, { color: palette.textSecondary }]}>{property.location}</Text></View>
                <View style={styles.badges}><StatusPill label={legal.label} tone={legal.tone} icon={legal.icon} /><StatusPill label={property.status} tone={colors.brand} /></View>
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
  notice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 40, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontWeight: '800' },
  list: { gap: 10 },
  card: { minHeight: 104, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  imageWrap: { width: 88, height: 82, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 15, fontWeight: '900' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, fontSize: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});

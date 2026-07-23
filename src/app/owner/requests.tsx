import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { Calendar, CheckCircle2, Clock, Inbox, MapPinned, XCircle } from '@/components/ui/icons';
import { IconTile, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchOwnerVisitRequests } from '@/features/properties/api/visit-requests';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

function statusPresentation(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'confirmed' || normalized === 'accepted') return { label: 'Confirmada', tone: colors.success, icon: CheckCircle2 };
  if (normalized === 'cancelled' || normalized === 'rejected') return { label: 'Cancelada', tone: colors.error, icon: XCircle };
  return { label: 'Pendiente', tone: colors.warning, icon: Clock };
}

export default function OwnerRequests() {
  const { palette } = useAppTheme();
  const requests = useQuery({ queryKey: ['owner', 'visit-requests'], queryFn: fetchOwnerVisitRequests });
  const pending = (requests.data ?? []).filter((request) => request.status.toLowerCase() === 'pending').length;

  return (
    <RouteScreen title="Solicitudes de visita" description="Revisa las próximas visitas y mantén cada solicitud bajo control.">
      <SectionTitle title="Agenda" detail="Las solicitudes más recientes aparecen primero." action={pending ? <StatusPill label={`${pending} pendientes`} tone={colors.warning} icon={Clock} /> : undefined} />
      {requests.isLoading ? <PremiumEmptyState icon={Calendar} title="Preparando tu agenda" description="Estamos sincronizando las solicitudes de visita." loading /> : null}
      {requests.isError ? <PremiumErrorState title="No pudimos abrir las solicitudes" description="Comprueba tu conexión y vuelve a intentarlo." onRetry={() => void requests.refetch()} /> : null}
      {!requests.isLoading && !requests.isError && !requests.data?.length ? <PremiumEmptyState icon={Inbox} title="No hay solicitudes todavía" description="Cuando un cliente solicite visitar una propiedad, aparecerá aquí con la fecha propuesta." /> : null}

      <View style={styles.list}>
        {requests.data?.map((request) => {
          const status = statusPresentation(request.status);
          return (
            <View key={request.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <IconTile icon={MapPinned} tone={status.tone} size={48} />
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{request.propertyTitle}</Text>
                  <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
                </View>
                <View style={styles.dateRow}><Calendar color={palette.textSecondary} size={16} /><Text selectable style={[styles.date, { color: palette.textSecondary }]}>{formatDate(request.proposedAt)}</Text></View>
                <Text style={[styles.hint, { color: palette.muted }]}>Solicitud #{request.id.slice(0, 8).toUpperCase()}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { minHeight: 106, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, boxShadow: '0 9px 24px rgba(15,23,42,0.05)' },
  copy: { flex: 1, minWidth: 0, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { flex: 1, minWidth: 130, fontSize: 16, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  hint: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Calendar, CheckCircle2, Clock, MapPinned, XCircle } from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import type { VisitRequest } from '@/features/properties/api/visit-requests';
import type { VisitRequestStatus } from '@/features/visits/visit-schedule';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const statusCopy = defineCopy({
  es: { pending: 'Pendiente', accepted: 'Confirmada', rejected: 'Rechazada', cancelled: 'Cancelada', completed: 'Realizada', note: 'Mensaje' },
  fr: { pending: 'En attente', accepted: 'Confirmée', rejected: 'Refusée', cancelled: 'Annulée', completed: 'Effectuée', note: 'Message' },
  en: { pending: 'Pending', accepted: 'Confirmed', rejected: 'Declined', cancelled: 'Cancelled', completed: 'Completed', note: 'Message' },
});

const statusTone: Record<VisitRequestStatus, { tone: string; icon: typeof Clock }> = {
  pending: { tone: colors.warning, icon: Clock },
  accepted: { tone: colors.success, icon: CheckCircle2 },
  rejected: { tone: colors.error, icon: XCircle },
  cancelled: { tone: colors.muted, icon: XCircle },
  completed: { tone: colors.brand, icon: CheckCircle2 },
};

export type VisitRequestAction = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
};

type VisitRequestCardProps = {
  request: VisitRequest;
  actions?: VisitRequestAction[];
  busy?: boolean;
  onOpenProperty?: () => void;
};

export function VisitRequestCard({ request, actions = [], busy = false, onOpenProperty }: VisitRequestCardProps) {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(statusCopy);
  const status = statusTone[request.status];
  const date = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(request.proposedAt));

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        accessibilityRole={onOpenProperty ? 'button' : undefined}
        disabled={!onOpenProperty}
        onPress={onOpenProperty}
        style={styles.header}
      >
        <IconTile icon={MapPinned} tone={status.tone} size={48} />
        <View style={styles.copy}>
          <Text numberOfLines={2} style={[styles.title, { color: palette.text }]}>{request.propertyTitle}</Text>
          <View style={styles.dateRow}>
            <Calendar color={palette.textSecondary} size={16} />
            <Text selectable style={[styles.date, { color: palette.textSecondary }]}>{date}</Text>
          </View>
          <View style={styles.pill}>
            <StatusPill label={copy[request.status]} tone={status.tone} icon={status.icon} />
          </View>
        </View>
      </Pressable>

      {request.note ? (
        <View style={[styles.note, { backgroundColor: palette.subtle }]}>
          <Text style={[styles.noteLabel, { color: palette.textSecondary }]}>{copy.note}</Text>
          <Text selectable style={[styles.noteText, { color: palette.text }]}>{request.note}</Text>
        </View>
      ) : null}

      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <PremiumButton
              key={action.label}
              label={action.label}
              variant={action.variant ?? 'secondary'}
              disabled={busy}
              onPress={action.onPress}
              style={styles.action}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 15, gap: 12, boxShadow: '0 9px 24px rgba(15,23,42,0.05)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.bold, textTransform: 'capitalize' },
  pill: { flexDirection: 'row' },
  note: { borderRadius: radius.md, borderCurve: 'continuous', padding: 12, gap: 3 },
  noteLabel: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  noteText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});

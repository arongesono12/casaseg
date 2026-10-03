import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { Calendar, CheckCircle2, Clock } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, SectionTitle } from '@/components/ui/premium';
import { radius, type AppPalette } from '@/constants/theme';
import { createVisitRequest, visitRequestKeys } from '@/features/properties/api/visit-requests';
import { useProperty } from '@/features/properties/hooks/use-properties';
import {
  buildVisitDays,
  buildVisitSlot,
  dayHasAvailableSlots,
  isSlotAvailable,
  VISIT_HOURS,
} from '@/features/visits/visit-schedule';
import { haptics } from '@/lib/haptics';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const visitCopy = defineCopy({
  es: {
    title: 'Solicitar visita',
    subtitle: 'Elige día y hora; el propietario confirmará la visita.',
    forProperty: 'Visita a {title}',
    day: 'Día',
    dayDetail: 'Próximas dos semanas.',
    time: 'Hora',
    timeDetail: 'Las horas con menos de dos horas de antelación no están disponibles.',
    message: 'Mensaje para el propietario (opcional)',
    messagePlaceholder: 'Por ejemplo: vendré con mi pareja.',
    send: 'Enviar solicitud',
    sending: 'Enviando…',
    pickSlot: 'Elige una hora para continuar',
    sentTitle: 'Solicitud enviada',
    sentBody: 'El propietario ha recibido tu solicitud para el {date}. Te avisaremos cuando la confirme.',
    duplicatedTitle: 'Ya tenías una solicitud',
    duplicatedBody: 'Tienes otra solicitud pendiente para esta vivienda. Puedes revisarla en Mis visitas.',
    myVisits: 'Ver mis visitas',
    back: 'Volver a la vivienda',
  },
  fr: {
    title: 'Demander une visite',
    subtitle: 'Choisissez une date et une heure ; l’hôte confirmera la visite.',
    forProperty: 'Visite de {title}',
    day: 'Jour',
    dayDetail: 'Les deux prochaines semaines.',
    time: 'Heure',
    timeDetail: 'Les créneaux à moins de deux heures ne sont pas disponibles.',
    message: 'Message pour l’hôte (facultatif)',
    messagePlaceholder: 'Par exemple : je viendrai avec mon conjoint.',
    send: 'Envoyer la demande',
    sending: 'Envoi…',
    pickSlot: 'Choisissez une heure pour continuer',
    sentTitle: 'Demande envoyée',
    sentBody: 'L’hôte a reçu votre demande pour le {date}. Nous vous préviendrons dès qu’il la confirmera.',
    duplicatedTitle: 'Vous aviez déjà une demande',
    duplicatedBody: 'Une autre demande est en attente pour ce logement. Retrouvez-la dans Mes visites.',
    myVisits: 'Voir mes visites',
    back: 'Retour au logement',
  },
  en: {
    title: 'Request a visit',
    subtitle: 'Pick a date and time; the host will confirm the visit.',
    forProperty: 'Visit to {title}',
    day: 'Day',
    dayDetail: 'The next two weeks.',
    time: 'Time',
    timeDetail: 'Times less than two hours away are not available.',
    message: 'Message for the host (optional)',
    messagePlaceholder: 'For example: I will come with my partner.',
    send: 'Send request',
    sending: 'Sending…',
    pickSlot: 'Pick a time to continue',
    sentTitle: 'Request sent',
    sentBody: 'The host received your request for {date}. We will let you know when they confirm.',
    duplicatedTitle: 'You already had a request',
    duplicatedBody: 'Another request for this home is still pending. You can review it in My visits.',
    myVisits: 'See my visits',
    back: 'Back to the home',
  },
});

const MAX_NOTE_LENGTH = 500;

export default function VisitRequestScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { locale } = useI18n();
  const copy = useCopy(visitCopy);
  const { palette } = useAppTheme();
  const queryClient = useQueryClient();
  const property = useProperty(propertyId);
  // Se fija al abrir la pantalla: recalcularlo en cada render movería la
  // selección mientras el usuario escribe.
  const [now] = useState(() => new Date());
  const days = useMemo(() => buildVisitDays(now).filter((day) => dayHasAvailableSlots(day, now)), [now]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const day = days[selectedDay];
  const slot = day && selectedHour !== null ? buildVisitSlot(day, selectedHour) : null;
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }), [locale]);
  const fullFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    [locale],
  );

  const request = useMutation({
    mutationFn: (proposedAt: Date) => createVisitRequest(propertyId, proposedAt, note.slice(0, MAX_NOTE_LENGTH)),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: visitRequestKeys.all });
    },
    onError: () => haptics.error(),
  });

  if (request.isSuccess) {
    const duplicated = request.data.duplicated;
    return (
      <RouteScreen title={copy.title} description={copy.subtitle}>
        <PremiumEmptyState
          icon={duplicated ? Clock : CheckCircle2}
          title={duplicated ? copy.duplicatedTitle : copy.sentTitle}
          description={duplicated ? copy.duplicatedBody : interpolate(copy.sentBody, { date: fullFormatter.format(request.variables) })}
          actionLabel={copy.myVisits}
          onAction={() => router.replace('/visits' as Href)}
        />
        <PremiumButton label={copy.back} variant="secondary" onPress={() => router.back()} />
      </RouteScreen>
    );
  }

  const selectDay = (index: number) => {
    haptics.selection();
    setSelectedDay(index);
    // La hora elegida puede no existir el otro día (hoy tiene menos horas).
    setSelectedHour(null);
  };

  const selectHour = (hour: number) => {
    haptics.selection();
    setSelectedHour(hour);
  };

  return (
    <RouteScreen
      title={copy.title}
      description={property.data ? interpolate(copy.forProperty, { title: property.data.title }) : copy.subtitle}
    >
      <SectionTitle title={copy.day} detail={copy.dayDetail} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {days.map((option, index) => {
          const selected = index === selectedDay;
          return (
            <Chip
              key={option.toISOString()}
              selected={selected}
              palette={palette}
              onPress={() => selectDay(index)}
              accessibilityLabel={dateFormatter.format(option)}
              style={styles.dayChip}
            >
              <Text style={[styles.dayName, { color: selected ? 'white' : palette.textSecondary }]}>{dayFormatter.format(option)}</Text>
              <Text style={[styles.dayNumber, { color: selected ? 'white' : palette.text }]}>{option.getDate()}</Text>
            </Chip>
          );
        })}
      </ScrollView>

      <SectionTitle title={copy.time} detail={copy.timeDetail} />
      <View style={styles.timeGrid}>
        {day
          ? VISIT_HOURS.map((hour) => {
              const available = isSlotAvailable(buildVisitSlot(day, hour), now);
              const selected = hour === selectedHour;
              const label = `${String(hour).padStart(2, '0')}:00`;
              return (
                <Chip
                  key={hour}
                  selected={selected}
                  disabled={!available}
                  palette={palette}
                  onPress={() => selectHour(hour)}
                  accessibilityLabel={label}
                  style={styles.timeChip}
                >
                  <Text style={[styles.timeText, { color: selected ? 'white' : available ? palette.text : palette.muted }]}>{label}</Text>
                </Chip>
              );
            })
          : null}
      </View>

      <FormField
        label={copy.message}
        placeholder={copy.messagePlaceholder}
        value={note}
        onChangeText={setNote}
        maxLength={MAX_NOTE_LENGTH}
        multiline
      />

      {slot ? (
        <View style={[styles.summary, { backgroundColor: palette.brandSoft }]}>
          <Calendar color={palette.brandIcon} size={20} />
          <Text style={[styles.summaryText, { color: palette.text }]}>{fullFormatter.format(slot)}</Text>
        </View>
      ) : null}

      <PremiumButton
        label={request.isPending ? copy.sending : slot ? copy.send : copy.pickSlot}
        loading={request.isPending}
        disabled={!slot}
        onPress={() => {
          if (slot) request.mutate(slot);
        }}
      />
      {request.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{request.error.message}</Text>
      ) : null}
    </RouteScreen>
  );
}

type ChipProps = {
  selected: boolean;
  disabled?: boolean;
  palette: AppPalette;
  onPress: () => void;
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
};

function Chip({ selected, disabled = false, palette, onPress, accessibilityLabel, style, children }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        style,
        selected
          ? { backgroundColor: palette.brand, borderColor: palette.brand }
          : { backgroundColor: palette.surface, borderColor: palette.border },
        disabled && styles.chipDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayRow: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  chipDisabled: { opacity: 0.4 },
  dayChip: { width: 62, height: 74, gap: 2 },
  dayName: { fontSize: 12, lineHeight: 16, fontWeight: '700', textTransform: 'capitalize' },
  dayNumber: { fontSize: 20, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  // flexBasis + flexGrow: cuatro horas por fila en móvil sin calcular anchos.
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { flexBasis: 72, flexGrow: 1, height: 48 },
  timeText: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summary: { minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.8 },
});

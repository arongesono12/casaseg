import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { CheckCircle2, Clock, X } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { fontFamily, radius, spacing, typography, type AppPalette } from '@/constants/theme';
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
import { iconRipple, pressRipple } from '@/lib/press-feedback';
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

/** Solicitud de visita del rediseño B: hoja modal con cabecera ✕, preguntas y barra de acciones. */
export default function VisitRequestScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { locale, t } = useI18n();
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

  const header = (
    <View style={[styles.header, { borderBottomColor: palette.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} android_ripple={iconRipple(48)} hitSlop={6} onPress={() => router.back()} style={styles.close}>
        <X color={palette.text} size={22} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, { color: palette.text }]}>{copy.title}</Text>
      <View style={styles.close} />
    </View>
  );

  if (request.isSuccess) {
    const duplicated = request.data.duplicated;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.surface }]}>
        {header}
        <View style={styles.sent}>
          <View style={[styles.sentIcon, { backgroundColor: palette.brandSoft }]}>
            {duplicated ? <Clock color={palette.brandIcon} size={32} /> : <CheckCircle2 color={palette.brandIcon} size={32} />}
          </View>
          <Text style={[typography.title, styles.center, { color: palette.text }]}>{duplicated ? copy.duplicatedTitle : copy.sentTitle}</Text>
          <Text style={[typography.body, styles.center, { color: palette.textSecondary }]}>
            {duplicated ? copy.duplicatedBody : interpolate(copy.sentBody, { date: fullFormatter.format(request.variables) })}
          </Text>
          <PremiumButton label={copy.myVisits} onPress={() => router.replace('/visits' as Href)} style={styles.sentButton} />
          <PremiumButton label={copy.back} variant="secondary" onPress={() => router.back()} style={styles.sentButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.surface }]}>
      {header}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {property.data ? (
          <View style={[styles.summary, { borderBottomColor: palette.border }]}>
            <Image source={{ uri: property.data.imageUrls[0] }} contentFit="cover" style={[styles.summaryImage, { backgroundColor: palette.subtle }]} />
            <View style={styles.flex}>
              <Text numberOfLines={2} style={[styles.summaryTitle, { color: palette.text }]}>{property.data.title}</Text>
              <Text numberOfLines={1} style={[styles.caption, { color: palette.textSecondary }]}>{t('ownerBy', { name: property.data.ownerName })}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.question}>
          <Text style={[typography.heading, { color: palette.text }]}>{t('visitDayQuestion')}</Text>
          <Text style={[styles.caption, { color: palette.textSecondary }]}>{copy.dayDetail}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((option, index) => {
            const selected = index === selectedDay;
            return (
              <Chip key={option.toISOString()} selected={selected} palette={palette} onPress={() => selectDay(index)} accessibilityLabel={dateFormatter.format(option)} style={styles.dayChip}>
                <Text style={[styles.dayName, { color: selected ? palette.brandText : palette.textSecondary }]}>{dayFormatter.format(option)}</Text>
                <Text style={[styles.dayNumber, { color: selected ? palette.brandText : palette.text }]}>{option.getDate()}</Text>
              </Chip>
            );
          })}
        </ScrollView>

        <View style={styles.question}>
          <Text style={[typography.heading, { color: palette.text }]}>{t('visitTimeQuestion')}</Text>
          <Text style={[styles.caption, { color: palette.textSecondary }]}>{copy.timeDetail}</Text>
        </View>
        <View style={styles.timeGrid}>
          {day
            ? VISIT_HOURS.map((hour) => {
                const available = isSlotAvailable(buildVisitSlot(day, hour), now);
                const selected = hour === selectedHour;
                const label = `${String(hour).padStart(2, '0')}:00`;
                return (
                  <Chip key={hour} selected={selected} disabled={!available} palette={palette} onPress={() => selectHour(hour)} accessibilityLabel={label} style={styles.timeChip}>
                    <Text style={[styles.timeText, { color: selected ? palette.brandText : available ? palette.text : palette.muted }]}>{label}</Text>
                  </Chip>
                );
              })
            : null}
        </View>

        <FormField label={copy.message} placeholder={copy.messagePlaceholder} value={note} onChangeText={setNote} maxLength={MAX_NOTE_LENGTH} multiline />
        {slot ? <Text style={[styles.caption, { color: palette.text }]}>{fullFormatter.format(slot)}</Text> : null}
        {request.error ? <Text accessibilityRole="alert" style={[styles.caption, { color: palette.errorText }]}>{request.error.message}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Pressable accessibilityRole="button" android_ripple={pressRipple} onPress={() => router.back()} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: palette.text }]}>{t('cancel')}</Text>
        </Pressable>
        <PremiumButton
          label={request.isPending ? copy.sending : slot ? copy.send : copy.pickSlot}
          loading={request.isPending}
          disabled={!slot}
          onPress={() => {
            if (slot) request.mutate(slot);
          }}
          style={styles.flexButton}
        />
      </View>
    </SafeAreaView>
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
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      android_ripple={pressRipple}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        style,
        selected
          ? { backgroundColor: palette.brandSoft, borderColor: palette.brandIcon, borderWidth: 2 }
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
  safe: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: fontFamily.bold },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: spacing.xxl, gap: spacing.lg },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryImage: { width: 96, height: 72, borderRadius: radius.sm },
  summaryTitle: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  question: { gap: 2, marginTop: spacing.sm },
  dayRow: { gap: 10, paddingVertical: 2 },
  chip: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipDisabled: { opacity: 0.4 },
  dayChip: { width: 70, height: 78, borderRadius: radius.xl, borderCurve: 'continuous', gap: 2 },
  dayName: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 17, textTransform: 'capitalize' },
  dayNumber: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { height: 46, paddingHorizontal: 18, borderRadius: radius.pill },
  timeText: { fontSize: 15, fontFamily: fontFamily.semibold, fontVariant: ['tabular-nums'] },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.xxl, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  cancel: { minHeight: 48, borderRadius: radius.pill, justifyContent: 'center' },
  cancelText: { fontSize: 16, fontFamily: fontFamily.semibold, textDecorationLine: 'underline' },
  flexButton: { flex: 1 },
  sent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  sentIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sentButton: { alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
});

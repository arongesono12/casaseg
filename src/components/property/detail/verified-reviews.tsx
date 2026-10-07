import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ShieldCheck, Star } from '@/components/ui/icons';
import { typography } from '@/constants/theme';
import { fetchVerifiedPropertyReviews } from '@/features/compliance/compliance.api';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const reviewsCopy = defineCopy({
  es: { title: 'Reseñas verificadas', empty: 'Aún no hay reseñas. Solo pueden opinar quienes han alquilado esta vivienda con contrato firmado y pagado en CasaSeg.', error: 'No se pudieron cargar las reseñas.', badge: 'Estancia verificada' },
  fr: { title: 'Avis vérifiés', empty: 'Pas encore d’avis. Seules les personnes ayant loué ce logement avec un contrat signé et payé sur CasaSeg peuvent donner leur avis.', error: 'Impossible de charger les avis.', badge: 'Séjour vérifié' },
  en: { title: 'Verified reviews', empty: 'No reviews yet. Only people who rented this home with a signed and paid CasaSeg contract can review it.', error: 'The reviews could not be loaded.', badge: 'Verified stay' },
});

/**
 * Reseñas de estancias reales (property_reviews), las mismas que muestra la
 * web. Se escriben desde Contratos cuando el alquiler está firmado y pagado.
 */
export function VerifiedReviews({ propertyId }: { propertyId: string }) {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(reviewsCopy);
  const reviews = useQuery({ queryKey: ['property-reviews', propertyId], queryFn: () => fetchVerifiedPropertyReviews(propertyId) });

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[typography.title, { color: palette.text }]}>{copy.title}</Text>
      {reviews.isPending ? <ActivityIndicator color={palette.brandIcon} /> : null}
      {reviews.isError ? <Text style={{ color: palette.errorText }}>{copy.error}</Text> : null}
      {reviews.isSuccess && !reviews.data.length ? <Text style={[typography.body, { color: palette.textSecondary }]}>{copy.empty}</Text> : null}
      {reviews.data?.map((review) => (
        <View key={review.id} style={[styles.review, { borderColor: palette.border }]}>
          <View style={styles.header}>
            <View style={styles.stars} accessibilityLabel={`${review.rating}/5`}>
              {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} color={palette.brandIcon} fill={review.rating >= value ? palette.brandIcon : 'transparent'} />)}
            </View>
            <Text style={[styles.date, { color: palette.textSecondary }]}>{formatDate(review.createdAt, locale)}</Text>
          </View>
          {review.comment ? <Text selectable style={[typography.body, { color: palette.text }]}>{review.comment}</Text> : null}
          <View style={styles.badge}><ShieldCheck size={14} color={palette.textSecondary} /><Text style={[styles.date, { color: palette.textSecondary }]}>{copy.badge}</Text></View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14, borderWidth: 1, borderRadius: 20 },
  review: { gap: 6, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  date: { fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

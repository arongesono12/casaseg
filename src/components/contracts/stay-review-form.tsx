import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Star } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { createVerifiedPropertyReview } from '@/features/compliance/compliance.api';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const reviewCopy = defineCopy({
  es: { title: 'Valora tu estancia', comment: 'Cuéntanos cómo fue (opcional)', submit: 'Publicar reseña', star: '{count} estrellas', thanks: 'Gracias. Tu reseña verificada ya es visible en la vivienda.' },
  fr: { title: 'Évaluez votre séjour', comment: 'Racontez-nous (facultatif)', submit: 'Publier l’avis', star: '{count} étoiles', thanks: 'Merci. Votre avis vérifié est visible sur le logement.' },
  en: { title: 'Rate your stay', comment: 'Tell us how it went (optional)', submit: 'Publish review', star: '{count} stars', thanks: 'Thank you. Your verified review is now visible on the home.' },
});

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Reseña verificada de una estancia, igual que en la web: solo la ofrece quien
 * pasa getReviewEligibility y el servidor vuelve a comprobarlo en
 * create_verified_property_review (una reseña por contrato firmado y pagado).
 */
export function StayReviewForm({ contractId, reviewQueryKey }: { contractId: string; reviewQueryKey: readonly unknown[] }) {
  const { palette } = useAppTheme();
  const copy = useCopy(reviewCopy);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => createVerifiedPropertyReview({ contractId, rating, comment }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewQueryKey }),
  });

  if (submit.isSuccess) return <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.thanks}</Text>;

  return (
    <View style={[styles.card, { backgroundColor: palette.subtle }]}>
      <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
      <View style={styles.stars}>
        {RATINGS.map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityLabel={interpolate(copy.star, { count: value })} accessibilityState={{ selected: rating === value }} hitSlop={6} onPress={() => setRating(value)}>
            <Star size={28} color={value <= rating ? colors.warning : palette.muted} fill={value <= rating ? colors.warning : 'transparent'} />
          </Pressable>
        ))}
      </View>
      <TextInput accessibilityLabel={copy.comment} value={comment} onChangeText={setComment} placeholder={copy.comment} placeholderTextColor={palette.muted} multiline maxLength={1000} style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
      <PremiumButton label={copy.submit} loading={submit.isPending} disabled={rating === 0} onPress={() => submit.mutate()} />
      {submit.error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{submit.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  title: { fontSize: 15, fontFamily: fontFamily.bold },
  stars: { flexDirection: 'row', gap: 10 },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  input: { fontFamily: fontFamily.regular, minHeight: 80, borderRadius: radius.md, borderWidth: 1, padding: 12, fontSize: 15, textAlignVertical: 'top' },
});

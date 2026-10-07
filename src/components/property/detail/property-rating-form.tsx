import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Star } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { typography } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';

const copy = {
  es: { title: 'Valora esta vivienda', login: 'Inicia sesión para valorar', hint: 'Clientes y visitantes con cuenta pueden valorar una vez y actualizar su voto.', comment: 'Comentario (opcional)', save: 'Guardar valoración', saved: 'Valoración guardada.', failed: 'No se pudo guardar. Comprueba tu conexión y vuelve a intentarlo.', loadFailed: 'No se pudo cargar tu valoración.', retry: 'Reintentar', star: 'de 5 estrellas', restricted: 'Las valoraciones están reservadas a clientes. Los propietarios y administradores no pueden votar.', demo: 'Las valoraciones requieren conexión con CasaSeg.' },
  fr: { title: 'Évaluez ce logement', login: 'Connectez-vous pour évaluer', hint: 'Les clients et visiteurs avec un compte peuvent voter une fois et modifier leur note.', comment: 'Commentaire (facultatif)', save: 'Enregistrer la note', saved: 'Note enregistrée.', failed: 'Enregistrement impossible. Vérifiez votre connexion et réessayez.', loadFailed: 'Impossible de charger votre note.', retry: 'Réessayer', star: 'sur 5 étoiles', restricted: 'Seuls les clients peuvent voter. Les propriétaires et administrateurs ne peuvent pas voter.', demo: 'Les notes nécessitent une connexion à CasaSeg.' },
  en: { title: 'Rate this home', login: 'Sign in to rate', hint: 'Clients and visitors with an account can vote once and update their rating.', comment: 'Comment (optional)', save: 'Save rating', saved: 'Rating saved.', failed: 'Could not save. Check your connection and try again.', loadFailed: 'Could not load your rating.', retry: 'Retry', star: 'of 5 stars', restricted: 'Only clients can rate homes. Owners and administrators cannot vote.', demo: 'Ratings require a connection to CasaSeg.' },
} as const;

export function PropertyRatingForm({ property }: { property: Property }) {
  const { isAuthenticated, role, isRoleLoading } = useAuth();
  const profileId = useProfileId();
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const labels = copy[locale];
  const client = useQueryClient();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const eligible = isAuthenticated && role === 'client' && Boolean(profileId) && profileId !== property.ownerId;
  const own = useQuery({
    queryKey: ['property-rating', property.id, profileId],
    enabled: eligible && isSupabaseConfigured,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('reviews').select('rating,comment')
        .eq('property_id', property.id).eq('user_id', profileId!).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data as { rating: number; comment: string | null } | null;
    },
  });
  const selected = rating ?? own.data?.rating ?? 0;
  const text = comment ?? own.data?.comment ?? '';
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_property_rating', {
        p_property_id: property.id, p_rating: selected, p_comment: text,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: propertyKeys.all }),
        client.invalidateQueries({ queryKey: ['property-rating', property.id, profileId] }),
      ]);
    },
  });
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[typography.title, { color: palette.text }]}>{labels.title}</Text>
      {!isAuthenticated ? <PremiumButton label={labels.login} onPress={() => router.push('/(auth)/login')} variant="secondary" />
        : isRoleLoading ? <ActivityIndicator color={palette.brandIcon} />
        : !eligible ? <Text style={[typography.body, { color: palette.textSecondary }]}>{labels.restricted}</Text>
        : !isSupabaseConfigured ? <Text style={{ color: palette.textSecondary }}>{labels.demo}</Text>
        : own.isPending ? <ActivityIndicator color={palette.brandIcon} />
        : own.isError ? <><Text style={{ color: palette.errorText }}>{labels.loadFailed}</Text><PremiumButton label={labels.retry} onPress={() => { void own.refetch(); }} variant="secondary" /></>
        : <>
          <Text style={[typography.body, { color: palette.textSecondary }]}>{labels.hint}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} ${labels.star}`}
                accessibilityState={{ checked: selected === value, disabled: save.isPending }} disabled={save.isPending}
                onPress={() => { setRating(value); save.reset(); }}
                style={({ pressed }) => [styles.star, { backgroundColor: palette.subtle, opacity: pressed ? 0.6 : 1 }]}>
                <Star size={25} color={palette.brandIcon} fill={selected >= value ? palette.brandIcon : 'transparent'} />
              </Pressable>
            ))}
          </View>
          <TextInput accessibilityLabel={labels.comment} placeholder={labels.comment} placeholderTextColor={palette.textSecondary}
            value={text} onChangeText={(value) => { setComment(value); save.reset(); }} maxLength={2000} multiline
            editable={!save.isPending} style={[styles.input, typography.body, { color: palette.text, borderColor: palette.border }]} />
          {save.isError && <Text accessibilityRole="alert" style={{ color: palette.errorText }}>{labels.failed}</Text>}
          {save.isSuccess && <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{labels.saved}</Text>}
          <PremiumButton label={labels.save} onPress={() => save.mutate()} loading={save.isPending} disabled={!selected} />
        </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14, borderWidth: 1, borderRadius: 20 },
  stars: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  star: { minWidth: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  input: { minHeight: 100, padding: 12, borderWidth: 1, borderRadius: 12, textAlignVertical: 'top' },
});

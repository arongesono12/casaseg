import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { uploadKycDocument } from '@/features/owner/kyc-upload';
import { useOwnerDraft } from '@/features/owner/owner-draft.store';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const steps = [
  { title: 'personalData', field: 'fullName' },
  { title: 'phone', field: 'phone' },
  { title: 'address', field: 'address' },
  { title: 'document', field: null },
  { title: 'taxInfo', field: 'taxId' },
  { title: 'payoutMethod', field: 'payoutMethod' },
  { title: 'plan', field: 'plan' },
  { title: 'review', field: null },
  { title: 'confirmation', field: null },
] as const;

export default function OwnerOnboarding() {
  const draft = useOwnerDraft();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [documentSent, setDocumentSent] = useState(false);
  const [error, setError] = useState('');
  const current = steps[draft.step];
  const title = t(current.title);

  const go = (direction: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, draft.step + direction));
    draft.setField('step', next);
    if (draft.step === steps.length - 1 && direction > 0) {
      draft.reset();
      router.replace('/owner');
    }
  };

  const uploadDocument = async () => {
    try {
      setDocumentSent(await uploadKycDocument());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  };

  return (
    <RouteScreen title={title} description={t('stepOf', { current: String(draft.step + 1), total: String(steps.length) })}>
      <View style={[styles.progressTrack, { backgroundColor: palette.subtle }]}>
        <View style={[styles.progress, { width: `${((draft.step + 1) / steps.length) * 100}%` }]} />
      </View>

      {current.field ? (
        <TextInput
          accessibilityLabel={title}
          value={String(draft[current.field])}
          onChangeText={(value) => draft.setField(current.field!, value)}
          placeholder={title}
          placeholderTextColor={palette.muted}
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        />
      ) : (
        <View style={[styles.info, { backgroundColor: palette.surface }]}>
          <Text style={{ color: palette.textSecondary, lineHeight: 22 }}>{t('secureDocument')}</Text>
          {draft.step === 3 ? (
            <PremiumButton label={documentSent ? t('documentSent') : t('sendDocument')} onPress={() => void uploadDocument()} />
          ) : null}
          {error ? <Text accessibilityRole="alert" style={{ color: palette.errorText }}>{error}</Text> : null}
        </View>
      )}

      <View style={styles.actions}>
        {draft.step > 0 ? <PremiumButton variant="secondary" label={t('back')} onPress={() => go(-1)} style={styles.action} /> : null}
        <PremiumButton label={draft.step === steps.length - 1 ? t('confirm') : t('continue')} onPress={() => go(1)} style={styles.action} />
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progress: { height: 7, backgroundColor: colors.brand },
  input: { minHeight: 56, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16 },
  info: { borderRadius: radius.lg, padding: 18, gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { flex: 1, minWidth: 140 },
});

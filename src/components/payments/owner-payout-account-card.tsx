import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CheckCircle2, Clock, XCircle } from '@/components/ui/icons';
import { PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { fetchOwnerPaymentAccounts, payoutKeys, saveFondosEgAccount, type OwnerPaymentAccount } from '@/features/payments/owner-payouts.api';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const payoutCopy = defineCopy({
  es: { title: 'Cuenta de cobro FondosEG', body: 'Aquí recibirás los alquileres cobrados. Administración verifica la cuenta antes de la primera liquidación.', name: 'Titular de la cuenta', phone: 'Teléfono del monedero', city: 'Ciudad', save: 'Guardar cuenta', verified: 'Verificada', pending: 'En verificación', rejected: 'Rechazada' },
  fr: { title: 'Compte d’encaissement FondosEG', body: 'Vous y recevrez les loyers encaissés. L’administration vérifie le compte avant le premier versement.', name: 'Titulaire du compte', phone: 'Téléphone du portefeuille', city: 'Ville', save: 'Enregistrer le compte', verified: 'Vérifié', pending: 'En vérification', rejected: 'Refusé' },
  en: { title: 'FondosEG payout account', body: 'Collected rents are paid out here. Administration verifies the account before the first payout.', name: 'Account holder', phone: 'Wallet phone', city: 'City', save: 'Save account', verified: 'Verified', pending: 'Under verification', rejected: 'Rejected' },
});

function accountStatus(account: OwnerPaymentAccount, copy: (typeof payoutCopy)['es']) {
  if (account.status === 'verified') return { label: copy.verified, tone: colors.success, icon: CheckCircle2 };
  if (account.status === 'rejected') return { label: copy.rejected, tone: colors.error, icon: XCircle };
  return { label: copy.pending, tone: colors.warning, icon: Clock };
}

/** Alta y estado de la cuenta FondosEG del propietario, como en el panel web. */
export function OwnerPayoutAccountCard({ ownerId }: { ownerId: string }) {
  const { palette } = useAppTheme();
  const copy = useCopy(payoutCopy);
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: payoutKeys.accounts(ownerId), queryFn: () => fetchOwnerPaymentAccounts(ownerId) });
  const current = accounts.data?.find((account) => account.provider === 'fondoseg');
  const [accountName, setAccountName] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [destinationCity, setDestinationCity] = useState('Malabo');
  const save = useMutation({
    mutationFn: () => saveFondosEgAccount({ accountName, walletPhone, destinationCity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.accounts(ownerId) }),
  });

  const field = (value: string, onChange: (text: string) => void, label: string, keyboardType: 'default' | 'phone-pad' = 'default') => (
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={palette.muted} keyboardType={keyboardType} style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
  );

  return (
    <View style={[styles.card, { backgroundColor: palette.subtle }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
        {current ? <StatusPill {...accountStatus(current, copy)} /> : null}
      </View>
      <Text style={[styles.body, { color: palette.textSecondary }]}>{current ? `${current.accountName} · ${current.walletPhone}` : copy.body}</Text>
      {current?.rejectionReason ? <Text style={[styles.body, { color: palette.errorText }]}>{current.rejectionReason}</Text> : null}
      {!current || current.status === 'rejected' ? (
        <>
          {field(accountName, setAccountName, copy.name)}
          {field(walletPhone, setWalletPhone, copy.phone, 'phone-pad')}
          {field(destinationCity, setDestinationCity, copy.city)}
          <PremiumButton label={copy.save} loading={save.isPending} disabled={!accountName.trim() || !walletPhone.trim() || !destinationCity.trim()} onPress={() => save.mutate()} />
        </>
      ) : null}
      {save.error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{save.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 15, fontFamily: fontFamily.bold },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
});

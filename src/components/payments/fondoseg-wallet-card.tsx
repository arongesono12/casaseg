import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CheckCircle2, Wallet } from '@/components/ui/icons';
import { PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchWalletBalance, linkWallet, unlinkWallet, walletLinkKeys } from '@/features/payments/wallet-link.api';
import type { WalletLinkOutcome } from '@/features/payments/wallet-link-state';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

// Los textos son los de la web (rentalPayments.walletLink*).
const walletCopy = defineCopy({
  es: { title: 'Tu saldo FondosEG', prompt: 'Vincula tu billetera FondosEG para ver tu saldo antes de pagar. CasasEG solo podrá ver el saldo: nunca mover dinero ni ver tus movimientos.', link: 'Vincular billetera FondosEG', linked: 'Vinculada', balance: 'Saldo disponible', wallet: 'Billetera', refresh: 'Actualizar', unlink: 'Desvincular', loadError: 'No se pudo consultar tu billetera FondosEG.', completed: 'Billetera FondosEG vinculada. Ya puedes ver tu saldo antes de pagar.', denied: 'No autorizaste el acceso a tu saldo en FondosEG.', failed: 'No se pudo vincular tu billetera FondosEG. Inténtalo de nuevo.' },
  fr: { title: 'Votre solde FondosEG', prompt: 'Liez votre portefeuille FondosEG pour voir votre solde avant de payer. CasasEG pourra uniquement voir le solde : jamais déplacer d’argent ni voir vos mouvements.', link: 'Lier le portefeuille FondosEG', linked: 'Lié', balance: 'Solde disponible', wallet: 'Portefeuille', refresh: 'Actualiser', unlink: 'Délier', loadError: 'Impossible de consulter votre portefeuille FondosEG.', completed: 'Portefeuille FondosEG lié. Vous pouvez voir votre solde avant de payer.', denied: 'Vous n’avez pas autorisé l’accès à votre solde FondosEG.', failed: 'Impossible de lier votre portefeuille FondosEG. Réessayez.' },
  en: { title: 'Your FondosEG balance', prompt: 'Link your FondosEG wallet to see your balance before paying. CasasEG can only see the balance: it can never move money or see your transactions.', link: 'Link FondosEG wallet', linked: 'Linked', balance: 'Available balance', wallet: 'Wallet', refresh: 'Refresh', unlink: 'Unlink', loadError: 'Could not check your FondosEG wallet.', completed: 'FondosEG wallet linked. You can now see your balance before paying.', denied: 'You did not authorise access to your FondosEG balance.', failed: 'Could not link your FondosEG wallet. Try again.' },
});
type WalletCopy = (typeof walletCopy)['es'];

function outcomeNotice(outcome: WalletLinkOutcome, copy: WalletCopy): { text: string; tone: string } | null {
  if (outcome === 'linked') return { text: copy.completed, tone: colors.success };
  if (outcome === 'denied') return { text: copy.denied, tone: colors.warning };
  if (outcome === 'error') return { text: copy.failed, tone: colors.error };
  return null;
}

/** Vínculo de solo lectura con la billetera FondosEG, para inquilinos y propietarios. */
export function FondosEgWalletCard({ profileId }: { profileId: string }) {
  const { palette } = useAppTheme();
  const copy = useCopy(walletCopy);
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ text: string; tone: string } | null>(null);
  const balanceKey = walletLinkKeys.balance(profileId);
  const balance = useQuery({ queryKey: balanceKey, queryFn: fetchWalletBalance });
  const refreshBalance = () => queryClient.invalidateQueries({ queryKey: balanceKey });

  const link = useMutation({
    mutationFn: linkWallet,
    onSuccess: (outcome) => {
      setNotice(outcomeNotice(outcome, copy));
      // Aunque se cierre el navegador, la función pudo completar el vínculo.
      void refreshBalance();
    },
  });
  const unlink = useMutation({ mutationFn: unlinkWallet, onSuccess: () => { setNotice(null); void refreshBalance(); } });

  const data = balance.data;
  const error = link.error ?? unlink.error ?? balance.error;

  return (
    <View style={[styles.card, { backgroundColor: palette.subtle }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Wallet color={colors.brand} size={18} />
          <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
        </View>
        {data?.linked ? <StatusPill label={copy.linked} tone={colors.success} icon={CheckCircle2} /> : null}
      </View>

      {notice ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: notice.tone }]}>{notice.text}</Text> : null}

      {data?.linked ? (
        <>
          <View style={styles.row}>
            <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.balance}</Text>
            <Text style={[styles.amount, { color: palette.text }]}>{formatXaf(data.available)}</Text>
          </View>
          {data.walletPhoneMasked ? <Text style={[styles.body, { color: palette.textSecondary }]}>{`${copy.wallet} ${data.walletPhoneMasked}`}</Text> : null}
          <View style={styles.actions}>
            <PremiumButton variant="secondary" size="md" label={copy.refresh} loading={balance.isFetching} onPress={() => void balance.refetch()} />
            <PremiumButton variant="secondary" size="md" label={copy.unlink} loading={unlink.isPending} disabled={link.isPending} onPress={() => unlink.mutate()} />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.prompt}</Text>
          <PremiumButton label={copy.link} loading={link.isPending} disabled={balance.isLoading} onPress={() => link.mutate()} />
        </>
      )}

      {error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{error.message || copy.loadError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontFamily: fontFamily.bold },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amount: { fontFamily: fontFamily.extrabold, fontSize: 18 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});

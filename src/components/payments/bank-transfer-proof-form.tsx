import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CheckCircle2, FileText } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { fontFamily, radius, touchTarget } from '@/constants/theme';
import { fetchBankTransferSettings, receiptMimeTypes, submitBankTransferProof, type ReceiptFile } from '@/features/payments/bank-transfer.api';
import { paymentKeys, type PaymentOrder } from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const proofCopy = defineCopy({
  es: { title: 'Transferencia bancaria', reference: 'Referencia del pago: {reference}', noAccount: 'Administración todavía no ha publicado la cuenta de destino. Inténtalo más tarde.', bank: 'Banco', holder: 'Titular', account: 'Cuenta', sender: 'Nombre del ordenante', bankReference: 'Referencia del banco', pick: 'Elegir comprobante (PDF o imagen)', submit: 'Enviar comprobante', sent: 'Comprobante enviado. Administración lo revisará y confirmará el pago.' },
  fr: { title: 'Virement bancaire', reference: 'Référence du paiement : {reference}', noAccount: 'L’administration n’a pas encore publié le compte de destination. Réessayez plus tard.', bank: 'Banque', holder: 'Titulaire', account: 'Compte', sender: 'Nom du donneur d’ordre', bankReference: 'Référence bancaire', pick: 'Choisir le justificatif (PDF ou image)', submit: 'Envoyer le justificatif', sent: 'Justificatif envoyé. L’administration le vérifiera et confirmera le paiement.' },
  en: { title: 'Bank transfer', reference: 'Payment reference: {reference}', noAccount: 'Administration has not published the destination account yet. Try again later.', bank: 'Bank', holder: 'Account holder', account: 'Account', sender: 'Sender name', bankReference: 'Bank reference', pick: 'Choose receipt (PDF or image)', submit: 'Send receipt', sent: 'Receipt sent. Administration will review it and confirm the payment.' },
});

/**
 * Instrucciones de la cuenta de destino y subida del comprobante de una orden
 * por transferencia, igual que el panel de pago de la web. La orden pasa a
 * awaiting_review y administración la aprueba.
 */
export function BankTransferProofForm({ order, tenantId }: { order: PaymentOrder; tenantId: string }) {
  const { palette } = useAppTheme();
  const copy = useCopy(proofCopy);
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['bank-transfer-settings'], queryFn: fetchBankTransferSettings });
  const [senderName, setSenderName] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [receipt, setReceipt] = useState<ReceiptFile | null>(null);
  const submit = useMutation({
    mutationFn: () => {
      if (!receipt) throw new Error(copy.pick);
      return submitBankTransferProof({ order, tenantId, file: receipt, senderName, bankReference, transferredAt: new Date() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: [...receiptMimeTypes], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setReceipt({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf', size: asset.size ?? undefined });
  };

  const field = (value: string, onChange: (text: string) => void, label: string) => (
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={palette.muted} style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
  );

  if (submit.isSuccess) return <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.sent}</Text>;

  const account = settings.data;
  return (
    <View style={[styles.card, { backgroundColor: palette.subtle }]}>
      <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
      <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{interpolate(copy.reference, { reference: order.paymentReference })}</Text>
      {settings.isSuccess && !account ? <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.noAccount}</Text> : null}
      {account ? (
        <View style={styles.account}>
          <Text selectable style={[styles.body, { color: palette.text }]}>{copy.bank}: {account.bankName}</Text>
          <Text selectable style={[styles.body, { color: palette.text }]}>{copy.holder}: {account.accountHolder}</Text>
          <Text selectable style={[styles.body, { color: palette.text }]}>{copy.account}: {account.accountNumber}{account.iban ? ` · IBAN ${account.iban}` : ''}{account.swiftCode ? ` · SWIFT ${account.swiftCode}` : ''}</Text>
          {account.instructions ? <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{account.instructions}</Text> : null}
        </View>
      ) : null}
      {field(senderName, setSenderName, copy.sender)}
      {field(bankReference, setBankReference, copy.bankReference)}
      <PremiumButton variant="secondary" icon={receipt ? CheckCircle2 : FileText} label={receipt?.name ?? copy.pick} onPress={() => void pick()} />
      <PremiumButton label={copy.submit} loading={submit.isPending} disabled={!account || !receipt || !senderName.trim() || !bankReference.trim()} onPress={() => submit.mutate()} />
      {submit.error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{submit.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  title: { fontSize: 15, fontFamily: fontFamily.bold },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  account: { gap: 4 },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
});

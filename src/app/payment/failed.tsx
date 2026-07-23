import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowLeft, CreditCard, ShieldCheck, XCircle } from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

export default function PaymentFailed() {
  const { palette } = useAppTheme();
  return (
    <RouteScreen title="Pago no completado" description="No se ha confirmado ningún cargo.">
      <View style={[styles.result, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.resultIcon}><XCircle color={colors.error} size={46} /></View>
        <StatusPill label="Sin cargo confirmado" tone={colors.error} icon={XCircle} />
        <Text style={[styles.resultTitle, { color: palette.text }]}>La operación se detuvo</Text>
        <Text style={[styles.resultText, { color: palette.textSecondary }]}>Puedes revisar el estado en tu historial o volver a iniciar el pago cuando estés listo.</Text>
      </View>
      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={42} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>Si ves un movimiento inesperado, espera a que el proveedor actualice el estado antes de repetir la operación.</Text>
      </View>
      <PremiumButton label="Revisar pagos" icon={CreditCard} onPress={() => router.replace('/owner/payments')} />
      <PremiumButton variant="secondary" label="Volver" icon={ArrowLeft} onPress={() => router.back()} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 280, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 24, alignItems: 'center', justifyContent: 'center', gap: 11, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  resultIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: `${colors.error}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  resultTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  resultText: { maxWidth: 400, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

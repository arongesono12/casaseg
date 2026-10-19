import { PaymentsPanel } from '@/components/payments/payments-panel';
import { RouteScreen } from '@/components/route-screen';
import { useI18n } from '@/providers/i18n-context';

export default function Payments() {
  const { t } = useI18n();
  return (
    <RouteScreen title={t('payments')} description={t('paymentsSubtitle')}>
      <PaymentsPanel />
    </RouteScreen>
  );
}

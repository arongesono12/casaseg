import { ContractsPanel, usePendingSignatureLabel } from '@/components/contracts/contracts-panel';
import { RouteScreen } from '@/components/route-screen';
import { Lock } from '@/components/ui/icons';
import { HeroBadge } from '@/components/ui/premium';
import { useI18n } from '@/providers/i18n-context';

export default function Contracts() {
  const { t } = useI18n();
  const pendingLabel = usePendingSignatureLabel();

  return (
    <RouteScreen
      title={t('contracts')}
      description={t('contractsSubtitle')}
      headerContent={pendingLabel ? <HeroBadge label={pendingLabel} icon={Lock} /> : undefined}
    >
      <ContractsPanel />
    </RouteScreen>
  );
}

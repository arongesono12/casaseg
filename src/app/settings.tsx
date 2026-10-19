import { RouteScreen } from '@/components/route-screen';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { useI18n } from '@/providers/i18n-context';

export default function SettingsScreen() {
  const { t } = useI18n();
  return (
    <RouteScreen title={t('settings')} description={t('settingsSubtitle')}>
      <SettingsPanel />
    </RouteScreen>
  );
}

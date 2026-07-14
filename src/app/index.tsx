import { Redirect } from 'expo-router';

import { appStorage } from '@/lib/local-storage';

const hasSeenOnboarding = appStorage.getItem('casaseg.onboarding.seen') === 'true';

export default function Index() {
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/explore" />;
}

import { Redirect } from 'expo-router';

import { appStorage } from '@/lib/local-storage';

export default function Index() {
  // Read on render, not at module scope: a module-level snapshot keeps sending
  // the user back to onboarding after they have already completed it.
  const hasSeenOnboarding = appStorage.getItem('casaseg.onboarding.seen') === 'true';

  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/explore" />;
}

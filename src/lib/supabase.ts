import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from '@/lib/secure-session-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The placeholders below only keep the local demo mode alive. Distributed builds
// cannot reach this branch: app.config.ts fails the EAS build when these
// variables are missing, instead of shipping an app wired to a dead host.
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = createClient(
  url ?? 'https://not-configured.supabase.co',
  publishableKey ?? 'publishable-key-not-configured',
  {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

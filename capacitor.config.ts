import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.casaseg.mobile',
  appName: 'CasaSeg',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette } from '@/constants/theme';
import { appStorage } from '@/lib/local-storage';
import { ThemeContext, type ThemeMode } from '@/providers/theme-context';

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemMode = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => (appStorage.getItem('casaseg.theme') as ThemeMode | null) ?? 'system');
  const setMode = useCallback((value: ThemeMode) => { setModeState(value); appStorage.setItem('casaseg.theme', value); }, []);
  const resolvedMode = mode === 'system' ? (systemMode === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      palette: resolvedMode === 'dark' ? darkPalette : lightPalette,
      setMode,
    }),
    [mode, resolvedMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

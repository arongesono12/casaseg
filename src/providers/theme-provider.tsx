import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type AppPalette } from '@/constants/theme';
import { appStorage } from '@/lib/local-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  palette: AppPalette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside ThemeProvider');
  return context;
}

export const useThemeColors = useAppTheme;

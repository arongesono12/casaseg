import { createContext, useContext } from 'react';
import type { AppPalette } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  palette: AppPalette;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside ThemeProvider');
  return context;
}

export const useThemeColors = useAppTheme;

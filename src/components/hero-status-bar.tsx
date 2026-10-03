import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/providers/theme-context';

type HeroScroll = {
  /** true cuando la cabecera a sangre ya no está bajo la barra de estado. */
  pastHero: boolean;
  onHeroLayout: (event: LayoutChangeEvent) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/** Sigue el scroll de una pantalla con cabecera a sangre (degradado detrás de la barra de estado). */
export function useHeroScroll(): HeroScroll {
  const { top } = useSafeAreaInsets();
  const heroHeight = useRef(0);
  const [pastHero, setPastHero] = useState(false);

  const onHeroLayout = useCallback((event: LayoutChangeEvent) => {
    heroHeight.current = event.nativeEvent.layout.height;
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = heroHeight.current > 0 && event.nativeEvent.contentOffset.y > heroHeight.current - top;
    setPastHero((current) => (current === next ? current : next));
  }, [top]);

  return { pastHero, onHeroLayout, onScroll };
}

/**
 * Iconos claros mientras el degradado está bajo la barra de estado; al pasarlo,
 * el estilo del tema. Solo se monta con la pantalla enfocada: al desmontarse,
 * la pila de StatusBar vuelve al estilo global de la app.
 */
export function HeroStatusBar({ pastHero }: { pastHero: boolean }) {
  const focused = useIsFocused();
  const { resolvedMode } = useAppTheme();
  if (!focused) return null;
  return <StatusBar style={pastHero && resolvedMode !== 'dark' ? 'dark' : 'light'} />;
}

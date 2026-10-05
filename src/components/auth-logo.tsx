import { useEffect } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { authLogoSize } from '@/lib/auth-logo-size';

// iOS avisa antes de que el teclado se mueva y permite acompañarlo; Android solo
// emite los eventos "did", ya con el teclado en pantalla.
const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const RESIZE_DURATION_MS = 220;

interface AuthLogoProps {
  compact?: boolean;
}

/**
 * Logo vectorial de las pantallas de acceso. Mide como mucho 160dp o el 30% del
 * ancho y se encoge mientras el teclado está abierto para dejar sitio a los
 * campos. Anima ancho y alto (no `scale`) porque así libera espacio real en el
 * layout en lugar de solo dibujarse más pequeño.
 */
export function AuthLogo({ compact = false }: AuthLogoProps) {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const keyboardProgress = useSharedValue(Keyboard.isVisible() ? 1 : 0);

  useEffect(() => {
    const animateTo = (target: number) => {
      keyboardProgress.value = reduceMotion
        ? target
        : withTiming(target, { duration: RESIZE_DURATION_MS, easing: Easing.out(Easing.cubic) });
    };
    const showSubscription = Keyboard.addListener(SHOW_EVENT, () => animateTo(1));
    const hideSubscription = Keyboard.addListener(HIDE_EVENT, () => animateTo(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardProgress, reduceMotion]);

  const open = authLogoSize(screenWidth, { compact });
  const shrunk = authLogoSize(screenWidth, { compact, keyboardVisible: true });

  const animatedSize = useAnimatedStyle(() => ({
    width: interpolate(keyboardProgress.value, [0, 1], [open.width, shrunk.width]),
    height: interpolate(keyboardProgress.value, [0, 1], [open.height, shrunk.height]),
  }));

  return (
    <Animated.View accessible accessibilityLabel="CasaSeg" accessibilityRole="image" style={[styles.logo, animatedSize]}>
      <CasasegLogo width="100%" height="100%" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});

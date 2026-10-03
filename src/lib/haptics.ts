import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Un único vocabulario táctil para toda la app. Cada pantalla llamaba a
// expo-haptics a su manera (algunas solo en iOS, otras sin capturar errores);
// aquí cada intención tiene su respuesta nativa en iOS y en Android.
//
// En Android se usan las constantes de View.performHapticFeedback, que respetan
// los ajustes de vibración del sistema y suenan como el resto de apps nativas.

type HapticIntent = 'selection' | 'tap' | 'toggleOn' | 'toggleOff' | 'success' | 'error';

const androidFeedback: Record<HapticIntent, Haptics.AndroidHaptics> = {
  selection: Haptics.AndroidHaptics.Clock_Tick,
  tap: Haptics.AndroidHaptics.Virtual_Key,
  toggleOn: Haptics.AndroidHaptics.Confirm,
  toggleOff: Haptics.AndroidHaptics.Virtual_Key,
  success: Haptics.AndroidHaptics.Confirm,
  error: Haptics.AndroidHaptics.Reject,
};

function iosFeedback(intent: HapticIntent): Promise<void> {
  switch (intent) {
    case 'selection':
    case 'toggleOff':
      return Haptics.selectionAsync();
    case 'tap':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'toggleOn':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

function play(intent: HapticIntent): void {
  if (Platform.OS === 'web') return;
  const feedback = Platform.OS === 'android'
    ? Haptics.performAndroidHapticsAsync(androidFeedback[intent])
    : iosFeedback(intent);
  // La háptica es decorativa: un dispositivo sin motor de vibración no debe
  // romper la acción que la disparó.
  void feedback.catch(() => undefined);
}

export const haptics = {
  /** Cambio de opción: chips, pestañas, segmentos. */
  selection: () => play('selection'),
  /** Pulsación de la acción principal. */
  tap: () => play('tap'),
  /** Interruptor o favorito que pasa a activo o inactivo. */
  toggle: (on: boolean) => play(on ? 'toggleOn' : 'toggleOff'),
  /** Una acción terminó bien: mensaje enviado, visita solicitada, sesión iniciada. */
  success: () => play('success'),
  /** Una acción falló. */
  error: () => play('error'),
};

import { Alert, Platform } from 'react-native';

type ConfirmOptions = { title: string; message: string; confirmLabel: string; cancelLabel: string };

/**
 * Pide confirmación antes de una acción destructiva. En iOS y Android es el
 * diálogo nativo con el botón en rojo; en web Alert.alert no hace nada, así que
 * se usa window.confirm.
 */
export function confirmDestructive({ title, message, confirmLabel, cancelLabel }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

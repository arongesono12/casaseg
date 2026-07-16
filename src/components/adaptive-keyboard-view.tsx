import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';

type AdaptiveKeyboardViewProps = PropsWithChildren<{
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Keeps focused fields and composers visible with equivalent behavior on both
 * native platforms. Android uses height together with adjustResize; iOS uses
 * padding because its window is not resized by the system keyboard.
 */
export function AdaptiveKeyboardView({ children, keyboardVerticalOffset = 0, style }: AdaptiveKeyboardViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      enabled={Platform.OS !== 'web'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

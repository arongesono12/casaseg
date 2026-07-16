import { StyleSheet } from 'react-native';

import { FallbackNativeActionButton } from './native-action-button-base';
import type { NativeActionButtonProps } from './native-action-button.types';
import { colors } from '@/constants/theme';
import { isExpoGo } from '@/lib/execution-environment';
import { useAppTheme } from '@/providers/theme-context';

/** A real SwiftUI button hosted inside the shared React Native screen. */
export function NativeActionButton({ disabled = false, label, onPress, style }: NativeActionButtonProps) {
  const { resolvedMode } = useAppTheme();

  if (isExpoGo) {
    return <FallbackNativeActionButton disabled={disabled} label={label} onPress={onPress} style={style} />;
  }

  // Conditional loading keeps SDK 54 Expo Go from resolving unavailable native views.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Button, Host } = require('@expo/ui/swift-ui') as typeof import('@expo/ui/swift-ui');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { buttonStyle, controlSize, disabled: disabledModifier, frame, tint } = require('@expo/ui/swift-ui/modifiers') as typeof import('@expo/ui/swift-ui/modifiers');

  return (
    <Host colorScheme={resolvedMode} style={[styles.host, style]}>
      <Button
        label={label}
        onPress={onPress}
        modifiers={[
          frame({ minHeight: 56, maxWidth: 10000 }),
          buttonStyle('borderedProminent'),
          controlSize('large'),
          tint(colors.brand),
          disabledModifier(disabled),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({ host: { width: '100%', minHeight: 56 } });

export type { NativeActionButtonProps } from './native-action-button.types';

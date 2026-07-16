import { StyleSheet } from 'react-native';

import { FallbackNativeActionButton } from './native-action-button-base';
import type { NativeActionButtonProps } from './native-action-button.types';
import { colors } from '@/constants/theme';
import { isExpoGo } from '@/lib/execution-environment';
import { useAppTheme } from '@/providers/theme-context';

/** A real Material 3 Jetpack Compose button hosted inside the shared React Native screen. */
export function NativeActionButton({ disabled = false, label, onPress, style }: NativeActionButtonProps) {
  const { resolvedMode } = useAppTheme();

  if (isExpoGo) {
    return <FallbackNativeActionButton disabled={disabled} label={label} onPress={onPress} style={style} />;
  }

  // Conditional loading keeps SDK 54 Expo Go from resolving unavailable native views.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Button, fillMaxWidth, Host, paddingAll } = require('@expo/ui/jetpack-compose') as typeof import('@expo/ui/jetpack-compose');

  return (
    <Host colorScheme={resolvedMode} style={[styles.host, style]}>
      <Button
        disabled={disabled}
        elementColors={{
          containerColor: colors.brand,
          contentColor: '#FFFFFF',
          disabledContainerColor: colors.muted,
          disabledContentColor: '#FFFFFF',
        }}
        modifiers={[fillMaxWidth(), paddingAll(4)]}
        onPress={onPress}
        variant="default"
      >
        {label}
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { width: '100%', minHeight: 56 } });

export type { NativeActionButtonProps } from './native-action-button.types';

import { Pressable, StyleSheet, Text } from 'react-native';

import type { NativeActionButtonProps } from './native-action-button.types';
import { colors, radius, touchTarget } from '@/constants/theme';

export function FallbackNativeActionButton({ accessibilityLabel, disabled, label, onPress, style }: NativeActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: touchTarget / 2,
  },
  label: { color: 'white', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.55 },
});

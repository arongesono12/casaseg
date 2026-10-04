import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { NativeActionButtonProps } from './native-action-button.types';
import { actionGradient, colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';

export function FallbackNativeActionButton({ accessibilityLabel, disabled, label, onPress, style }: NativeActionButtonProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [styles.buttonShell, style, focused && styles.focused, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <LinearGradient colors={actionGradient} style={styles.button}>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonShell: {
    minHeight: 56,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: `0 8px 18px ${withAlpha(colors.brand, 0.18)}`,
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: touchTarget / 2,
  },
  label: { color: 'white', fontSize: 16, fontFamily: fontFamily.extrabold },
  pressed: { opacity: 0.86 },
  focused: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  disabled: { opacity: 0.55 },
});

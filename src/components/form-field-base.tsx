import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { FormFieldProps } from './form-field.types';
import { colors, radius, touchTarget } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

/** React Native fallback for web and controls not yet covered safely by Expo UI. */
export function FallbackFormField({ label, error, inputRef, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={palette.muted}
          ref={inputRef}
          {...inputProps}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          style={[
            styles.input,
            inputProps.multiline && styles.multiline,
            rightAccessory ? styles.inputWithAccessory : undefined,
            {
              backgroundColor: inputProps.editable === false ? palette.subtle : palette.surface,
              borderColor: error ? colors.error : focused ? colors.brand : palette.border,
              color: inputProps.editable === false ? palette.textSecondary : palette.text,
            },
            focused && styles.focused,
            inputProps.style,
          ]}
        />
        {rightAccessory && <View style={styles.rightAccessory}>{rightAccessory}</View>}
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontWeight: '800' },
  inputContainer: { position: 'relative' },
  input: { width: '100%', minHeight: 54, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16 },
  multiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' },
  inputWithAccessory: { paddingRight: 58 },
  rightAccessory: { position: 'absolute', right: 3, top: 3, width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontSize: 13 },
  focused: { boxShadow: '0 0 0 3px rgba(20,184,166,0.22)' },
});

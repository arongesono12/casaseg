import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { FormFieldProps } from './form-field.types';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
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
      {error && <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontFamily: fontFamily.extrabold },
  inputContainer: { position: 'relative' },
  input: { fontFamily: fontFamily.regular, width: '100%', minHeight: 54, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 20, fontSize: 16 },
  multiline: { minHeight: 112, borderRadius: radius.xl, paddingTop: 14, textAlignVertical: 'top' },
  inputWithAccessory: { paddingRight: 58 },
  rightAccessory: { position: 'absolute', right: 3, top: 3, width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: fontFamily.regular, fontSize: 13 },
  focused: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.30)}` },
});

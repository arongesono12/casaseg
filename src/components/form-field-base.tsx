import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { FormFieldProps } from './form-field.types';
import { colors, radius, touchTarget } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

/** React Native fallback for web and controls not yet covered safely by Expo UI. */
export function FallbackFormField({ label, error, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={palette.muted}
          {...inputProps}
          style={[
            styles.input,
            inputProps.multiline && styles.multiline,
            rightAccessory ? styles.inputWithAccessory : undefined,
            { backgroundColor: palette.surface, borderColor: error ? colors.error : palette.border, color: palette.text },
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
});

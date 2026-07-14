import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

type FormFieldProps = TextInputProps & { label: string; error?: string; rightAccessory?: ReactNode };
export function FormField({ label, error, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette } = useAppTheme();
  return <View style={styles.group}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><View style={styles.inputContainer}><TextInput accessibilityLabel={label} placeholderTextColor={palette.muted} {...inputProps} style={[styles.input, rightAccessory ? styles.inputWithAccessory : undefined, { backgroundColor: palette.surface, borderColor: error ? colors.error : palette.border, color: palette.text }, inputProps.style]} />{rightAccessory && <View style={styles.rightAccessory}>{rightAccessory}</View>}</View>{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({ group: { gap: 7 }, label: { fontSize: 13, fontWeight: '800' }, inputContainer: { position: 'relative' }, input: { width: '100%', minHeight: 54, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16 }, inputWithAccessory: { paddingRight: 54 }, rightAccessory: { position: 'absolute', right: 5, top: 5, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, error: { color: colors.error, fontSize: 13 } });

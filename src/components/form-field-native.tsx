import { Host, TextInput, useNativeState, type ObservableState } from '@expo/ui';
import { useEffect, useState } from 'react';
import type { NativeSyntheticEvent, StyleProp, TextInputFocusEventData, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FallbackFormField } from './form-field-base';
import type { FormFieldProps } from './form-field.types';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

/**
 * Empuja el valor controlado desde React al estado nativo del campo. El estado
 * nativo es un sistema externo, así que se sincroniza desde un efecto; la
 * escritura vive fuera del componente porque el tipo universal de @expo/ui solo
 * expone `.value` (sin los `get()`/`set()` del módulo nativo).
 */
function syncNativeText(state: ObservableState<string>, value: string) {
  if (state.value !== value) state.value = value;
}

/** SDK 57's universal input renders SwiftUI on iOS and Compose on Android. */
export function FormField({ error, inputRef, label, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette, resolvedMode } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const value = typeof inputProps.value === 'string' ? inputProps.value : undefined;
  const text = useNativeState(value ?? inputProps.defaultValue ?? '');
  // Preserve React Native ref and accessory contracts for authentication fields.
  const useFallback = Boolean(inputRef || rightAccessory || inputProps.autoComplete || inputProps.textContentType || inputProps.secureTextEntry || inputProps.editable === false);

  useEffect(() => {
    if (!useFallback && value !== undefined) syncNativeText(text, value);
  }, [text, useFallback, value]);

  if (useFallback) {
    return <FallbackFormField error={error} inputRef={inputRef} label={label} rightAccessory={rightAccessory} {...inputProps} />;
  }

  const emitFocus = (nextFocused: boolean) => {
    setFocused(nextFocused);
    const event = {} as NativeSyntheticEvent<TextInputFocusEventData>;
    if (nextFocused) inputProps.onFocus?.(event);
    else inputProps.onBlur?.(event);
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <Host colorScheme={resolvedMode} matchContents={{ vertical: true }} style={[styles.host, inputProps.style as StyleProp<ViewStyle>]}>
        <TextInput
          value={text}
          autoCapitalize={inputProps.autoCapitalize}
          autoCorrect={inputProps.autoCorrect}
          autoFocus={inputProps.autoFocus}
          keyboardType={inputProps.keyboardType}
          maxLength={inputProps.maxLength}
          multiline={inputProps.multiline}
          numberOfLines={inputProps.numberOfLines}
          returnKeyType={inputProps.returnKeyType}
          placeholder={inputProps.placeholder}
          placeholderTextColor={palette.muted}
          testID={inputProps.testID}
          onBlur={() => emitFocus(false)}
          onFocus={() => emitFocus(true)}
          onChangeText={inputProps.onChangeText}
          onSubmitEditing={(submittedValue) => inputProps.onSubmitEditing?.({ nativeEvent: { text: submittedValue } } as never)}
          style={{ width: '100%', height: inputProps.multiline ? 112 : 54, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderRadius: radius.md, borderColor: error ? colors.error : focused ? colors.brand : palette.border, backgroundColor: palette.surface }}
          textStyle={{ color: palette.text, fontSize: 16 }}
        />
      </Host>
      {error && <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontWeight: '800' },
  host: { width: '100%' },
  error: { fontSize: 13 },
});

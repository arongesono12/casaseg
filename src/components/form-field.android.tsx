import type { TextInputProps as ComposeTextInputProps, TextInputRef } from '@expo/ui/jetpack-compose';
import { useEffect, useRef, type ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FallbackFormField } from './form-field-base';
import type { FormFieldProps } from './form-field.types';
import { colors } from '@/constants/theme';
import { isExpoGo } from '@/lib/execution-environment';
import { useAppTheme } from '@/providers/theme-context';

function keyboardType(value: FormFieldProps['keyboardType']): ComposeTextInputProps['keyboardType'] {
  switch (value) {
    case 'email-address':
    case 'numeric':
    case 'phone-pad':
    case 'ascii-capable':
    case 'url':
    case 'decimal-pad':
      return value;
    default:
      return 'default';
  }
}

function capitalization(value: FormFieldProps['autoCapitalize']): ComposeTextInputProps['autoCapitalize'] {
  return value === 'characters' || value === 'sentences' || value === 'words' ? value : 'none';
}

/** Uses Material 3 through Jetpack Compose while React continues to own form state. */
export function FormField({ error, inputRef, label, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette, resolvedMode } = useAppTheme();
  const nativeRef = useRef<TextInputRef>(null);
  const value = typeof inputProps.value === 'string' ? inputProps.value : undefined;
  const initialValue = value ?? (typeof inputProps.defaultValue === 'string' ? inputProps.defaultValue : '');
  const nativeValue = useRef(initialValue);
  // Compose's current TextInput maps password keyboards but does not apply a secure visual transformation.
  const useFallback = Boolean(
    isExpoGo
    || inputRef
    || inputProps.autoComplete
    || inputProps.textContentType
    || inputProps.secureTextEntry
    || rightAccessory
    || inputProps.editable === false
  );

  useEffect(() => {
    if (!useFallback && value !== undefined && value !== nativeValue.current) {
      nativeValue.current = value;
      void nativeRef.current?.setText(value);
    }
  }, [useFallback, value]);

  if (useFallback) {
    return <FallbackFormField error={error} inputRef={inputRef} label={label} rightAccessory={rightAccessory} {...inputProps} />;
  }

  // Conditional loading keeps SDK 54 Expo Go from resolving unavailable native views.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fillMaxWidth, Host, TextInput } = require('@expo/ui/jetpack-compose') as typeof import('@expo/ui/jetpack-compose');
  // The native Compose prop exists in this Expo UI build, but its beta .d.ts omits it.
  const NativeTextInput = TextInput as ComponentType<ComposeTextInputProps & { placeholder?: string }>;

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <Host
        colorScheme={resolvedMode}
        style={[
          styles.host,
          inputProps.multiline && styles.multilineHost,
          inputProps.style as StyleProp<ViewStyle>,
        ]}
      >
        <NativeTextInput
          ref={nativeRef}
          autoCapitalize={capitalization(inputProps.autoCapitalize)}
          autocorrection={inputProps.autoCorrect}
          defaultValue={initialValue}
          keyboardType={keyboardType(inputProps.keyboardType)}
          modifiers={[fillMaxWidth()]}
          multiline={inputProps.multiline}
          numberOfLines={inputProps.numberOfLines}
          onChangeText={(nextValue) => {
            nativeValue.current = nextValue;
            inputProps.onChangeText?.(nextValue);
          }}
          placeholder={inputProps.placeholder}
        />
      </Host>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontWeight: '800' },
  host: { width: '100%', minHeight: 56 },
  multilineHost: { minHeight: 112 },
  error: { color: colors.error, fontSize: 13 },
});

export type { FormFieldProps } from './form-field.types';

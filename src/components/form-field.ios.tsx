import type { TextFieldKeyboardType, TextFieldRef } from '@expo/ui/swift-ui';
import { useEffect, useRef } from 'react';
import type { NativeSyntheticEvent, StyleProp, TextInputFocusEventData, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FallbackFormField } from './form-field-base';
import type { FormFieldProps } from './form-field.types';
import { colors } from '@/constants/theme';
import { isExpoGo } from '@/lib/execution-environment';
import { useAppTheme } from '@/providers/theme-context';

function keyboardType(value: FormFieldProps['keyboardType']): TextFieldKeyboardType {
  switch (value) {
    case 'email-address':
    case 'numeric':
    case 'phone-pad':
    case 'ascii-capable':
    case 'numbers-and-punctuation':
    case 'url':
    case 'name-phone-pad':
    case 'decimal-pad':
    case 'twitter':
    case 'web-search':
      return value;
    default:
      return 'default';
  }
}

/** Uses UIKit through SwiftUI while React Hook Form continues to own form state. */
export function FormField({ error, label, rightAccessory, ...inputProps }: FormFieldProps) {
  const { palette, resolvedMode } = useAppTheme();
  const nativeRef = useRef<TextFieldRef>(null);
  const value = typeof inputProps.value === 'string' ? inputProps.value : undefined;
  const initialValue = value ?? (typeof inputProps.defaultValue === 'string' ? inputProps.defaultValue : '');
  const nativeValue = useRef(initialValue);
  const useFallback = Boolean(isExpoGo || inputProps.secureTextEntry || rightAccessory || inputProps.editable === false);

  useEffect(() => {
    if (!useFallback && value !== undefined && value !== nativeValue.current) {
      nativeValue.current = value;
      void nativeRef.current?.setText(value);
    }
  }, [useFallback, value]);

  if (useFallback) {
    return <FallbackFormField error={error} label={label} rightAccessory={rightAccessory} {...inputProps} />;
  }

  // Conditional loading keeps SDK 54 Expo Go from resolving unavailable native views.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, TextField } = require('@expo/ui/swift-ui') as typeof import('@expo/ui/swift-ui');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { frame, textFieldStyle, tint } = require('@expo/ui/swift-ui/modifiers') as typeof import('@expo/ui/swift-ui/modifiers');

  const emitFocus = (focused: boolean) => {
    const event = {} as NativeSyntheticEvent<TextInputFocusEventData>;
    if (focused) inputProps.onFocus?.(event);
    else inputProps.onBlur?.(event);
  };

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
        <TextField
          ref={nativeRef}
          autoFocus={inputProps.autoFocus}
          autocorrection={inputProps.autoCorrect}
          defaultValue={initialValue}
          keyboardType={keyboardType(inputProps.keyboardType)}
          multiline={inputProps.multiline}
          numberOfLines={inputProps.numberOfLines}
          onChangeFocus={emitFocus}
          onChangeText={(nextValue) => {
            nativeValue.current = nextValue;
            inputProps.onChangeText?.(nextValue);
          }}
          onSubmit={(submittedValue) => inputProps.onSubmitEditing?.({ nativeEvent: { text: submittedValue } } as never)}
          placeholder={inputProps.placeholder}
          modifiers={[
            frame({ minHeight: inputProps.multiline ? 112 : 54, maxWidth: 10000, alignment: 'leading' }),
            textFieldStyle('roundedBorder'),
            tint(error ? colors.error : palette.brand),
          ]}
        />
      </Host>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontWeight: '800' },
  host: { width: '100%', minHeight: 54 },
  multilineHost: { minHeight: 112 },
  error: { color: colors.error, fontSize: 13 },
});

export type { FormFieldProps } from './form-field.types';

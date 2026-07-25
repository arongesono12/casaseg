import type { ReactNode, Ref } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

export type FormFieldProps = TextInputProps & {
  error?: string;
  inputRef?: Ref<TextInput>;
  label: string;
  rightAccessory?: ReactNode;
};

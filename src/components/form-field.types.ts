import type { ReactNode, Ref } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';

export type FormFieldProps = TextInputProps & {
  error?: string;
  inputRef?: Ref<TextInputInstance>;
  label: string;
  rightAccessory?: ReactNode;
};

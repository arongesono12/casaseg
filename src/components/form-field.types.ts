import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';

export type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
  rightAccessory?: ReactNode;
};

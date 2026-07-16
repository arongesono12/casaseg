import type { StyleProp, ViewStyle } from 'react-native';

export type NativeActionButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

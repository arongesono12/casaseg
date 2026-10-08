import type { NativeActionButtonProps } from './native-action-button.types';
import { PremiumButton } from '@/components/ui/premium';

export function FallbackNativeActionButton({ accessibilityLabel, disabled, label, onPress, style }: NativeActionButtonProps) {
  return (
    <PremiumButton
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      label={label}
      onPress={onPress}
      style={style}
      variant="brand"
    />
  );
}

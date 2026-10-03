import { Pressable, StyleSheet, Text } from 'react-native';
import { Apple } from '@/components/ui/icons';
import { radius } from '@/constants/theme';

export type AppleAuthButtonProps = {
  backgroundColor: string;
  borderColor: string;
  colorScheme: 'light' | 'dark';
  disabled: boolean;
  label: string;
  onPress: () => void;
  textColor: string;
};

export function AppleAuthButton({ backgroundColor, borderColor, disabled, label, onPress, textColor }: AppleAuthButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, opacity: disabled ? 0.55 : pressed ? 0.75 : 1 },
      ]}
    >
      <Apple color={textColor} fill={textColor} size={22} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  label: { fontSize: 15, fontWeight: '700' },
});

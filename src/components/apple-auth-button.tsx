import { Pressable, StyleSheet, Text } from 'react-native';
import { Apple } from '@/components/ui/icons';
import { fontFamily, radius } from '@/constants/theme';

export type AppleAuthButtonProps = {
  accessibilityLabel?: string;
  backgroundColor: string;
  borderColor: string;
  colorScheme: 'light' | 'dark';
  disabled: boolean;
  label: string;
  onPress: () => void;
  textColor: string;
};

export function AppleAuthButton({ accessibilityLabel, backgroundColor, borderColor, disabled, label, onPress, textColor }: AppleAuthButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
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
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  label: { fontSize: 14, fontFamily: fontFamily.semibold },
});

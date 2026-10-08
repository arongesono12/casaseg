import Svg, { Path } from 'react-native-svg';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontFamily, radius } from '@/constants/theme';

export type GoogleAuthButtonProps = {
  accessibilityLabel?: string;
  backgroundColor: string;
  borderColor: string;
  colorScheme: 'light' | 'dark';
  disabled: boolean;
  label: string;
  onPress: () => void;
  textColor: string;
};

function GoogleLogo() {
  return (
    <Svg accessibilityLabel="Google" height={22} viewBox="0 0 24 24" width={22}>
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <Path d="M5.84 14.09A6.5 6.5 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" fill="#EA4335" />
    </Svg>
  );
}

export function GoogleAuthButton({ accessibilityLabel, backgroundColor, borderColor, disabled, label, onPress, textColor }: GoogleAuthButtonProps) {
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
      <GoogleLogo />
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

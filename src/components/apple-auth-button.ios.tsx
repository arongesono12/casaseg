import * as AppleAuthentication from 'expo-apple-authentication';
import { View } from 'react-native';
import type { AppleAuthButtonProps } from './apple-auth-button';

export function AppleAuthButton({ colorScheme, disabled, label, onPress }: AppleAuthButtonProps) {
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.55 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel={label}
        buttonStyle={colorScheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={10}
        onPress={onPress}
        style={{ height: 52, width: '100%' }}
      />
    </View>
  );
}

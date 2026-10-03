import { requireOptionalNativeModule } from 'expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import { View } from 'react-native';
import type { AppleAuthButtonProps } from './apple-auth-button';

// En Expo Go o en un build sin el módulo nativo, montar el botón nativo lanza
// "Unable to get the view config". Con el módulo ausente no se pinta nada.
const isAppleAuthNativeAvailable = requireOptionalNativeModule('ExpoAppleAuthentication') != null;

export function AppleAuthButton({ colorScheme, disabled, label, onPress }: AppleAuthButtonProps) {
  if (!isAppleAuthNativeAvailable) return null;

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

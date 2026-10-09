import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { canAccessOwnerPanel } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-context';

export default function OwnerLayout() {
  const { isAuthenticated, role } = useAuth();
  const ownerAccess = isAuthenticated && canAccessOwnerPanel(role);
  return <Stack screenOptions={{ headerShown: false, keyboardHandlingEnabled: Platform.OS !== 'web' }}>
    <Stack.Protected guard={ownerAccess}>
      <Stack.Screen name="index" />
      <Stack.Screen name="properties" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="property/create" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="contract-template/[propertyId]" />
    </Stack.Protected>
    <Stack.Protected guard={isAuthenticated}>
      <Stack.Screen name="payments" />
      <Stack.Screen name="contracts" />
    </Stack.Protected>
  </Stack>;
}

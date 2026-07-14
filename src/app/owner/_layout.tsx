import { Stack } from 'expo-router';
import { isOwnerRole } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-provider';

export default function OwnerLayout() {
  const { isAuthenticated, role } = useAuth();
  const ownerAccess = isAuthenticated && isOwnerRole(role);
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={ownerAccess}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="properties" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="property/create" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="subscription" />
    </Stack.Protected>
    <Stack.Protected guard={isAuthenticated}>
      <Stack.Screen name="payments" />
      <Stack.Screen name="contracts" />
    </Stack.Protected>
  </Stack>;
}

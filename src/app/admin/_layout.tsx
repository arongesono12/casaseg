import { Stack } from 'expo-router';

import { canAccessAdminPanel } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-context';

export default function AdminLayout() {
  const { isAuthenticated, role } = useAuth();
  const adminAccess = isAuthenticated && canAccessAdminPanel(role);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={adminAccess}>
        <Stack.Screen name="index" />
        <Stack.Screen name="users" />
        <Stack.Screen name="properties" />
      </Stack.Protected>
    </Stack>
  );
}

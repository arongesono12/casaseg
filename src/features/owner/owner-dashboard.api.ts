import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type OwnerTrendPoint = { key: string; properties: number; contacts: number };
export type OwnerDashboardStats = { views: number; uniqueViewers: number; contacts: number; agreements: number; trend: OwnerTrendPoint[] };
export type OwnerRecentActivity = { id: string; title: string; description: string; timestamp: string; type: 'property' | 'contact' | 'subscription' };

type OwnerChatRow = { id: string; property_id: string | null; client_id: string | null; created_at: string | null };

export async function fetchOwnerRecentActivity(ownerId: string): Promise<OwnerRecentActivity[]> {
  if (!isSupabaseConfigured) return [];
  const [propertiesResult, chatsResult, subscriptionResult] = await Promise.all([
    supabase.from('properties').select('id,title,created_at').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(4),
    supabase.from('chats').select('id,property_id,client_id,created_at').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(4),
    supabase.from('owner_subscriptions').select('id,created_at,status,owner_plans(name)').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (propertiesResult.error) throw propertiesResult.error;
  if (chatsResult.error) throw chatsResult.error;

  const chats = (chatsResult.data ?? []) as OwnerChatRow[];
  const propertyIds = [...new Set(chats.map((chat) => chat.property_id).filter((id): id is string => Boolean(id)))];
  const [chatPropertiesResult, clientProfilesResult] = await Promise.all([
    propertyIds.length
      ? supabase.from('properties').select('id,title').eq('owner_id', ownerId).in('id', propertyIds)
      : Promise.resolve({ data: [], error: null }),
    chats.length
      ? supabase.rpc('list_my_chats')
      : Promise.resolve({ data: [], error: null }),
  ]);
  const titles = new Map((chatPropertiesResult.data ?? []).map((property) => [property.id, property.title?.trim() || 'tu propiedad']));
  const names = new Map(((clientProfilesResult.data ?? []) as { chat_id: string; partner_name: string | null; is_owner: boolean }[])
    .filter((chat) => chat.is_owner)
    .map((chat) => [chat.chat_id, chat.partner_name?.trim() || 'Cliente']));

  const activity: OwnerRecentActivity[] = [
    ...(propertiesResult.data ?? []).map((property) => ({
      id: `property-${property.id}`,
      type: 'property' as const,
      title: 'Vivienda registrada',
      description: `${property.title?.trim() || 'Una vivienda'} ya forma parte de tu panel.`,
      timestamp: property.created_at ?? '',
    })),
    ...chats.map((chat) => ({
      id: `contact-${chat.id}`,
      type: 'contact' as const,
      title: 'Nuevo contacto recibido',
      description: `${names.get(chat.id) || 'Un cliente'} inició una conversación sobre ${titles.get(chat.property_id ?? '') || 'una vivienda'}.`,
      timestamp: chat.created_at ?? '',
    })),
  ];
  if (subscriptionResult.data?.created_at) {
    const plan = subscriptionResult.data.owner_plans as { name?: string | null } | null;
    activity.push({
      id: `subscription-${subscriptionResult.data.id}`,
      type: 'subscription',
      title: 'Plan actualizado',
      description: `Tu plan ${plan?.name || 'actual'} está en estado ${subscriptionResult.data.status}.`,
      timestamp: subscriptionResult.data.created_at,
    });
  }
  return activity.filter((item) => item.timestamp).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 6);
}

export async function fetchOwnerDashboardStats(ownerId: string): Promise<OwnerDashboardStats> {
  if (!isSupabaseConfigured) return { views: 0, uniqueViewers: 0, contacts: 0, agreements: 0, trend: [] };
  const [properties, chats, agreements, views] = await Promise.all([
    supabase.from('properties').select('id,created_at').eq('owner_id', ownerId),
    supabase.from('chats').select('id,created_at').eq('owner_id', ownerId),
    supabase.from('agreements').select('id').eq('owner_id', ownerId),
    supabase.from('property_views').select('viewer_id').eq('owner_id', ownerId),
  ]);
  for (const result of [properties, chats, agreements, views]) if (result.error) throw result.error;
  const now = new Date();
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, properties: 0, contacts: 0 };
  });
  const countInMonths = (rows: { created_at: string | null }[] | null, field: 'properties' | 'contacts') => {
    for (const row of rows ?? []) {
      if (!row.created_at) continue;
      const key = row.created_at.slice(0, 7);
      const point = trend.find((item) => item.key === key);
      if (point) point[field] += 1;
    }
  };
  countInMonths(properties.data, 'properties');
  countInMonths(chats.data, 'contacts');
  return {
    views: views.data?.length ?? 0,
    uniqueViewers: new Set((views.data ?? []).map((item) => item.viewer_id).filter(Boolean)).size,
    contacts: chats.data?.length ?? 0,
    agreements: agreements.data?.length ?? 0,
    trend,
  };
}

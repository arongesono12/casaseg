import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type OwnerTrendPoint = { key: string; properties: number; contacts: number };
export type OwnerDashboardStats = { views: number; uniqueViewers: number; contacts: number; agreements: number; trend: OwnerTrendPoint[] };

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

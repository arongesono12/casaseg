import { appStorage } from '@/lib/local-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Visualizaciones de propiedad compartidas con la web (propertyViewsService):
// una fila en public.property_views por vivienda, visitante y día. Alimenta las
// estadísticas del panel del propietario en las dos apps.

const VIEW_STORAGE_PREFIX = 'casaseg_property_view';

export function propertyViewStorageKey(propertyId: string, viewerId: string, now: Date = new Date()): string {
  return `${VIEW_STORAGE_PREFIX}:${propertyId}:${viewerId}:${now.toISOString().slice(0, 10)}`;
}

/**
 * Registra la visita de un usuario autenticado. Los propietarios no cuentan en
 * sus propias viviendas. Es analítica: si falla, la ficha se sigue mostrando y
 * el registro se intentará en la siguiente visita.
 */
export async function trackPropertyView(input: { propertyId: string; ownerId?: string; viewerId?: string }): Promise<void> {
  const { propertyId, ownerId, viewerId } = input;
  if (!isSupabaseConfigured || !propertyId || !viewerId || viewerId === ownerId) return;

  const key = propertyViewStorageKey(propertyId, viewerId);
  if (appStorage.getItem(key)) return;

  const { error } = await supabase.from('property_views').insert({ property_id: propertyId, owner_id: ownerId ?? null, viewer_id: viewerId });
  if (error) return;
  appStorage.setItem(key, '1');
}

/** Total de visualizaciones de las viviendas indicadas (RLS: solo las propias). */
export async function fetchPropertyViewsCount(propertyIds: string[]): Promise<number> {
  const ids = [...new Set(propertyIds.filter(Boolean))];
  if (!isSupabaseConfigured || ids.length === 0) return 0;
  const { count, error } = await supabase.from('property_views').select('id', { count: 'exact', head: true }).in('property_id', ids);
  if (error) throw error;
  return count ?? 0;
}

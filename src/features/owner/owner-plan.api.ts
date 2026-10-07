import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Planes y cupo de publicación compartidos con la web: public.owner_plans
// (normal/advanced/premium) y los RPC get_owner_entitlements y
// get_owner_plan_capabilities. El servidor decide el cupo; la app solo lo
// muestra y lo usa para avisar antes de que create-property lo rechace.

export type OwnerPlanType = 'normal' | 'advanced' | 'premium';

export type OwnerPlan = {
  id: string;
  type: OwnerPlanType;
  name: string;
  description: string;
  maxProperties: number;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
};

export type OwnerEntitlements = {
  planType: string;
  subscriptionStatus: string;
  maxProperties: number;
  usedProperties: number;
  remainingProperties: number;
  canPublish: boolean;
  reason?: string;
};

export type OwnerPlanCapabilities = {
  planType: string;
  planName: string;
  subscriptionStatus: string;
  maxProperties: number;
  searchPriority: number;
  featuredQuota: number;
  featuredUsed: number;
  analyticsLevel: string;
  supportLevel: string;
};

export const ownerPlanKeys = {
  plans: ['owner-plans'] as const,
  entitlements: (profileId: string) => ['owner-entitlements', profileId] as const,
  capabilities: (profileId: string) => ['owner-plan-capabilities', profileId] as const,
};

type Row = Record<string, unknown>;

const planTypes: readonly OwnerPlanType[] = ['normal', 'advanced', 'premium'];

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function mapOwnerPlan(row: Row): OwnerPlan | null {
  if (!planTypes.includes(row.type as OwnerPlanType)) return null;
  return {
    id: String(row.id),
    type: row.type as OwnerPlanType,
    name: text(row.name),
    description: text(row.description),
    maxProperties: Number(row.max_properties) || 0,
    priceMonthly: Number(row.price_monthly) || 0,
    priceYearly: Number(row.price_yearly) || 0,
    currency: text(row.currency, 'XAF'),
    features: Array.isArray(row.features) ? row.features.filter((feature): feature is string => typeof feature === 'string') : [],
  };
}

export function mapOwnerEntitlements(row: Row): OwnerEntitlements {
  return {
    planType: text(row.plan_type, 'free_tier'),
    subscriptionStatus: text(row.subscription_status, 'inactive'),
    maxProperties: Number(row.max_properties) || 0,
    usedProperties: Number(row.used_properties) || 0,
    remainingProperties: Math.max(Number(row.remaining_properties) || 0, 0),
    canPublish: row.can_publish === true,
    reason: text(row.reason) || undefined,
  };
}

/** Catálogo de planes activos, en el orden que define la web. */
export async function fetchOwnerPlans(): Promise<OwnerPlan[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('owner_plans')
    .select('id,type,name,description,max_properties,price_monthly,price_yearly,currency,features')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(mapOwnerPlan).filter((plan): plan is OwnerPlan => plan !== null);
}

/** Cupo del usuario actual: el RPC usa la identidad del token si no se pasa id. */
export async function fetchOwnerEntitlements(): Promise<OwnerEntitlements | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_owner_entitlements', { p_user_id: null });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  return row ? mapOwnerEntitlements(row) : null;
}

export async function fetchOwnerPlanCapabilities(): Promise<OwnerPlanCapabilities | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_owner_plan_capabilities', { p_owner_id: null });
  if (error) throw error;
  return (data as OwnerPlanCapabilities | null) ?? null;
}

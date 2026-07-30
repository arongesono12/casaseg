import { properties as fallbackProperties } from '@/data/properties';
import { fetchPropertiesPage } from '@/features/properties/api/property.queries';
import { defaultPropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Property } from '@/types';

export type OnboardingCommunityMember = {
  id: string;
  name: string;
  avatar?: string;
};

export type OnboardingCommunity = {
  memberCount: number;
  ownerCount: number;
  propertyCount: number;
  members: OnboardingCommunityMember[];
  exactMemberCount: boolean;
};

type CommunityRpcResult = {
  member_count?: unknown;
  owner_count?: unknown;
  property_count?: unknown;
  members?: unknown;
};

type PublicOwnerRow = {
  owner_id?: unknown;
  owner_name?: unknown;
  owner_avatar?: unknown;
};

export const onboardingKeys = {
  property: ['onboarding', 'property'] as const,
  community: ['onboarding', 'community'] as const,
};

function toCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function parseMembers(value: unknown): OnboardingCommunityMember[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((member) => {
    if (!member || typeof member !== 'object') return [];
    const row = member as Record<string, unknown>;
    if (!row.id) return [];
    return [{
      id: String(row.id),
      name: String(row.name ?? 'Miembro de CasaSeg'),
      avatar: row.avatar ? String(row.avatar) : undefined,
    }];
  });
}

function fallbackCommunity(): OnboardingCommunity {
  const members = Array.from(
    new Map(
      fallbackProperties.map((property) => [
        property.ownerId,
        { id: property.ownerId, name: property.ownerName, avatar: property.ownerAvatar },
      ]),
    ).values(),
  );

  return {
    memberCount: members.length,
    ownerCount: members.length,
    propertyCount: fallbackProperties.length,
    members: members.slice(0, 4),
    exactMemberCount: false,
  };
}

async function fetchCommunityFromPublicListings(signal?: AbortSignal): Promise<OnboardingCommunity> {
  const query = supabase
    .from('properties')
    .select('owner_id,owner_name,owner_avatar', { count: 'exact' })
    .eq('status', 'active')
    .limit(100);
  const { data, error, count } = await query.abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;

  const uniqueMembers = new Map<string, OnboardingCommunityMember>();
  for (const row of (data ?? []) as PublicOwnerRow[]) {
    if (!row.owner_id) continue;
    const id = String(row.owner_id);
    if (uniqueMembers.has(id)) continue;
    uniqueMembers.set(id, {
      id,
      name: String(row.owner_name ?? 'Propietario verificado'),
      avatar: row.owner_avatar ? String(row.owner_avatar) : undefined,
    });
  }

  const members = Array.from(uniqueMembers.values());
  return {
    memberCount: members.length,
    ownerCount: members.length,
    propertyCount: count ?? data?.length ?? 0,
    members: members.slice(0, 4),
    exactMemberCount: false,
  };
}

export async function fetchOnboardingProperty(signal?: AbortSignal): Promise<Property | null> {
  const page = await fetchPropertiesPage(
    { ...defaultPropertyFilters, sort: 'newest' },
    0,
    signal,
  );
  return page.items.find((property) => property.imageUrls.length > 0) ?? page.items[0] ?? null;
}

export async function fetchOnboardingCommunity(signal?: AbortSignal): Promise<OnboardingCommunity> {
  if (!isSupabaseConfigured) return fallbackCommunity();

  const rpcQuery = supabase.rpc('get_onboarding_community');
  const { data, error } = await rpcQuery.abortSignal(signal ?? new AbortController().signal);

  if (error || !data || typeof data !== 'object') {
    return fetchCommunityFromPublicListings(signal);
  }

  const result = data as CommunityRpcResult;
  return {
    memberCount: toCount(result.member_count),
    ownerCount: toCount(result.owner_count),
    propertyCount: toCount(result.property_count),
    members: parseMembers(result.members),
    exactMemberCount: true,
  };
}

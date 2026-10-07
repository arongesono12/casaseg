import { create } from 'zustand'; import { createJSONStorage, persist } from 'zustand/middleware';
import { appStorage } from '@/lib/local-storage';
import type { PropertyCoordinates } from '@/components/property-location-picker';
export type DraftImage = { uri: string; mimeType: string; width: number; height: number; uploadedPath?: string };
type PropertyDraft = { step: number; title: string; description: string; location: string; coordinates: PropertyCoordinates | null; price: string; priceType: 'per_month' | 'per_night' | 'sale'; serviceFeeAmount: string; cleaningFeeAmount: string; taxAmount: string; securityDepositAmount: string; bedrooms: string; bathrooms: string; amenities: string[]; images: DraftImage[]; set: (patch: Partial<PropertyDraft>) => void; reset: () => void };
const initial = { step: 0, title: '', description: '', location: '', coordinates: null as PropertyCoordinates | null, price: '', priceType: 'per_month' as const, serviceFeeAmount: '0', cleaningFeeAmount: '0', taxAmount: '0', securityDepositAmount: '0', bedrooms: '1', bathrooms: '1', amenities: [] as string[], images: [] as DraftImage[] };
export const usePropertyDraft = create<PropertyDraft>()(persist((set) => ({ ...initial, set: (patch) => set(patch), reset: () => set(initial) }), { name: 'casaseg.property-draft', storage: createJSONStorage(() => appStorage) }));

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appStorage } from '@/lib/local-storage';

type OwnerDraft = { step: number; fullName: string; phone: string; address: string; taxId: string; payoutMethod: string; plan: string; setField: (field: keyof Omit<OwnerDraft, 'setField' | 'reset'>, value: string | number) => void; reset: () => void };
const initial = { step: 0, fullName: '', phone: '', address: '', taxId: '', payoutMethod: '', plan: 'basic' };
export const useOwnerDraft = create<OwnerDraft>()(persist((set) => ({ ...initial, setField: (field, value) => set({ [field]: value }), reset: () => set(initial) }), { name: 'casaseg.owner-draft', storage: createJSONStorage(() => appStorage), partialize: (state) => ({ step: state.step, fullName: state.fullName, phone: state.phone, address: state.address, taxId: state.taxId, payoutMethod: state.payoutMethod, plan: state.plan }) }));

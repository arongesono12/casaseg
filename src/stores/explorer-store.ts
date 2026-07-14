import { create } from 'zustand';
import { defaultPropertyFilters, type PropertyFilters } from '@/features/properties/schemas/property-filters.schema';

type ViewMode = 'list' | 'map';
type ExplorerState = {
  filters: PropertyFilters;
  viewMode: ViewMode;
  applyFilters: (filters: PropertyFilters) => void;
  setCategory: (category: PropertyFilters['category']) => void;
  setViewMode: (viewMode: ViewMode) => void;
  resetFilters: () => void;
};

export const useExplorerStore = create<ExplorerState>((set) => ({
  filters: defaultPropertyFilters,
  viewMode: 'list',
  applyFilters: (filters) => set({ filters }),
  setCategory: (category) => set((state) => ({ filters: { ...state.filters, category } })),
  setViewMode: (viewMode) => set({ viewMode }),
  resetFilters: () => set({ filters: defaultPropertyFilters }),
}));

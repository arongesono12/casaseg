import type { Property } from '@/types';
export type PropertyMapProps = { properties: Property[]; onSelect?: (property: Property) => void; userLocation?: { latitude: number; longitude: number } | null };
export declare function PropertyMap(props: PropertyMapProps): import('react').JSX.Element;

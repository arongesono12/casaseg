export type PropertyCoordinates = { latitude: number; longitude: number };
export type PropertyLocationPickerProps = {
  value: PropertyCoordinates | null;
  onChange: (coordinates: PropertyCoordinates | null) => void;
};
export declare function PropertyLocationPicker(props: PropertyLocationPickerProps): import('react').JSX.Element;

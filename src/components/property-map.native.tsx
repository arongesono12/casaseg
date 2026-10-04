import MapView, { Marker, type Region } from 'react-native-maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/constants/theme';
import type { Property } from '@/types';

type Props = { properties: Property[]; onSelect?: (property: Property) => void; userLocation?: { latitude: number; longitude: number } | null };
export function PropertyMap({ properties, onSelect, userLocation }: Props) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState<Region>({ latitude: 3.7504, longitude: 8.7371, latitudeDelta: 0.35, longitudeDelta: 0.35 });
  const groups = useMemo(() => {
    const byCity = new Map<string, Property[]>();
    for (const property of properties) {
      if (!property.coordinates) continue;
      const city = property.city || property.location;
      const group = byCity.get(city);
      if (group) group.push(property);
      else byCity.set(city, [property]);
    }
    return [...byCity.entries()];
  }, [properties]);
  const showClusters = region.latitudeDelta > 0.12;
  useEffect(() => {
    if (!mapReady) return;
    const coordinates = properties.flatMap((property) => property.coordinates ? [property.coordinates] : []);
    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion({ ...coordinates[0], latitudeDelta: 0.08, longitudeDelta: 0.08 }, 250);
    } else if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, { edgePadding: { top: 100, right: 60, bottom: 180, left: 60 }, animated: true });
    }
  }, [mapReady, properties]);

  return <MapView ref={mapRef} style={styles.map} initialRegion={region} onMapReady={() => setMapReady(true)} onRegionChangeComplete={setRegion} showsUserLocation={Boolean(userLocation)}>{groups.flatMap(([city, items]) => {
    if (showClusters && items.length > 1) {
      const coordinates = {
        latitude: items.reduce((sum, item) => sum + item.coordinates!.latitude, 0) / items.length,
        longitude: items.reduce((sum, item) => sum + item.coordinates!.longitude, 0) / items.length,
      };
      return [<Marker key={`cluster-${city}`} coordinate={coordinates} onPress={() => mapRef.current?.animateToRegion({ ...coordinates, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 250)}><View style={styles.cluster}><Text style={styles.clusterText}>{items.length}</Text></View></Marker>];
    }
    return items.map((property) => <Marker key={property.id} coordinate={property.coordinates!} title={property.title} onPress={() => onSelect?.(property)} />);
  })}</MapView>;
}
const styles = StyleSheet.create({ map: { flex: 1 }, cluster: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }, clusterText: { color: 'white', fontFamily: fontFamily.bold } });

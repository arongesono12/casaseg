import MapView, { Marker, type Region } from 'react-native-maps';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { properties } from '@/data/properties';
import type { Property } from '@/types';

type Props = { onSelect?: (property: Property) => void; userLocation?: { latitude: number; longitude: number } | null };
export function PropertyMap({ onSelect, userLocation }: Props) {
  const [region, setRegion] = useState<Region>({ latitude: 3.7504, longitude: 8.7371, latitudeDelta: 0.35, longitudeDelta: 0.35 });
  const nearby = properties.filter((property) => property.city !== 'Bata'); const distant = properties.filter((property) => property.city === 'Bata'); const showCluster = region.latitudeDelta > 0.12;
  return <MapView style={styles.map} initialRegion={region} onRegionChangeComplete={setRegion} showsUserLocation={Boolean(userLocation)}>{showCluster ? <Marker coordinate={{ latitude: 3.7585, longitude: 8.7852 }} onPress={() => onSelect?.(nearby[0])}><View style={styles.cluster}><Text style={styles.clusterText}>{nearby.length}</Text></View></Marker> : nearby.map((property) => property.coordinates && <Marker key={property.id} coordinate={property.coordinates} title={property.title} onPress={() => onSelect?.(property)} />)}{distant.map((property) => property.coordinates && <Marker key={property.id} coordinate={property.coordinates} title={property.title} onPress={() => onSelect?.(property)} />)}</MapView>;
}
const styles = StyleSheet.create({ map: { flex: 1 }, cluster: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }, clusterText: { color: 'white', fontWeight: '900' } });

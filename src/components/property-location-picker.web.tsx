import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';
import type { PropertyCoordinates, PropertyLocationPickerProps } from './property-location-picker';

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const { palette } = useAppTheme();
  const [latitude, setLatitude] = useState(value?.latitude.toString() ?? '');
  const [longitude, setLongitude] = useState(value?.longitude.toString() ?? '');

  const update = (nextLatitude: string, nextLongitude: string) => {
    const lat = Number(nextLatitude);
    const lng = Number(nextLongitude);
    const valid = nextLatitude.trim() !== '' && nextLongitude.trim() !== ''
      && Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    onChange(valid ? { latitude: lat, longitude: lng } satisfies PropertyCoordinates : null);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: palette.textSecondary }]}>Introduce las coordenadas exactas de la vivienda para mostrarla en el mapa.</Text>
      <View style={styles.row}>
        <TextInput accessibilityLabel="Latitud de la vivienda" keyboardType="numbers-and-punctuation" placeholder="Latitud" placeholderTextColor={palette.muted} value={latitude} onChangeText={(text) => { setLatitude(text); update(text, longitude); }} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]} />
        <TextInput accessibilityLabel="Longitud de la vivienda" keyboardType="numbers-and-punctuation" placeholder="Longitud" placeholderTextColor={palette.muted} value={longitude} onChangeText={(text) => { setLongitude(text); update(latitude, text); }} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]} />
      </View>
      <Text style={styles.status}>{value ? 'Coordenadas válidas' : 'Introduce ambas coordenadas para continuar'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  hint: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12 },
  status: { color: colors.brandDark, fontSize: 13, fontWeight: '700' },
});

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontFamily, radius } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { PropertyCoordinates, PropertyLocationPickerProps } from './property-location-picker';

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const { palette } = useAppTheme();
  const { t } = useI18n();
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
      <Text style={[styles.hint, { color: palette.textSecondary }]}>{t('coordinatesHint')}</Text>
      <View style={styles.row}>
        <TextInput accessibilityLabel={t('latitudeLabel')} keyboardType="numbers-and-punctuation" placeholder={t('latitude')} placeholderTextColor={palette.muted} value={latitude} onChangeText={(text) => { setLatitude(text); update(text, longitude); }} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]} />
        <TextInput accessibilityLabel={t('longitudeLabel')} keyboardType="numbers-and-punctuation" placeholder={t('longitude')} placeholderTextColor={palette.muted} value={longitude} onChangeText={(text) => { setLongitude(text); update(latitude, text); }} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]} />
      </View>
      <Text style={[styles.status, { color: palette.brandText }]}>{value ? t('coordinatesValid') : t('coordinatesPending')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12 },
  status: { color: colors.brandDark, fontSize: 13, fontFamily: fontFamily.bold },
});

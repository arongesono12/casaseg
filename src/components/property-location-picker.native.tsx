import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { PropertyLocationPickerProps } from './property-location-picker';

export function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: palette.textSecondary }]}>{t('pickLocationHint')}</Text>
      <MapView
        style={styles.map}
        initialRegion={{ latitude: value?.latitude ?? 3.7504, longitude: value?.longitude ?? 8.7371, latitudeDelta: 0.35, longitudeDelta: 0.35 }}
        onPress={(event) => onChange(event.nativeEvent.coordinate)}>
        {value && <Marker coordinate={value} draggable onDragEnd={(event) => onChange(event.nativeEvent.coordinate)} />}
      </MapView>
      <Text style={[styles.status, { color: palette.brandText }]}>{value ? t('pickLocationDone') : t('pickLocationPending')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  hint: { fontSize: 13, lineHeight: 19 },
  map: { width: '100%', height: 260, borderRadius: radius.md },
  status: { color: colors.brandDark, fontSize: 13, fontWeight: '700' },
});

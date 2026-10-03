import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, List, LocateFixed, Search } from '@/components/ui/icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterSheet, type FilterSheetHandle } from '@/components/filter-sheet';
import { PropertyMap } from '@/components/property-map';
import { actionGradient, colors, radius } from '@/constants/theme';
import { useMapProperties } from '@/features/properties/hooks/use-properties';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import { useExplorerStore } from '@/stores/explorer-store';
import { formatXaf } from '@/utils/formatters';
import { pressRipple, usesRipple } from '@/lib/press-feedback';

export default function MapScreen() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const filterRef = useRef<FilterSheetHandle>(null);
  const filters = useExplorerStore((state) => state.filters);
  const setViewMode = useExplorerStore((state) => state.setViewMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapQuery = useMapProperties(filters);
  const properties = mapQuery.data ?? [];
  const mappedCount = properties.filter((property) => property.coordinates).length;
  const selected = properties.find((property) => property.id === selectedId);

  const locate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('locationDeniedTitle'), t('locationDeniedBody'));
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setUserLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
  };
  const requestLocation = () => Alert.alert(t('useMyLocation'), t('useMyLocationBody'), [{ text: t('notNow'), style: 'cancel' }, { text: t('continue'), onPress: () => void locate() }]);
  const openList = () => { setViewMode('list'); router.replace('/(tabs)/explore'); };
  const goBack = () => { setViewMode('list'); router.back(); };

  return (
    <View style={styles.container}>
      <PropertyMap properties={properties} onSelect={(property) => setSelectedId(property.id)} userLocation={userLocation} />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.top}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('back')} android_ripple={pressRipple} onPress={goBack} style={({ pressed }) => [styles.iconButton, { backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}><ArrowLeft color={palette.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={filters.location ? `${t('mapSearch')}: ${filters.location}` : t('mapSearch')} android_ripple={pressRipple} onPress={() => filterRef.current?.present()} style={({ pressed }) => [styles.search, { backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}><Search color={palette.textSecondary} size={20} /><Text numberOfLines={1} style={[styles.searchText, { color: palette.text }]}>{filters.location || t('mapSearch')}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('viewList')} android_ripple={pressRipple} onPress={openList} style={({ pressed }) => [styles.viewToggle, pressed && !usesRipple && styles.pressed]}><LinearGradient colors={actionGradient} style={styles.viewToggleGradient}><List color="white" size={21} /></LinearGradient></Pressable>
          </View>
          {!mapQuery.isError && <View style={[styles.count, { backgroundColor: palette.surface }]}>
            {mapQuery.isPending ? <ActivityIndicator color={palette.brandIcon} /> : <Text style={[styles.countText, { color: palette.text }]}>{t('mapCount', { shown: String(mappedCount), total: String(properties.length) })}</Text>}
          </View>}
          {mapQuery.isError && <Pressable accessibilityRole="button" android_ripple={pressRipple} onPress={() => void mapQuery.refetch()} style={({ pressed }) => [styles.count, { backgroundColor: palette.surface, minHeight: 48, justifyContent: 'center' }, pressed && !usesRipple && styles.pressed]}><Text style={[styles.countText, { color: palette.errorText }]}>{t('mapLoadError')}</Text></Pressable>}
        </View>
        <View style={styles.bottom}>
          <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('myLocation')} android_ripple={pressRipple} onPress={requestLocation} style={({ pressed }) => [styles.iconButton, { backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}><LocateFixed color={palette.brandIcon} size={22} /></Pressable></View>
          {selected && <Pressable accessibilityRole="button" accessibilityLabel={t('viewProperty', { title: selected.title })} android_ripple={pressRipple} onPress={() => router.push({ pathname: '/property/[id]', params: { id: selected.id } })} style={({ pressed }) => [styles.selected, { backgroundColor: palette.surface }, pressed && !usesRipple && styles.pressed]}><Image source={{ uri: selected.imageUrls[0] }} cachePolicy="disk" contentFit="cover" style={styles.thumb} /><View style={styles.selectedCopy}><Text numberOfLines={1} style={[styles.selectedTitle, { color: palette.text }]}>{selected.title}</Text><Text style={[styles.selectedLocation, { color: palette.textSecondary }]}>{selected.location}</Text><Text style={[styles.selectedPrice, { color: colors.brandDark }]}>{formatXaf(selected.price, undefined, locale)}</Text></View></Pressable>}
        </View>
      </SafeAreaView>
      <FilterSheet ref={filterRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-between' },
  top: { gap: 10 },
  header: { paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  search: { flex: 1, minHeight: 50, borderRadius: radius.pill, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchText: { flex: 1, fontSize: 15, fontWeight: '800' },
  viewToggle: { borderRadius: 25, height: 50, overflow: 'hidden', width: 50 },
  viewToggleGradient: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  count: { alignSelf: 'center', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  countText: { fontSize: 13, fontWeight: '800' },
  bottom: { padding: 16, gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  selected: { minHeight: 104, borderRadius: radius.lg, padding: 10, flexDirection: 'row', gap: 12 },
  thumb: { width: 108, borderRadius: radius.md },
  selectedCopy: { flex: 1, justifyContent: 'center', gap: 4 },
  selectedTitle: { fontSize: 15, fontWeight: '700' },
  selectedLocation: { fontSize: 13 },
  selectedPrice: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});

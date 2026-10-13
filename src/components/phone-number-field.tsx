import { useLocales } from 'expo-localization';
import { useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronDown, Search, X } from '@/components/ui/icons';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { callingCountryForRegion, countryCallingCodes, phoneWithCallingCode, type CountryCallingCode } from '@/features/auth/country-calling-codes';
import { defineCopy, useCopy, useI18n, type Locale } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const copy = defineCopy({
  es: { country: 'Prefijo de país', number: 'Número sin prefijo', search: 'Buscar país o prefijo', empty: 'No se encontró ningún país', close: 'Cerrar países' },
  fr: { country: 'Indicatif du pays', number: 'Numéro sans indicatif', search: 'Rechercher un pays ou un indicatif', empty: 'Aucun pays trouvé', close: 'Fermer la liste des pays' },
  en: { country: 'Country calling code', number: 'Number without calling code', search: 'Search country or calling code', empty: 'No country found', close: 'Close countries' },
});

function countryName(country: CountryCallingCode, locale: Locale): string {
  return country[locale === 'es' ? 2 : locale === 'fr' ? 3 : 4];
}

function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

type RegistrationPhoneFieldProps = {
  label: string;
  error?: string;
  onChange: (phone: string) => void;
  onBlur: () => void;
};

export function RegistrationPhoneField({ label, error, onChange, onBlur }: RegistrationPhoneFieldProps) {
  const { locale } = useI18n();
  const labels = useCopy(copy);
  const { palette } = useAppTheme();
  const deviceLocales = useLocales();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [country, setCountry] = useState<CountryCallingCode>(() => callingCountryForRegion(deviceLocales[0]?.regionCode));
  const [nationalNumber, setNationalNumber] = useState('');
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const countries = useMemo(() => {
    const query = searchable(search.trim());
    return countryCallingCodes
      .filter((entry) => !query || searchable(`${entry[0]} ${entry[1]} ${countryName(entry, locale)}`).includes(query))
      .sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale));
  }, [locale, search]);

  const selectCountry = (selected: CountryCallingCode) => {
    setCountry(selected);
    onChange(phoneWithCallingCode(selected, nationalNumber));
    setVisible(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: palette.surface, borderColor: error ? colors.error : palette.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${labels.country}: ${countryName(country, locale)}, ${country[1]}`}
          accessibilityState={{ expanded: visible }}
          onPress={() => { setSearch(''); setVisible(true); }}
          style={[styles.countryButton, { borderRightColor: palette.border }]}
        >
          <Text style={[styles.callingCode, { color: palette.text }]}>{country[1]}</Text>
          <ChevronDown color={palette.textSecondary} size={16} />
        </Pressable>
        <TextInput
          accessibilityLabel={labels.number}
          autoComplete="tel-national"
          keyboardType="phone-pad"
          onBlur={onBlur}
          onChangeText={(value) => {
            const next = value.startsWith(country[1]) ? value.slice(country[1].length).trimStart() : value;
            setNationalNumber(next);
            onChange(phoneWithCallingCode(country, next));
          }}
          placeholder={labels.number}
          placeholderTextColor={palette.muted}
          returnKeyType="next"
          style={[styles.numberInput, { color: palette.text }]}
          value={nationalNumber}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{error}</Text> : null}

      <Modal animationType="fade" onRequestClose={() => setVisible(false)} statusBarTranslucent transparent visible={visible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalLayout}>
          <Pressable accessibilityLabel={labels.close} accessibilityRole="button" onPress={() => setVisible(false)} style={StyleSheet.absoluteFill} />
          <View style={[styles.panel, { backgroundColor: palette.surface, maxHeight: Math.max(260, height - insets.top - insets.bottom - 48) }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: palette.text }]}>{labels.country}</Text>
              <Pressable accessibilityLabel={labels.close} accessibilityRole="button" onPress={() => setVisible(false)} style={styles.closeButton}>
                <X color={palette.textSecondary} size={20} />
              </Pressable>
            </View>
            <View style={[styles.searchRow, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <Search color={palette.textSecondary} size={18} />
              <TextInput
                accessibilityLabel={labels.search}
                autoCapitalize="none"
                onChangeText={setSearch}
                placeholder={labels.search}
                placeholderTextColor={palette.muted}
                style={[styles.searchInput, { color: palette.text }]}
                value={search}
              />
            </View>
            <FlatList
              data={countries}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item[0]}
              ListEmptyComponent={<Text style={[styles.empty, { color: palette.textSecondary }]}>{labels.empty}</Text>}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${countryName(item, locale)}, ${item[1]}`}
                  onPress={() => selectCountry(item)}
                  style={({ pressed }) => [styles.countryRow, { backgroundColor: item[0] === country[0] ? palette.subtle : palette.surface }, pressed && styles.pressed]}
                >
                  <Text numberOfLines={1} style={[styles.countryName, { color: palette.text }]}>{countryName(item, locale)}</Text>
                  <Text style={[styles.rowCode, { color: palette.textSecondary }]}>{item[1]}</Text>
                </Pressable>
              )}
              style={styles.list}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontFamily: fontFamily.extrabold },
  inputRow: { minHeight: 54, borderWidth: 1, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  countryButton: { minHeight: 52, minWidth: 102, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRightWidth: 1 },
  callingCode: { fontFamily: fontFamily.semibold, fontSize: 15 },
  numberInput: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 14, fontFamily: fontFamily.regular, fontSize: 15 },
  error: { fontFamily: fontFamily.regular, fontSize: 13 },
  modalLayout: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.42)' },
  panel: { width: '92%', maxWidth: 440, borderRadius: radius.lg, overflow: 'hidden', paddingBottom: 8 },
  panelHeader: { minHeight: 58, paddingLeft: 20, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontFamily: fontFamily.bold, fontSize: 17 },
  closeButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  searchRow: { minHeight: 48, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 13, borderWidth: 1, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, minHeight: 46, fontFamily: fontFamily.regular, fontSize: 14 },
  list: { flexGrow: 0 },
  countryRow: { minHeight: touchTarget, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryName: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14 },
  rowCode: { fontFamily: fontFamily.semibold, fontSize: 14 },
  empty: { padding: 24, textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 14 },
  pressed: { opacity: 0.72 },
});

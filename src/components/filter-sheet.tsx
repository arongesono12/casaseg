import { zodResolver } from '@hookform/resolvers/zod';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { actionGradient, colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { defaultPropertyFilters, propertyFiltersSchema, type PropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { usePropertyCount } from '@/features/properties/hooks/use-properties';
import { haptics } from '@/lib/haptics';
import { onBrandRipple, pressRipple } from '@/lib/press-feedback';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import type { TranslationKey } from '@/providers/i18n-provider';
import { useExplorerStore } from '@/stores/explorer-store';

export type FilterSheetHandle = { present: () => void; dismiss: () => void };
// Los valores son los del esquema de filtros; la etiqueta visible sale del idioma activo.
const categories: [PropertyFilters['category'], TranslationKey][] = [['Todos', 'all'], ['Apartamentos', 'apartments'], ['Casas', 'houses'], ['Estudios', 'studios']];
const availability: [PropertyFilters['availability'], TranslationKey][] = [['all', 'all'], ['available', 'availableOnly'], ['occupied', 'occupiedOnly']];
const sorting: [PropertyFilters['sort'], TranslationKey][] = [['recommended', 'recommended'], ['rating', 'sortRating'], ['price-asc', 'sortPriceAsc'], ['price-desc', 'sortPriceDesc'], ['newest', 'sortNewest']];

export const FilterSheet = forwardRef<FilterSheetHandle>(function FilterSheet(_, ref) {
  const modalRef = useRef<BottomSheetModal>(null);
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const appliedFilters = useExplorerStore((state) => state.filters);
  const applyFilters = useExplorerStore((state) => state.applyFilters);
  const snapPoints = useMemo(() => ['90%'], []);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<PropertyFilters>({ resolver: zodResolver(propertyFiltersSchema), defaultValues: appliedFilters });
  const draft = useWatch({ control });
  const { location, name, category, maxPrice, availability: availabilityValue, sort } = draft;
  const validDraft = useMemo(() => {
    const parsed = propertyFiltersSchema.safeParse({ location, name, category, maxPrice, availability: availabilityValue, sort });
    return parsed.success ? parsed.data : null;
  }, [location, name, category, maxPrice, availabilityValue, sort]);
  const [countFilters, setCountFilters] = useState<PropertyFilters | null>(appliedFilters);
  useEffect(() => {
    const timer = setTimeout(() => setCountFilters(validDraft), 300);
    return () => clearTimeout(timer);
  }, [validDraft]);
  const countQuery = usePropertyCount(countFilters);
  const countIsCurrent = validDraft && countFilters && JSON.stringify(validDraft) === JSON.stringify(countFilters);

  useImperativeHandle(ref, () => ({
    present: () => { reset(appliedFilters); modalRef.current?.present(); },
    dismiss: () => modalRef.current?.dismiss(),
  }), [appliedFilters, reset]);

  const renderBackdrop = useCallback((props: React.ComponentProps<typeof BottomSheetBackdrop>) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />, []);
  const onValid = useCallback((values: PropertyFilters) => { haptics.tap(); applyFilters(values); modalRef.current?.dismiss(); }, [applyFilters]);

  return (
    <BottomSheetModal ref={modalRef} snapPoints={snapPoints} enableDynamicSizing={false} backdropComponent={renderBackdrop} keyboardBehavior="interactive" android_keyboardInputMode="adjustResize" backgroundStyle={{ backgroundColor: palette.surface }} handleIndicatorStyle={{ backgroundColor: palette.muted, width: 44 }}>
      <BottomSheetView style={styles.sheet}>
        <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={[styles.title, { color: palette.text }]}>{t('filtersTitle')}</Text><Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('filtersSubtitle')}</Text></View><Pressable accessibilityRole="button" onPress={() => reset(defaultPropertyFilters)} style={styles.reset}><Text style={[styles.resetText, { color: palette.brandText }]}>{t('reset')}</Text></Pressable></View>
          <Field control={control} name="location" label={t('location')} placeholder="Malabo, Bata, Sipopo…" error={errors.location?.message} />
          <Field control={control} name="name" label={t('propertyName')} placeholder={t('propertyName')} error={errors.name?.message} />
          <Field control={control} name="maxPrice" label={t('maxPrice')} placeholder="1200000" keyboardType="numeric" error={errors.maxPrice?.message} />
          <ChoiceField control={control} name="category" label={t('category')} options={categories} />
          <ChoiceField control={control} name="availability" label={t('availability')} options={availability} />
          <ChoiceField control={control} name="sort" label={t('sort')} options={sorting} />
        </BottomSheetScrollView>
        <View style={[styles.footer, { borderColor: palette.border, backgroundColor: palette.surface }]}><Pressable accessibilityRole="button" android_ripple={onBrandRipple} onPress={() => void handleSubmit(onValid)()} style={styles.applyShell}><LinearGradient colors={actionGradient} style={styles.applyButton}><Text style={styles.applyText}>{t('showResults', { count: countIsCurrent && countQuery.data !== undefined ? String(countQuery.data) : '…' })}</Text></LinearGradient></Pressable></View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

type FieldProps = { control: ReturnType<typeof useForm<PropertyFilters>>['control']; name: 'location' | 'name' | 'maxPrice'; label: string; placeholder: string; keyboardType?: 'default' | 'numeric'; error?: string };
function Field({ control, name, label, placeholder, keyboardType = 'default', error }: FieldProps) { const { palette } = useAppTheme(); return <View style={styles.fieldGroup}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><Controller control={control} name={name} render={({ field: { value, onChange, onBlur } }) => <BottomSheetTextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={palette.muted} value={value} onBlur={onBlur} onChangeText={onChange} keyboardType={keyboardType} style={[styles.input, { backgroundColor: palette.subtle, borderColor: error ? colors.error : palette.border, color: palette.text }]} />} />{error && <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{error}</Text>}</View>; }

type ChoiceName = 'category' | 'availability' | 'sort';
function ChoiceField({ control, name, label, options }: { control: ReturnType<typeof useForm<PropertyFilters>>['control']; name: ChoiceName; label: string; options: [string, TranslationKey][] }) {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  return <View style={styles.fieldGroup}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><Controller control={control} name={name} render={({ field: { value, onChange } }) => <View style={styles.choices}>{options.map(([option, labelKey]) => { const selected = value === option; return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected }} android_ripple={pressRipple} onPress={() => { if (!selected) haptics.selection(); onChange(option); }} style={[styles.choice, { borderColor: selected ? palette.brandIcon : palette.border, backgroundColor: selected ? palette.brandSoft : palette.surface }]}><Text style={[styles.choiceText, { color: selected ? palette.brandText : palette.textSecondary }]}>{t(labelKey)}</Text></Pressable>; })}</View>} /></View>;
}

const styles = StyleSheet.create({ sheet: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 }, headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, headingCopy: { flex: 1, gap: 4 }, title: { fontSize: 27, lineHeight: 33, fontFamily: fontFamily.extrabold }, subtitle: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 }, reset: { minHeight: touchTarget, borderRadius: radius.pill, justifyContent: 'center' }, resetText: { fontSize: 14, fontFamily: fontFamily.extrabold }, fieldGroup: { gap: 8 }, label: { fontSize: 13, fontFamily: fontFamily.extrabold }, input: { fontFamily: fontFamily.regular, minHeight: 54, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 }, error: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, justifyContent: 'center', overflow: 'hidden' }, applyShell: { borderRadius: radius.pill, overflow: 'hidden' }, choiceText: { fontSize: 13, fontFamily: fontFamily.bold }, footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }, applyButton: { minHeight: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }, applyText: { color: 'white', fontSize: 16, fontFamily: fontFamily.bold } });

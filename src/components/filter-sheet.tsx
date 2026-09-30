import { zodResolver } from '@hookform/resolvers/zod';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { actionGradient, colors, radius } from '@/constants/theme';
import { defaultPropertyFilters, propertyFiltersSchema, type PropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { usePropertyCount } from '@/features/properties/hooks/use-properties';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';
import { useExplorerStore } from '@/stores/explorer-store';

export type FilterSheetHandle = { present: () => void; dismiss: () => void };
const categories: PropertyFilters['category'][] = ['Todos', 'Apartamentos', 'Casas', 'Estudios'];
const availability: [PropertyFilters['availability'], string][] = [['all', 'Todas'], ['available', 'Disponibles'], ['occupied', 'Ocupadas']];
const sorting: [PropertyFilters['sort'], string][] = [['recommended', 'Recomendadas'], ['rating', 'Mejor valoradas'], ['price-asc', 'Menor precio'], ['price-desc', 'Mayor precio'], ['newest', 'Más recientes']];

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
  const onValid = useCallback((values: PropertyFilters) => { applyFilters(values); modalRef.current?.dismiss(); }, [applyFilters]);

  return (
    <BottomSheetModal ref={modalRef} snapPoints={snapPoints} enableDynamicSizing={false} backdropComponent={renderBackdrop} keyboardBehavior="interactive" android_keyboardInputMode="adjustResize" backgroundStyle={{ backgroundColor: palette.surface }} handleIndicatorStyle={{ backgroundColor: palette.muted, width: 44 }}>
      <BottomSheetView style={styles.sheet}>
        <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={[styles.title, { color: palette.text }]}>{t('filtersTitle')}</Text><Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('filtersSubtitle')}</Text></View><Pressable accessibilityRole="button" onPress={() => reset(defaultPropertyFilters)} style={styles.reset}><Text style={styles.resetText}>{t('reset')}</Text></Pressable></View>
          <Field control={control} name="location" label={t('location')} placeholder="Malabo, Bata, Sipopo…" error={errors.location?.message} />
          <Field control={control} name="name" label={t('propertyName')} placeholder={t('propertyName')} error={errors.name?.message} />
          <Field control={control} name="maxPrice" label={t('maxPrice')} placeholder="1200000" keyboardType="numeric" error={errors.maxPrice?.message} />
          <ChoiceField control={control} name="category" label={t('category')} options={categories.map((value) => [value, value])} />
          <ChoiceField control={control} name="availability" label={t('availability')} options={availability} />
          <ChoiceField control={control} name="sort" label={t('sort')} options={sorting} />
        </BottomSheetScrollView>
        <View style={[styles.footer, { borderColor: palette.border, backgroundColor: palette.surface }]}><Pressable accessibilityRole="button" onPress={() => void handleSubmit(onValid)()}><LinearGradient colors={actionGradient} style={styles.applyButton}><Text style={styles.applyText}>{t('showResults', { count: countIsCurrent && countQuery.data !== undefined ? String(countQuery.data) : '…' })}</Text></LinearGradient></Pressable></View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

type FieldProps = { control: ReturnType<typeof useForm<PropertyFilters>>['control']; name: 'location' | 'name' | 'maxPrice'; label: string; placeholder: string; keyboardType?: 'default' | 'numeric'; error?: string };
function Field({ control, name, label, placeholder, keyboardType = 'default', error }: FieldProps) { const { palette } = useAppTheme(); return <View style={styles.fieldGroup}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><Controller control={control} name={name} render={({ field: { value, onChange, onBlur } }) => <BottomSheetTextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={palette.muted} value={value} onBlur={onBlur} onChangeText={onChange} keyboardType={keyboardType} style={[styles.input, { backgroundColor: palette.subtle, borderColor: error ? colors.error : palette.border, color: palette.text }]} />} />{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>; }

type ChoiceName = 'category' | 'availability' | 'sort';
function ChoiceField({ control, name, label, options }: { control: ReturnType<typeof useForm<PropertyFilters>>['control']; name: ChoiceName; label: string; options: string[][] }) { const { palette } = useAppTheme(); return <View style={styles.fieldGroup}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><Controller control={control} name={name} render={({ field: { value, onChange } }) => <View style={styles.choices}>{options.map(([option, text]) => { const selected = value === option; return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(option)} style={[styles.choice, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? 'rgba(37,99,235,0.12)' : palette.surface }]}><Text style={[styles.choiceText, { color: selected ? colors.brandDark : palette.textSecondary }]}>{text}</Text></Pressable>; })}</View>} /></View>; }

const styles = StyleSheet.create({ sheet: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 }, headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, headingCopy: { flex: 1, gap: 4 }, title: { fontSize: 27, lineHeight: 33, fontWeight: '900' }, subtitle: { fontSize: 14, lineHeight: 20 }, reset: { minHeight: 44, justifyContent: 'center' }, resetText: { color: colors.brandDark, fontSize: 14, fontWeight: '800' }, fieldGroup: { gap: 8 }, label: { fontSize: 13, fontWeight: '800' }, input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 }, error: { color: colors.error, fontSize: 13 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, justifyContent: 'center' }, choiceText: { fontSize: 13, fontWeight: '700' }, footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }, applyButton: { minHeight: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, applyText: { color: 'white', fontSize: 16, fontWeight: '900' } });

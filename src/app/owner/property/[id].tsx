import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { useProperty } from '@/features/properties/hooks/use-properties';
import { updateProperty } from '@/features/owner/update-property';
import { isValidFeeAmountInput } from '@/features/properties/pricing';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property } from '@/types';

type EditValues = {
  title: string;
  description: string;
  price: string;
  serviceFeeAmount: string;
  cleaningFeeAmount: string;
  taxAmount: string;
  securityDepositAmount: string;
};

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useProperty(id);
  const { t } = useI18n();
  if (!property.data) return <RouteScreen title={t('editProperty')} description={t('loadingListing')} />;
  return <EditForm property={property.data} />;
}

function EditForm({ property }: { property: Property }) {
  const client = useQueryClient();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const { control, handleSubmit } = useForm<EditValues>({
    defaultValues: {
      title: property.title,
      description: property.description,
      price: String(property.price),
      serviceFeeAmount: String(property.serviceFeeAmount ?? 0),
      cleaningFeeAmount: String(property.cleaningFeeAmount ?? 0),
      taxAmount: String(property.taxAmount ?? 0),
      securityDepositAmount: String(property.securityDepositAmount ?? 0),
    },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => updateProperty(property.id, {
      title: values.title,
      description: values.description,
      price: Number(values.price),
      serviceFeeAmount: Number(values.serviceFeeAmount),
      cleaningFeeAmount: Number(values.cleaningFeeAmount),
      taxAmount: Number(values.taxAmount),
      securityDepositAmount: Number(values.securityDepositAmount),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: propertyKeys.all }),
  });

  return (
    <RouteScreen title={t('editProperty')} description={t('editPropertyNote')}>
      <Controller control={control} name="title" render={({ field }) => <FormField label={t('title')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />} />
      <Controller control={control} name="description" render={({ field }) => <FormField label={t('description')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline />} />
      <Controller control={control} name="price" render={({ field }) => <FormField label={t('price')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" />} />
      <Controller control={control} name="serviceFeeAmount" rules={{ validate: (value) => isValidFeeAmountInput(value) || t('invalidFeeAmount') }} render={({ field, fieldState }) => <FormField label={`${t('serviceFee')} (FCFA)`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" error={fieldState.error?.message} />} />
      <Controller control={control} name="cleaningFeeAmount" rules={{ validate: (value) => isValidFeeAmountInput(value) || t('invalidFeeAmount') }} render={({ field, fieldState }) => <FormField label={`${t('cleaningFee')} (FCFA)`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" error={fieldState.error?.message} />} />
      <Controller control={control} name="taxAmount" rules={{ validate: (value) => isValidFeeAmountInput(value) || t('invalidFeeAmount') }} render={({ field, fieldState }) => <FormField label={`${t('taxes')} (FCFA)`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" error={fieldState.error?.message} />} />
      <Controller control={control} name="securityDepositAmount" rules={{ validate: (value) => isValidFeeAmountInput(value) || t('invalidFeeAmount') }} render={({ field, fieldState }) => <FormField label={`${t('securityDeposit')} (FCFA)`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" error={fieldState.error?.message} />} />
      <PremiumButton label={save.isPending ? t('saving') : t('saveChanges')} loading={save.isPending} onPress={() => void handleSubmit((values) => save.mutate(values))()} />
      {save.error ? <Text accessibilityRole="alert" style={{ color: palette.errorText }}>{save.error.message}</Text> : null}
    </RouteScreen>
  );
}

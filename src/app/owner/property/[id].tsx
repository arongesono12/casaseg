import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { useProperty } from '@/features/properties/hooks/use-properties';
import { updateProperty } from '@/features/owner/update-property';
import type { Property } from '@/types';

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useProperty(id);
  if (!property.data) return <RouteScreen title="Editar propiedad" description="Cargando publicación…" />;
  return <EditForm property={property.data} />;
}

function EditForm({ property }: { property: Property }) {
  const client = useQueryClient();
  const { control, handleSubmit } = useForm({
    defaultValues: {
      title: property.title,
      description: property.description,
      price: String(property.price),
    },
  });
  const save = useMutation({
    mutationFn: (values: { title: string; description: string; price: string }) => updateProperty(property.id, {
      title: values.title,
      description: values.description,
      price: Number(values.price),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: propertyKeys.detail(property.id) }),
  });

  return (
    <RouteScreen title="Editar propiedad" description="Los cambios se validan de nuevo en el servidor.">
      <Controller control={control} name="title" render={({ field }) => <FormField label="Título" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />} />
      <Controller control={control} name="description" render={({ field }) => <FormField label="Descripción" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline />} />
      <Controller control={control} name="price" render={({ field }) => <FormField label="Precio" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" />} />
      <PremiumButton label={save.isPending ? 'Guardando…' : 'Guardar cambios'} loading={save.isPending} onPress={() => void handleSubmit((values) => save.mutate(values))()} />
      {save.error ? <Text style={{ color: colors.error }}>{save.error.message}</Text> : null}
    </RouteScreen>
  );
}

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type PropertyPatch = {
  title: string;
  price: number;
  description: string;
  serviceFeeAmount: number;
  cleaningFeeAmount: number;
  taxAmount: number;
  securityDepositAmount: number;
};

export async function updateProperty(propertyId: string, patch: PropertyPatch) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.functions.invoke('update-property', {
    body: {
      property_id: propertyId,
      title: patch.title,
      price: patch.price,
      description: patch.description,
      service_fee_amount: patch.serviceFeeAmount,
      cleaning_fee_amount: patch.cleaningFeeAmount,
      tax_amount: patch.taxAmount,
      security_deposit_amount: patch.securityDepositAmount,
    },
  });
  if (error) throw error;
}

import type { Property } from '@/types';

type PricedProperty = Pick<Property, 'price' | 'serviceFeeAmount' | 'cleaningFeeAmount' | 'taxAmount' | 'securityDepositAmount'>;

/** Importe inicial estimado: un periodo de precio más todos los cargos indicados. */
export function propertyInitialTotal(property: PricedProperty): number {
  return property.price
    + (property.serviceFeeAmount ?? 0)
    + (property.cleaningFeeAmount ?? 0)
    + (property.taxAmount ?? 0)
    + (property.securityDepositAmount ?? 0);
}

export function isValidFeeAmountInput(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' || (/^\d+$/.test(trimmed) && Number(trimmed) <= 10_000_000_000);
}

import type { Property } from '@/types';

type PricedProperty = Pick<Property, 'price' | 'serviceFeeAmount' | 'cleaningFeeAmount' | 'taxAmount' | 'securityDepositAmount'>;
type ChargeSource = Partial<Pick<Property, 'serviceFeeAmount' | 'cleaningFeeAmount' | 'taxAmount' | 'securityDepositAmount'>>;

export type PaymentBreakdown = {
  rentAmount: number;
  serviceFeeAmount: number;
  cleaningFeeAmount: number;
  taxAmount: number;
  securityDepositAmount: number;
  totalDue: number;
};

const amount = (value: number | undefined): number => (Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0);

/**
 * Misma regla que la web (src/utils/rentalCharges.ts) y el cobro del servidor
 * (create_rental_payment_order): servicio e impuestos con cada pago; fianza y
 * limpieza solo con el primero. Los importes del contrato firmado mandan.
 */
export function paymentBreakdown(rentAmount: number, charges: ChargeSource, { firstPayment }: { firstPayment: boolean }): PaymentBreakdown {
  const rent = amount(rentAmount);
  const serviceFeeAmount = amount(charges.serviceFeeAmount);
  const taxAmount = amount(charges.taxAmount);
  const cleaningFeeAmount = firstPayment ? amount(charges.cleaningFeeAmount) : 0;
  const securityDepositAmount = firstPayment ? amount(charges.securityDepositAmount) : 0;
  return {
    rentAmount: rent,
    serviceFeeAmount,
    cleaningFeeAmount,
    taxAmount,
    securityDepositAmount,
    totalDue: rent + serviceFeeAmount + cleaningFeeAmount + taxAmount + securityDepositAmount,
  };
}

/** Primer pago: un periodo de precio más todos los cargos indicados. */
export function propertyInitialTotal(property: PricedProperty): number {
  return paymentBreakdown(property.price, property, { firstPayment: true }).totalDue;
}

/** Pagos siguientes: sin fianza ni limpieza. */
export function propertyNextPaymentTotal(property: PricedProperty): number {
  return paymentBreakdown(property.price, property, { firstPayment: false }).totalDue;
}

export function isValidFeeAmountInput(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' || (/^\d+$/.test(trimmed) && Number(trimmed) <= 10_000_000_000);
}

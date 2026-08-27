/**
 * Forma que el cliente espera de una orden de pago. La tabla usa
 * `payment_method`; la app lo llama `provider`. La traducción vive aquí para
 * que las dos funciones de pago no la escriban cada una a su manera.
 */
export type PaymentOrderPayload = {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  checkoutUrl?: string;
};

export const paymentOrderColumns = 'id,contract_id,amount,currency,payment_method,status,checkout_url';

export function toPaymentOrderPayload(row: Record<string, unknown>): PaymentOrderPayload {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    amount: Number(row.amount),
    currency: String(row.currency ?? 'XAF'),
    provider: String(row.payment_method),
    status: String(row.status),
    checkoutUrl: row.checkout_url ? String(row.checkout_url) : undefined,
  };
}

/**
 * Estado de una orden de alquiler (`rental_payment_orders`) sin dependencias de
 * React Native, para poder probarlo. Las reglas replican las del servidor
 * (rental-payment-cancel, rental-payment-confirm) y las del panel de pagos web.
 */

export type PaymentOrderStatus = 'pending' | 'awaiting_review' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

/** Valores del CHECK `rental_payment_orders_failure_reason_check`. */
export type PaymentFailureReason = 'cancelled_by_tenant' | 'declined_by_payer' | 'insufficient_funds' | 'provider_declined' | 'expired';

export type PaymentOrder = {
  id: string;
  contractId: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  /** Lo que paga el inquilino (renta + cargos): es el importe que se muestra. */
  totalDue: number;
  currency: string;
  provider: string;
  status: PaymentOrderStatus;
  paymentReference: string;
  checkoutUrl?: string;
  instructions: Record<string, string>;
  expiresAt?: string;
  failureReason?: PaymentFailureReason;
  cancelledAt?: string;
  electricityFeeAmount: number;
  waterFeeAmount: number;
  /** El inquilino ocultó este intento fallido de su historial. */
  hiddenByTenantAt?: string;
};

export const ORDER_COLUMNS = 'id,contract_id,tenant_id,owner_id,amount,total_due,currency,payment_method,status,payment_reference,checkout_url,instructions,expires_at,failure_reason,cancelled_at,electricity_fee_amount,water_fee_amount,hidden_by_tenant_at';

const knownStatuses: readonly PaymentOrderStatus[] = ['pending', 'awaiting_review', 'processing', 'completed', 'failed', 'cancelled', 'expired'];
const knownFailureReasons: readonly PaymentFailureReason[] = ['cancelled_by_tenant', 'declined_by_payer', 'insufficient_funds', 'provider_declined', 'expired'];
const closedStatuses: readonly PaymentOrderStatus[] = ['cancelled', 'expired', 'failed'];

type PaymentOrderRow = Record<string, unknown>;

function textRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export function mapPaymentOrder(row: PaymentOrderRow): PaymentOrder {
  const amount = Number(row.amount) || 0;
  const status = knownStatuses.includes(row.status as PaymentOrderStatus) ? (row.status as PaymentOrderStatus) : 'pending';
  const failureReason = knownFailureReasons.includes(row.failure_reason as PaymentFailureReason) ? (row.failure_reason as PaymentFailureReason) : undefined;
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    tenantId: String(row.tenant_id ?? ''),
    ownerId: String(row.owner_id ?? ''),
    amount,
    totalDue: Number(row.total_due) || amount,
    currency: String(row.currency ?? 'XAF'),
    provider: String(row.payment_method),
    status,
    paymentReference: String(row.payment_reference ?? ''),
    checkoutUrl: optionalText(row.checkout_url),
    instructions: textRecord(row.instructions),
    expiresAt: optionalText(row.expires_at),
    failureReason,
    cancelledAt: optionalText(row.cancelled_at),
    electricityFeeAmount: Number(row.electricity_fee_amount) || 0,
    waterFeeAmount: Number(row.water_fee_amount) || 0,
    hiddenByTenantAt: optionalText(row.hidden_by_tenant_at),
  };
}

/** Intentos que el inquilino puede ocultar: los que no llegaron a cobrarse. */
export const HIDEABLE_PAYMENT_STATUSES: readonly PaymentOrderStatus[] = closedStatuses;

/** Mismo criterio que set_rental_payment_order_hidden: solo el inquilino y solo intentos cerrados sin cobro. */
export function canTenantHidePayment(order: PaymentOrder, profileId: string | undefined): boolean {
  return Boolean(profileId) && order.tenantId === profileId && HIDEABLE_PAYMENT_STATUSES.includes(order.status);
}

/** Oculto solo para el inquilino que lo ocultó; el propietario sigue viéndolo. */
export function isHiddenByTenant(order: PaymentOrder, profileId: string | undefined): boolean {
  return Boolean(order.hiddenByTenantAt) && order.tenantId === profileId;
}

/** Orden todavía sin resolver (incluye el comprobante en revisión). */
export function isOpenPaymentStatus(status: PaymentOrderStatus): boolean {
  return status === 'pending' || status === 'awaiting_review' || status === 'processing';
}

/** Lo que acepta rental-payment-cancel: con el comprobante en revisión ya no. */
export function isCancellablePaymentStatus(status: PaymentOrderStatus): boolean {
  return status === 'pending' || status === 'processing';
}

export function canTenantCancelPayment(order: PaymentOrder, profileId: string | undefined): boolean {
  return Boolean(profileId) && order.tenantId === profileId && isCancellablePaymentStatus(order.status);
}

/** El aviso de saldo insuficiente no cierra la orden: solo se muestra mientras siga abierta. */
export function showsInsufficientFunds(order: PaymentOrder): boolean {
  return order.failureReason === 'insufficient_funds' && isCancellablePaymentStatus(order.status);
}

export type PaymentReturnOutcome = 'confirmed' | 'notCompleted' | 'processing';

/** Mismo criterio que usePaymentReturnConfirmation de la web. */
export function paymentReturnOutcome(result: { confirmed: boolean; status: PaymentOrderStatus }): PaymentReturnOutcome {
  if (result.confirmed || result.status === 'completed') return 'confirmed';
  if (closedStatuses.includes(result.status)) return 'notCompleted';
  return 'processing';
}

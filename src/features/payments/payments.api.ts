import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, refreshClerkToken, supabase } from '@/lib/supabase';
import { mapPaymentOrder, ORDER_COLUMNS, type PaymentOrder } from '@/features/payments/payment-order-state';

export {
  canTenantCancelPayment,
  isCancellablePaymentStatus,
  isOpenPaymentStatus,
  mapPaymentOrder,
  paymentReturnOutcome,
  showsInsufficientFunds,
  type PaymentFailureReason,
  type PaymentOrder,
  type PaymentOrderStatus,
  type PaymentReturnOutcome,
} from '@/features/payments/payment-order-state';

/**
 * Métodos que acepta create_rental_payment_order para órdenes nuevas (migraciones
 * 038/039/051 de la web). `mtn_money` y `orange_money` solo existen en datos
 * históricos; `stripe` depende de ENABLE_STRIPE_RENTAL_PAYMENTS en el servidor,
 * así que no se ofrece hasta que esté activado, igual que en la web.
 */
export const paymentProviders = ['fondoseg', 'muni_dinero', 'bank_transfer', 'ecobank'] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentProviderLabels: Record<PaymentProvider, string> = {
  fondoseg: 'FondosEG',
  muni_dinero: 'Muni Dinero',
  bank_transfer: 'Transferencia',
  ecobank: 'Ecobank',
};

/** rental-payment-initiate exige teléfono solo para estos métodos. */
export function providerRequiresPhone(provider: PaymentProvider): boolean {
  return provider === 'muni_dinero' || provider === 'ecobank';
}

export const paymentKeys = {
  all: ['payment-orders'] as const,
  order: (orderId: string) => ['payment-orders', orderId] as const,
};

/** Mismo texto que SESSION_EXPIRED_MESSAGE de la web. */
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión ha caducado o se cerró en otro dispositivo. Inicia sesión de nuevo para continuar con el pago.';

type PaymentOrderRow = Record<string, unknown>;

/** Órdenes donde el perfil es arrendatario o propietario; RLS filtra el resto. */
export async function fetchPaymentOrders(): Promise<PaymentOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('rental_payment_orders').select(ORDER_COLUMNS).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as PaymentOrderRow[]).map(mapPaymentOrder);
}

/**
 * Estado leído de la base de datos. Lo mueven el callback del proveedor,
 * rental-payment-confirm y la revisión administrativa; volver del navegador
 * nunca lo da por pagado.
 */
export async function fetchPaymentOrder(orderId: string): Promise<PaymentOrder> {
  const { data, error } = await supabase.from('rental_payment_orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('La orden de pago no existe.');
  return mapPaymentOrder(data as PaymentOrderRow);
}

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.clone().json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
    } catch {
      // Cuerpo no JSON: se usa el mensaje genérico.
    }
  }
  return fallback;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof FunctionsHttpError && (error.context as Response | undefined)?.status === 401;
}

/**
 * Invoca una Edge Function de pagos. Ante un 401 renueva el token de Clerk una
 * vez y reintenta, como `invokePaymentFunction` de la web con refreshSession().
 */
export async function invokePaymentFunction(name: string, body: Record<string, unknown>, fallback: string): Promise<Record<string, unknown>> {
  let { data, error } = await supabase.functions.invoke(name, { body });
  if (error && isUnauthorized(error)) {
    await refreshClerkToken();
    ({ data, error } = await supabase.functions.invoke(name, { body }));
    if (error && isUnauthorized(error)) throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  if (error) throw new Error(await functionErrorMessage(error, fallback));
  if (!data || typeof data !== 'object') throw new Error(fallback);
  return data as Record<string, unknown>;
}

function orderFrom(data: Record<string, unknown>, fallback: string): PaymentOrder {
  if (!data.order || typeof data.order !== 'object') throw new Error(typeof data.error === 'string' ? data.error : fallback);
  return mapPaymentOrder(data.order as PaymentOrderRow);
}

export type InitiatePaymentResult = { order: PaymentOrder; requiresRedirect: boolean; message: string };

/**
 * Mismo contrato que initiateRentalPayment de la web: la Edge Function
 * rental-payment-initiate crea la orden con create_rental_payment_order, inicia
 * el cobro con el proveedor y registra la aceptación de cargos y cancelación.
 *
 * La clave de idempotencia se genera una vez por intento: si la red reintenta,
 * el servidor devuelve la misma orden en lugar de cobrar dos veces.
 *
 * No se envía `returnUrl`: el servidor solo reenvía URLs https al proveedor y
 * descartaría `casaseg://`. Sin ella, el proveedor usa PAYMENT_RETURN_URL y la
 * app confirma el pago al cerrarse el navegador (openPaymentCheckout).
 */
export async function initiateRentalPayment(input: {
  contractId: string;
  provider: PaymentProvider;
  phoneNumber?: string;
  chargesAccepted: boolean;
  cancellationPolicyAccepted: boolean;
  idempotencyKey?: string;
}): Promise<InitiatePaymentResult> {
  if (!isSupabaseConfigured) throw new Error('Configura Supabase para crear órdenes reales.');
  if (providerRequiresPhone(input.provider) && !input.phoneNumber?.trim()) throw new Error('Este método necesita un número de teléfono.');
  if (!input.chargesAccepted || !input.cancellationPolicyAccepted) throw new Error('Debes aceptar el desglose de cargos y la política de cancelación antes de pagar.');

  const fallback = 'No se pudo iniciar el pago del alquiler.';
  const data = await invokePaymentFunction('rental-payment-initiate', {
    contractId: input.contractId,
    paymentMethod: input.provider,
    phoneNumber: input.phoneNumber?.trim() || undefined,
    idempotencyKey: input.idempotencyKey ?? Crypto.randomUUID(),
    chargesAccepted: true,
    cancellationPolicyAccepted: true,
    userAgent: `CasasEG Expo (${Platform.OS} ${String(Platform.Version)})`,
  }, fallback);
  return {
    order: orderFrom(data, 'El proveedor no devolvió una orden de pago válida.'),
    requiresRedirect: Boolean(data.requiresRedirect),
    message: String(data.message ?? 'Orden de pago creada.'),
  };
}

export type PaymentConfirmation = { order: PaymentOrder; confirmed: boolean; pendingConfirmation: boolean };

/**
 * rental-payment-confirm: el servidor consulta al proveedor y, si ya cobró,
 * completa la orden (idempotente con el webhook). Mismo contrato que
 * `confirmRentalPayment` de la web.
 */
export async function confirmRentalPayment(orderId: string): Promise<PaymentConfirmation> {
  const data = await invokePaymentFunction('rental-payment-confirm', { orderId }, 'No se pudo confirmar el pago.');
  const order = orderFrom(data, 'No se pudo confirmar el pago.');
  return { order, confirmed: Boolean(data.confirmed), pendingConfirmation: Boolean(data.pendingConfirmation) };
}

/**
 * Confirmación al volver del proveedor. Un fallo aquí no es fatal: el webhook
 * completará la orden igualmente, así que se devuelve el estado de la base de
 * datos marcado como pendiente de confirmar.
 */
export async function confirmPaymentAfterReturn(orderId: string): Promise<PaymentConfirmation> {
  try {
    return await confirmRentalPayment(orderId);
  } catch (error) {
    // Con la sesión caducada tampoco se podría leer la orden: mejor decirlo.
    if (error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE) throw error;
    const order = await fetchPaymentOrder(orderId);
    return { order, confirmed: order.status === 'completed', pendingConfirmation: true };
  }
}

/**
 * Abre el checkout del proveedor y confirma al volver.
 *
 * openAuthSessionAsync resuelve cuando el usuario vuelve a la app (iOS y
 * Android); openBrowserAsync resolvía en Android al abrir la pestaña, antes de
 * pagar.
 */
export async function openPaymentCheckout(order: PaymentOrder): Promise<PaymentConfirmation> {
  if (!order.checkoutUrl) throw new Error('El proveedor no devolvió una URL de pago.');
  await WebBrowser.openAuthSessionAsync(order.checkoutUrl, Linking.createURL('/payment/success'));
  return confirmPaymentAfterReturn(order.id);
}

/**
 * rental-payment-cancel: solo el inquilino y solo órdenes `pending` o
 * `processing`. El servidor retira antes la solicitud en el proveedor; los 409
 * (comprobante en revisión, ya cobrado) llegan con su mensaje.
 */
export async function cancelRentalPayment(orderId: string): Promise<{ order: PaymentOrder; message: string }> {
  const fallback = 'No se pudo anular el pago.';
  const data = await invokePaymentFunction('rental-payment-cancel', { orderId }, fallback);
  return { order: orderFrom(data, fallback), message: String(data.message ?? 'Pago anulado.') };
}

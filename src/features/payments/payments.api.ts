import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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

export type PaymentOrderStatus = 'pending' | 'awaiting_review' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export type PaymentOrder = {
  id: string;
  contractId: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  totalDue: number;
  currency: string;
  provider: string;
  status: PaymentOrderStatus;
  paymentReference: string;
  checkoutUrl?: string;
  instructions: Record<string, string>;
  expiresAt?: string;
};

export const paymentKeys = {
  all: ['payment-orders'] as const,
  order: (orderId: string) => ['payment-orders', orderId] as const,
};

const ORDER_COLUMNS = 'id,contract_id,tenant_id,owner_id,amount,total_due,currency,payment_method,status,payment_reference,checkout_url,instructions,expires_at';

const knownStatuses: readonly PaymentOrderStatus[] = ['pending', 'awaiting_review', 'processing', 'completed', 'failed', 'cancelled', 'expired'];

export function isOpenPaymentStatus(status: PaymentOrderStatus): boolean {
  return status === 'pending' || status === 'awaiting_review' || status === 'processing';
}

type PaymentOrderRow = Record<string, unknown>;

function textRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

export function mapPaymentOrder(row: PaymentOrderRow): PaymentOrder {
  const amount = Number(row.amount) || 0;
  const status = knownStatuses.includes(row.status as PaymentOrderStatus) ? (row.status as PaymentOrderStatus) : 'pending';
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
    checkoutUrl: typeof row.checkout_url === 'string' && row.checkout_url ? row.checkout_url : undefined,
    instructions: textRecord(row.instructions),
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
  };
}

/** Órdenes donde el perfil es arrendatario o propietario; RLS filtra el resto. */
export async function fetchPaymentOrders(): Promise<PaymentOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('rental_payment_orders').select(ORDER_COLUMNS).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as PaymentOrderRow[]).map(mapPaymentOrder);
}

/**
 * Estado leído de la base de datos. Lo mueven el callback del proveedor y la
 * revisión administrativa; volver del navegador nunca lo da por pagado.
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
      const body: unknown = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
    } catch {
      // Cuerpo no JSON: se usa el mensaje genérico.
    }
  }
  return fallback;
}

export type InitiatePaymentResult = { order: PaymentOrder; requiresRedirect: boolean; message: string };

/**
 * Mismo contrato que initiateRentalPayment de la web: la Edge Function
 * rental-payment-initiate crea la orden con create_rental_payment_order, inicia
 * el cobro con el proveedor y registra la aceptación de cargos y cancelación.
 *
 * La clave de idempotencia se genera una vez por intento: si la red reintenta,
 * el servidor devuelve la misma orden en lugar de cobrar dos veces.
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

  const { data, error } = await supabase.functions.invoke('rental-payment-initiate', {
    body: {
      contractId: input.contractId,
      paymentMethod: input.provider,
      phoneNumber: input.phoneNumber?.trim() || undefined,
      idempotencyKey: input.idempotencyKey ?? Crypto.randomUUID(),
      returnUrl: Linking.createURL('/payment/success'),
      chargesAccepted: true,
      cancellationPolicyAccepted: true,
      userAgent: `CasaSeg Expo (${Platform.OS} ${String(Platform.Version)})`,
    },
  });
  if (error) throw new Error(await functionErrorMessage(error, 'No se pudo iniciar el pago del alquiler.'));
  if (!data?.order) throw new Error(typeof data?.error === 'string' ? data.error : 'El proveedor no devolvió una orden de pago válida.');
  return {
    order: mapPaymentOrder(data.order as PaymentOrderRow),
    requiresRedirect: Boolean(data.requiresRedirect),
    message: String(data.message ?? 'Orden de pago creada.'),
  };
}

/** Abre el checkout del proveedor si lo hay y vuelve a leer el estado al regresar. */
export async function openPaymentCheckout(result: InitiatePaymentResult): Promise<PaymentOrder> {
  if (!result.requiresRedirect) return result.order;
  if (!result.order.checkoutUrl) throw new Error('El proveedor no devolvió una URL de pago.');
  await WebBrowser.openBrowserAsync(result.order.checkoutUrl);
  return fetchPaymentOrder(result.order.id);
}

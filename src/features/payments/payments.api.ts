import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Métodos que reconoce create_rental_payment_order en la base de datos.
export const paymentProviders = ['fondoseg', 'bank_transfer', 'card'] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentProviderLabels: Record<PaymentProvider, string> = {
  fondoseg: 'FondoSeg',
  bank_transfer: 'Transferencia',
  card: 'Tarjeta',
};

export type PaymentOrder = { id: string; contractId: string; amount: number; currency: string; provider: string; status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'; checkoutUrl?: string };

export async function fetchPaymentOrders() { if (!isSupabaseConfigured) return [] as PaymentOrder[]; const { data, error } = await supabase.from('rental_payment_orders').select('id,contract_id,amount,currency,payment_method,status,checkout_url').order('created_at', { ascending: false }); if (error) throw error; return data.map((row) => ({ id: String(row.id), contractId: String(row.contract_id), amount: Number(row.amount), currency: String(row.currency), provider: String(row.payment_method), status: row.status as PaymentOrder['status'], checkoutUrl: row.checkout_url ? String(row.checkout_url) : undefined })); }

/**
 * La clave de idempotencia se genera una vez por intento y viaja como UUID: es
 * lo que impide que un reintento de red acabe cobrando dos veces. El valor
 * anterior (`${contractId}-${Date.now()}`) cambiaba en cada llamada, así que no
 * protegía de nada y además no era un UUID válido para la base de datos.
 */
export async function createPaymentOrder(contractId: string, provider: PaymentProvider, phoneNumber?: string) {
  if (!isSupabaseConfigured) throw new Error('Configura Supabase para crear órdenes reales.');
  if (provider === 'fondoseg' && !phoneNumber?.trim()) throw new Error('FondoSeg necesita un número de teléfono.');

  const { data, error } = await supabase.functions.invoke('create-payment-order', {
    body: {
      contract_id: contractId,
      provider,
      phone_number: phoneNumber?.trim() || undefined,
      idempotency_key: Crypto.randomUUID(),
    },
  });
  if (error) throw error;
  return data as PaymentOrder;
}

export async function openPaymentCheckout(order: PaymentOrder) { if (!order.checkoutUrl) throw new Error('El proveedor no devolvió una URL de pago.'); await WebBrowser.openBrowserAsync(order.checkoutUrl); return confirmPaymentOrder(order.id); }
export async function confirmPaymentOrder(orderId: string) { const { data, error } = await supabase.functions.invoke('get-payment-order-status', { body: { order_id: orderId } }); if (error) throw error; return data as PaymentOrder; }

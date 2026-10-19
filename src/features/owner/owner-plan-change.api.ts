import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { OwnerPlanType } from '@/features/owner/owner-plan.api';
import { isSupabaseConfigured, refreshClerkToken, supabase } from '@/lib/supabase';

export type OwnerPlanChangeProvider = 'stripe' | 'paypal' | 'fondoseg';
export type OwnerPlanChangeRequest = {
  id: string;
  planType: OwnerPlanType;
  paymentMethod: OwnerPlanChangeProvider;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

type Row = Record<string, unknown>;
type CheckoutResult = { checkoutUrl: string; requestId: string; orderId?: string };

export const ownerPlanChangeKeys = {
  pending: (profileId: string) => ['owner-plan-change', 'pending', profileId] as const,
};

const OWNER_PLAN_CHANGE_RETURN_URL = 'https://casaseg.com/owner';
const TERMS_VERSION = 'v1.0';

function mapRequest(row: Row): OwnerPlanChangeRequest {
  return {
    id: String(row.id),
    planType: String(row.plan_type) as OwnerPlanType,
    paymentMethod: String(row.payment_method) as OwnerPlanChangeProvider,
    status: String(row.status),
    paymentStatus: String(row.payment_status ?? 'pending'),
    createdAt: String(row.created_at),
  };
}

export async function fetchPendingOwnerPlanChange(userId: string): Promise<OwnerPlanChangeRequest | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('owner_upgrade_requests')
    .select('id,plan_type,payment_method,status,payment_status,created_at')
    .eq('user_id', userId)
    .eq('payment_metadata->>requestType', 'plan_change')
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRequest(data as Row) : null;
}

async function recordPlanTerms(userId: string): Promise<void> {
  const { error } = await supabase.rpc('record_terms_acceptance', {
    p_user_id: userId,
    p_terms_version: TERMS_VERSION,
    p_terms_accepted: true,
    p_privacy_accepted: true,
    p_subscription_terms_accepted: true,
    p_ip_address: null,
    p_user_agent: `CasasEG Expo (${Platform.OS} ${String(Platform.Version)})`,
  });
  if (error) throw error;
}

export async function createOwnerPlanChangeRequest(input: {
  user: { id: string; name: string; email: string };
  currentPlanType: OwnerPlanType;
  planType: OwnerPlanType;
  isYearly: boolean;
  provider: OwnerPlanChangeProvider;
}): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('El cambio de plan requiere conexión con el servidor.');
  await recordPlanTerms(input.user.id);
  const { data, error } = await supabase
    .from('owner_upgrade_requests')
    .insert({
      user_id: input.user.id,
      user_name: input.user.name,
      user_email: input.user.email,
      plan_type: input.planType,
      is_yearly: input.isYearly,
      payment_method: input.provider,
      payment_status: 'pending',
      status: 'pending',
      full_name: input.user.name,
      payment_metadata: { requestType: 'plan_change', currentPlanType: input.currentPlanType, source: 'casaseg_expo' },
    })
    .select('id')
    .single();
  if (error) throw error;
  return String(data.id);
}

async function invokeOwnerCheckout(name: string, body: Row, fallback: string): Promise<Row> {
  let { data, error } = await supabase.functions.invoke(name, { body });
  if (error instanceof FunctionsHttpError && error.context.status === 401) {
    await refreshClerkToken();
    ({ data, error } = await supabase.functions.invoke(name, { body }));
    if (error instanceof FunctionsHttpError && error.context.status === 401) {
      throw new Error('Tu sesión ha caducado. Inicia sesión de nuevo para continuar con el pago.');
    }
  }
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.clone().json() as { error?: unknown; message?: unknown };
        if (typeof payload.error === 'string') throw new Error(payload.error);
        if (typeof payload.message === 'string') throw new Error(payload.message);
      } catch (cause) {
        if (cause instanceof Error && cause.message !== 'Unexpected end of JSON input') throw cause;
      }
    }
    throw new Error(fallback);
  }
  if (!data || typeof data !== 'object') throw new Error(fallback);
  return data as Row;
}

export async function createOwnerPlanChangeCheckout(provider: OwnerPlanChangeProvider, requestId: string): Promise<CheckoutResult> {
  const name = provider === 'stripe' ? 'owner-upgrade-stripe-checkout' : 'owner-upgrade-paypal-checkout';
  if (provider === 'fondoseg') {
    const data = await invokeOwnerCheckout('owner-upgrade-fondoseg-checkout', { action: 'create', requestId }, 'No se pudo iniciar el pago con FondosEG.');
    if (typeof data.checkoutUrl !== 'string' || typeof data.requestId !== 'string') throw new Error('FondosEG no devolvió un enlace de pago válido.');
    return { checkoutUrl: data.checkoutUrl, requestId: data.requestId };
  }
  const body = provider === 'stripe'
    ? { requestId, returnUrl: OWNER_PLAN_CHANGE_RETURN_URL }
    : { action: 'create', requestId, returnUrl: OWNER_PLAN_CHANGE_RETURN_URL };
  const data = await invokeOwnerCheckout(name, body, 'No se pudo iniciar el pago del cambio de plan.');
  if (typeof data.checkoutUrl !== 'string' || typeof data.requestId !== 'string') {
    throw new Error(typeof data.error === 'string' ? data.error : 'El proveedor no devolvió un enlace de pago válido.');
  }
  return { checkoutUrl: data.checkoutUrl, requestId: data.requestId, orderId: typeof data.orderId === 'string' ? data.orderId : undefined };
}

export async function cancelOwnerPlanChangeCheckout(provider: OwnerPlanChangeProvider, requestId: string): Promise<void> {
  if (provider === 'fondoseg') {
    const data = await invokeOwnerCheckout('owner-upgrade-fondoseg-checkout', { action: 'cancel', requestId }, 'No se pudo cancelar el intento de FondosEG.');
    if (data.cancelled !== true) throw new Error(typeof data.error === 'string' ? data.error : 'FondosEG no confirmó la cancelación.');
    return;
  }
  const name = provider === 'stripe' ? 'owner-upgrade-stripe-checkout' : 'owner-upgrade-paypal-checkout';
  const data = await invokeOwnerCheckout(name, { action: 'cancel', requestId }, 'No se pudo cancelar el intento de pago.');
  if (data.cancelled !== true) throw new Error('El proveedor no confirmó la cancelación del pago.');
}

export async function confirmOwnerPlanChangeFondosEg(requestId: string): Promise<boolean> {
  const data = await invokeOwnerCheckout('owner-upgrade-fondoseg-checkout', { action: 'confirm', requestId }, 'No se pudo confirmar el pago con FondosEG.');
  return data.confirmed === true;
}



/** Captura PayPal solo como mejor esfuerzo; el webhook verificado confirma el pago. */
export async function captureOwnerPlanChangePaypalOrder(requestId: string, orderId: string): Promise<void> {
  await invokeOwnerCheckout('owner-upgrade-paypal-checkout', { action: 'capture', requestId, orderId }, 'No se pudo confirmar la orden de PayPal.');
}





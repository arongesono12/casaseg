import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { OwnerPlanType } from '@/features/owner/owner-plan.api';
import { readLocalFile } from '@/lib/read-local-file';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Solicitud de un cliente para ser propietario, igual que OwnerUpgradeForm
// de la web: plan, método de pago, datos personales, título de propiedad en PDF
// (bucket privado `documents`) y aceptación de términos. La solicitud queda
// pendiente y administración la aprueba con approve_owner_upgrade_request.
//
// En móvil solo se ofrecen los métodos que se validan fuera de la app (Muni
// Dinero y transferencia): el checkout con tarjeta o PayPal queda fuera hasta
// decidir cómo encaja con las normas de compra de App Store y Google Play.

export const OWNER_DOCUMENT_BUCKET = 'documents';
export const MAX_OWNER_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const TERMS_VERSION = 'v1.0';

export const ownerUpgradePaymentMethods = ['muni_dinero', 'bank_transfer'] as const;
export type OwnerUpgradePaymentMethod = (typeof ownerUpgradePaymentMethods)[number];
export type OwnerDocumentType = 'dni' | 'passport';

export type OwnerUpgradeInput = {
  planType: OwnerPlanType;
  isYearly: boolean;
  paymentMethod: OwnerUpgradePaymentMethod;
  phoneNumber: string;
  fullName: string;
  residenceLocation: string;
  nationality: string;
  documentType: OwnerDocumentType;
  documentNumber: string;
};

export type PickedPdf = { uri: string; name: string; mimeType?: string; size?: number };

export type OwnerUpgradeRequest = { id: string; planType: string; paymentMethod: string; status: string; createdAt: string };

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const MIN_TEXT_LENGTH = 3;
const MUNI_PHONE_DIGITS = 9;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Número de documento que acepta el trigger de owner_upgrade_requests (migración 073). */
const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9._/-]{3,80}$/;

/** Mismas reglas que el formulario web y el trigger de la tabla. */
export function validateOwnerUpgradeInput(input: OwnerUpgradeInput): string | null {
  const phoneDigits = digitsOnly(input.phoneNumber);
  if (input.paymentMethod === 'muni_dinero' && phoneDigits.length !== MUNI_PHONE_DIGITS) return 'Introduce un número de Muni Dinero de 9 dígitos.';
  if (phoneDigits.length < 8 || phoneDigits.length > 15) return 'Introduce un número de teléfono válido.';
  if (input.fullName.trim().length < MIN_TEXT_LENGTH) return 'Introduce tu nombre completo.';
  if (input.residenceLocation.trim().length < MIN_TEXT_LENGTH) return 'Introduce tu lugar de residencia.';
  if (input.nationality.trim().length < 2) return 'Introduce tu nacionalidad.';
  if (!DOCUMENT_NUMBER_PATTERN.test(input.documentNumber.trim())) return 'Introduce el número de tu documento (solo letras, números, puntos o guiones).';
  return null;
}

/** El título debe ser un PDF real (firma %PDF-) de 10 MB como máximo. */
export function validateTitlePdf(file: PickedPdf, bytes: ArrayBuffer): string | null {
  if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return 'El título de propiedad debe ser un archivo PDF.';
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_OWNER_DOCUMENT_BYTES) return 'El PDF debe pesar como máximo 10 MB.';
  const head = new Uint8Array(bytes.slice(0, PDF_SIGNATURE.length));
  if (!PDF_SIGNATURE.every((byte, index) => head[index] === byte)) return 'El archivo seleccionado no contiene una firma PDF válida.';
  return null;
}

export async function fetchPendingUpgradeRequest(userId: string): Promise<OwnerUpgradeRequest | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('owner_upgrade_requests')
    .select('id,plan_type,payment_method,status,created_at')
    .eq('user_id', userId)
    // El trigger también bloquea una solicitud aprobada que espera verificación.
    .in('status', ['pending', 'approved_pending_verification'])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: String(data.id), planType: String(data.plan_type), paymentMethod: String(data.payment_method), status: String(data.status), createdAt: String(data.created_at) };
}

export async function cancelOwnerUpgradeRequest(requestId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('La cancelación requiere conexión con el servidor.');
  const { data, error } = await supabase.rpc('cancel_owner_upgrade_request', { p_request_id: requestId });
  if (error) throw error;
  if (data !== true) throw new Error('No se pudo cancelar la solicitud.');
}

export async function completeOwnerUpgradeAfterVerification(requestId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('La activación requiere conexión con el servidor.');
  const { data, error } = await supabase.rpc('complete_owner_upgrade_after_verification', {
    p_request_id: requestId,
    p_user_id: userId,
  });
  if (error) throw error;
  if (data !== true) throw new Error('No se pudo activar la cuenta de propietario.');
}

async function uploadTitlePdf(userId: string, file: PickedPdf): Promise<string> {
  const bytes = await readLocalFile(file.uri);
  const validationError = validateTitlePdf(file, bytes);
  if (validationError) throw new Error(validationError);
  const path = `${userId}/property-titles/${Crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(OWNER_DOCUMENT_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Sube el título, registra los términos y crea la solicitud. Si algo falla
 * antes de crear la solicitud se borra el PDF subido, como hace la web.
 */
export async function submitOwnerUpgradeRequest(params: {
  user: { id: string; name: string; email: string };
  input: OwnerUpgradeInput;
  titlePdf: PickedPdf;
}): Promise<OwnerUpgradeRequest> {
  if (!isSupabaseConfigured) throw new Error('La solicitud requiere conexión con el servidor de CasaSeg.');
  const { user, input } = params;
  const validationError = validateOwnerUpgradeInput(input);
  if (validationError) throw new Error(validationError);
  if (await fetchPendingUpgradeRequest(user.id)) throw new Error('Ya tienes una solicitud pendiente. Por favor espera a que sea revisada.');

  const documentPath = await uploadTitlePdf(user.id, params.titlePdf);
  try {
    const { error: termsError } = await supabase.rpc('record_terms_acceptance', {
      p_user_id: user.id,
      p_terms_version: TERMS_VERSION,
      p_terms_accepted: true,
      p_privacy_accepted: true,
      p_subscription_terms_accepted: true,
      p_ip_address: null,
      p_user_agent: `CasaSeg Expo (${Platform.OS} ${String(Platform.Version)})`,
    });
    if (termsError) throw termsError;

    const { data, error } = await supabase
      .from('owner_upgrade_requests')
      .insert({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        plan_type: input.planType,
        is_yearly: input.isYearly,
        payment_method: input.paymentMethod,
        payment_status: 'pending',
        payment_metadata: { source: 'casaseg_expo' },
        status: 'pending',
        full_name: input.fullName.trim(),
        phone_number: digitsOnly(input.phoneNumber),
        residence_location: input.residenceLocation.trim(),
        nationality: input.nationality.trim(),
        document_number: input.documentNumber.trim(),
        document_type: input.documentType,
        property_title_document_url: documentPath,
      })
      .select('id,plan_type,payment_method,status,created_at')
      .single();
    if (error) throw error;
    return { id: String(data.id), planType: String(data.plan_type), paymentMethod: String(data.payment_method), status: String(data.status), createdAt: String(data.created_at) };
  } catch (error) {
    await supabase.storage.from(OWNER_DOCUMENT_BUCKET).remove([documentPath]);
    throw error;
  }
}

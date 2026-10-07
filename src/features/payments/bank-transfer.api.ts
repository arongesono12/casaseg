import * as Crypto from 'expo-crypto';

import type { PaymentOrder } from '@/features/payments/payments.api';
import { readLocalFile } from '@/lib/read-local-file';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Transferencia bancaria de alquiler, igual que bankTransferService de la web:
// instrucciones bancarias, comprobante en el bucket privado
// bank-transfer-receipts y registro con submit_bank_transfer_proof, que pasa la
// orden a awaiting_review. La aprobación la hace administración
// (Edge Function bank-transfer-review); el móvil nunca marca un pago como hecho.

const RECEIPTS_BUCKET = 'bank-transfer-receipts';
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_SECONDS = 300;

export const receiptMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export type ReceiptMimeType = (typeof receiptMimeTypes)[number];

const extensions: Record<ReceiptMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type BankTransferSettings = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  instructions?: string;
};

export type BankTransferProofStatus = 'submitted' | 'approved' | 'rejected';

export type BankTransferProof = {
  id: string;
  paymentOrderId: string;
  receiptPath: string;
  senderName: string;
  bankReference: string;
  transferredAt: string;
  status: BankTransferProofStatus;
  reviewNotes?: string;
  createdAt: string;
};

export type ReceiptFile = { uri: string; name: string; mimeType: string; size?: number };

type Row = Record<string, unknown>;

function optional(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

export function mapBankTransferProof(row: Row): BankTransferProof {
  const status = row.status === 'approved' || row.status === 'rejected' ? row.status : 'submitted';
  return {
    id: String(row.id),
    paymentOrderId: String(row.payment_order_id),
    receiptPath: String(row.receipt_path),
    senderName: String(row.sender_name ?? ''),
    bankReference: String(row.bank_reference ?? ''),
    transferredAt: String(row.transferred_at ?? ''),
    status,
    reviewNotes: optional(row.review_notes),
    createdAt: String(row.created_at ?? ''),
  };
}

/** Valida el comprobante con las mismas reglas que la web y el bucket. */
export function validateReceipt(file: ReceiptFile): ReceiptMimeType {
  if (!receiptMimeTypes.includes(file.mimeType as ReceiptMimeType)) throw new Error('El comprobante debe ser PDF, JPG, PNG o WebP.');
  if (file.size !== undefined && (file.size <= 0 || file.size > MAX_RECEIPT_BYTES)) throw new Error('El comprobante no puede superar 10 MB.');
  return file.mimeType as ReceiptMimeType;
}

/** Cuenta de destino publicada por administración; null si no hay una activa. */
export async function fetchBankTransferSettings(): Promise<BankTransferSettings | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('bank_transfer_settings')
    .select('bank_name,account_holder,account_number,iban,swift_code,instructions,is_active')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_active !== true) return null;
  return {
    bankName: String(data.bank_name),
    accountHolder: String(data.account_holder),
    accountNumber: String(data.account_number),
    iban: optional(data.iban),
    swiftCode: optional(data.swift_code),
    instructions: optional(data.instructions),
  };
}

/**
 * Sube el comprobante y lo registra. Si el registro falla se borra el archivo
 * subido para no dejar comprobantes huérfanos en el bucket privado.
 */
export async function submitBankTransferProof(input: {
  order: Pick<PaymentOrder, 'id' | 'provider'>;
  tenantId: string;
  file: ReceiptFile;
  senderName: string;
  bankReference: string;
  transferredAt: Date;
}): Promise<BankTransferProof> {
  if (!isSupabaseConfigured) throw new Error('El comprobante requiere conexión con el servidor de CasaSeg.');
  if (input.order.provider !== 'bank_transfer') throw new Error('La orden no corresponde a una transferencia bancaria.');
  const mimeType = validateReceipt(input.file);
  const body = await readLocalFile(input.file.uri);
  if (body.byteLength > MAX_RECEIPT_BYTES) throw new Error('El comprobante no puede superar 10 MB.');

  const receiptPath = `${input.tenantId}/${input.order.id}/${Crypto.randomUUID()}.${extensions[mimeType]}`;
  const { error: uploadError } = await supabase.storage.from(RECEIPTS_BUCKET).upload(receiptPath, body, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc('submit_bank_transfer_proof', {
    p_payment_order_id: input.order.id,
    p_receipt_path: receiptPath,
    p_original_file_name: input.file.name,
    p_mime_type: mimeType,
    p_file_size_bytes: body.byteLength,
    p_sender_name: input.senderName.trim(),
    p_bank_reference: input.bankReference.trim(),
    p_transferred_at: input.transferredAt.toISOString(),
  });
  if (error) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([receiptPath]);
    throw error;
  }
  return mapBankTransferProof(data as Row);
}

export async function fetchMyBankTransferProofs(tenantId: string): Promise<BankTransferProof[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('bank_transfer_proofs')
    .select('id,payment_order_id,receipt_path,sender_name,bank_reference,transferred_at,status,review_notes,created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapBankTransferProof);
}

/** URL temporal para ver un comprobante del bucket privado. */
export async function createReceiptUrl(receiptPath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(receiptPath, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

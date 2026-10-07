import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Cuentas de cobro del propietario y liquidaciones, igual que
// ownerPayoutService de la web. La cuenta queda `pending` hasta que
// administración la verifica; las liquidaciones las crea y reintenta el
// servidor (fondoseg-owner-payout), aquí solo se consultan.

export type PayoutProvider = 'fondoseg' | 'ecobank';
export type OwnerPaymentAccountStatus = 'pending' | 'verified' | 'rejected';

export type OwnerPaymentAccount = {
  id: string;
  provider: PayoutProvider;
  accountName: string;
  walletPhone: string;
  destinationCity: string;
  accountNumber?: string;
  accountCurrency?: string;
  status: OwnerPaymentAccountStatus;
  rejectionReason?: string;
};

export type OwnerPayout = {
  id: string;
  paymentOrderId: string;
  propertyId: string;
  provider: PayoutProvider;
  status: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  payoutReference: string;
  completedAt?: string;
  createdAt: string;
};

export const payoutKeys = {
  accounts: (ownerId: string) => ['owner-payment-accounts', ownerId] as const,
  payouts: (ownerId: string) => ['owner-payouts', ownerId] as const,
};

type Row = Record<string, unknown>;

function optional(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

export function mapOwnerPaymentAccount(row: Row): OwnerPaymentAccount {
  const status = row.status === 'verified' || row.status === 'rejected' ? row.status : 'pending';
  return {
    id: String(row.id),
    provider: row.provider === 'ecobank' ? 'ecobank' : 'fondoseg',
    accountName: String(row.account_name ?? ''),
    walletPhone: String(row.wallet_phone ?? ''),
    destinationCity: String(row.destination_city ?? ''),
    accountNumber: optional(row.account_number),
    accountCurrency: optional(row.account_currency),
    status,
    rejectionReason: optional(row.rejection_reason),
  };
}

function mapPayout(row: Row): OwnerPayout {
  return {
    id: String(row.id),
    paymentOrderId: String(row.payment_order_id),
    propertyId: String(row.property_id),
    provider: row.provider === 'ecobank' ? 'ecobank' : 'fondoseg',
    status: String(row.status),
    grossAmount: Number(row.gross_amount) || 0,
    feeAmount: Number(row.fee_amount) || 0,
    netAmount: Number(row.net_amount) || 0,
    currency: String(row.currency ?? 'XAF'),
    payoutReference: String(row.payout_reference ?? ''),
    completedAt: optional(row.completed_at),
    createdAt: String(row.created_at ?? ''),
  };
}

const ACCOUNT_COLUMNS = 'id,provider,account_name,wallet_phone,destination_city,account_number,account_currency,status,rejection_reason';

export async function fetchOwnerPaymentAccounts(ownerId: string): Promise<OwnerPaymentAccount[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('owner_payment_accounts').select(ACCOUNT_COLUMNS).eq('owner_id', ownerId);
  if (error) throw error;
  return (data as Row[]).map(mapOwnerPaymentAccount);
}

export async function saveFondosEgAccount(input: { accountName: string; walletPhone: string; destinationCity: string }): Promise<OwnerPaymentAccount> {
  const { data, error } = await supabase.rpc('save_owner_fondoseg_account', {
    p_account_name: input.accountName.trim(),
    p_wallet_phone: input.walletPhone.trim(),
    p_destination_city: input.destinationCity.trim(),
  });
  if (error) throw error;
  return mapOwnerPaymentAccount(data as Row);
}

export async function saveEcobankAccount(input: { accountName: string; walletPhone: string; accountNumber: string; destinationCity: string; accountCurrency?: string }): Promise<OwnerPaymentAccount> {
  const { data, error } = await supabase.rpc('save_owner_ecobank_account', {
    p_account_name: input.accountName.trim(),
    p_wallet_phone: input.walletPhone.trim(),
    p_account_number: input.accountNumber.trim(),
    p_destination_city: input.destinationCity.trim(),
    p_account_currency: (input.accountCurrency ?? 'XAF').trim().toUpperCase(),
  });
  if (error) throw error;
  return mapOwnerPaymentAccount(data as Row);
}

export async function fetchOwnerPayouts(ownerId: string): Promise<OwnerPayout[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('rental_owner_payouts')
    .select('id,payment_order_id,property_id,provider,status,gross_amount,fee_amount,net_amount,currency,payout_reference,completed_at,created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Row[]).map(mapPayout);
}

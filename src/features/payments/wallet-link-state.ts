// Estado puro del vínculo de la billetera FondosEG, aparte de la API para poder
// probarlo sin Supabase ni expo-web-browser. Mismo contrato que
// fondosegWalletLinkService de la web.

export type WalletBalance =
  | { linked: false }
  | { linked: true; walletPhoneMasked: string | null; available: number; currency: string; asOf: string };

/** Resultado de autorizar en FondosEG; `dismissed` es cerrar el navegador. */
export type WalletLinkOutcome = 'linked' | 'denied' | 'error' | 'dismissed';

type AuthSessionResult = { type: string; url?: string };

const OUTCOMES = new Set<WalletLinkOutcome>(['linked', 'denied', 'error']);

/** La función redirige a `casaseg://wallet-link?status=…`; nunca trae el código ni el token. */
export function walletLinkOutcome(result: AuthSessionResult): WalletLinkOutcome {
  if (result.type !== 'success') return 'dismissed';
  try {
    const status = new URL(result.url ?? '').searchParams.get('status') as WalletLinkOutcome | null;
    return status && OUTCOMES.has(status) ? status : 'error';
  } catch {
    return 'error';
  }
}

export function mapWalletBalance(data: Record<string, unknown>): WalletBalance {
  if (data.linked !== true) return { linked: false };
  const available = Number(data.available);
  if (!Number.isFinite(available)) throw new Error('FondosEG devolvió un saldo no válido.');
  return {
    linked: true,
    walletPhoneMasked: typeof data.walletPhoneMasked === 'string' ? data.walletPhoneMasked : null,
    available,
    currency: typeof data.currency === 'string' ? data.currency : 'XAF',
    asOf: typeof data.asOf === 'string' ? data.asOf : new Date().toISOString(),
  };
}

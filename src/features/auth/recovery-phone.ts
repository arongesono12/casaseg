import { normalizeProfilePhone } from '@/features/auth/profile-phone';

/** Lo que necesitamos de `PhoneNumberResource` de Clerk. */
export type ClerkPhone = { id: string; phoneNumber: string; verification?: { status?: string | null } | null };

export type RecoveryPhoneStatus = 'none' | 'pending' | 'verified';

function sameNumber(phone: ClerkPhone, profilePhone: string | null) {
  return Boolean(profilePhone) && normalizeProfilePhone(phone.phoneNumber) === normalizeProfilePhone(profilePhone ?? '');
}

export function matchingRecoveryPhone<T extends ClerkPhone>(phones: readonly T[], profilePhone: string | null): T | undefined {
  return phones.find((phone) => sameNumber(phone, profilePhone));
}

/** Solo el número del perfil, verificado en Clerk, puede recibir el SMS de recuperación. */
export function recoveryPhoneStatus(phones: readonly ClerkPhone[], profilePhone: string | null): RecoveryPhoneStatus {
  if (!normalizeProfilePhone(profilePhone ?? '')) return 'none';
  return matchingRecoveryPhone(phones, profilePhone)?.verification?.status === 'verified' ? 'verified' : 'pending';
}

/** Números de Clerk que ya no son los del perfil: deben dejar de poder recuperar la cuenta. */
export function staleRecoveryPhones<T extends ClerkPhone>(phones: readonly T[], profilePhone: string | null): T[] {
  return phones.filter((phone) => !sameNumber(phone, profilePhone));
}

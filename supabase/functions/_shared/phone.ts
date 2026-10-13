// Teléfonos de Clerk → public.users. Sin dependencias para poder probarlo fuera de Deno.

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

type ClerkPhoneNumber = { id: string; phone_number: string; verification?: { status?: string } | null };

export type ClerkPhoneData = {
  primary_phone_number_id: string | null;
  phone_numbers: ClerkPhoneNumber[];
};

/** E.164 o null. Nunca añade un prefijo que la persona no escribió. */
export function toE164(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim().startsWith('+')) return null;
  const phone = `+${value.replace(/\D/g, '')}`;
  return E164_PHONE.test(phone) ? phone : null;
}

/**
 * Cambios para public.users cuando Clerk verifica un teléfono, o null si no hay
 * nada que hacer. Solo confirma el número que ya está en el perfil, o rellena
 * un perfil sin teléfono; jamás sustituye un número que la persona eligió.
 */
export function phoneVerificationPatch(
  profile: { phone: string | null; phone_verified: boolean | null },
  clerk: ClerkPhoneData,
): { phone: string; phone_verified: true } | null {
  const verified = clerk.phone_numbers.filter((phone) => phone.verification?.status === 'verified');
  const verifiedNumbers = new Set(verified.map((phone) => toE164(phone.phone_number)).filter(Boolean));
  const profilePhone = toE164(profile.phone);

  if (profilePhone && verifiedNumbers.has(profilePhone)) {
    return profile.phone_verified && profile.phone === profilePhone ? null : { phone: profilePhone, phone_verified: true };
  }

  if (!profile.phone?.trim()) {
    const primary = verified.find((phone) => phone.id === clerk.primary_phone_number_id) ?? verified[0];
    const phone = toE164(primary?.phone_number);
    return phone ? { phone, phone_verified: true } : null;
  }

  return null;
}

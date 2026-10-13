export type PasswordResetChannel = 'email' | 'phone';

/** Una vía para recibir el código; `destination` llega enmascarado por Clerk ("+240******456"). */
export type PasswordResetOption = { channel: PasswordResetChannel; destination: string };

type ClerkFactor = { strategy?: string; safeIdentifier?: string };

const channelByStrategy: Readonly<Record<string, PasswordResetChannel>> = {
  reset_password_email_code: 'email',
  reset_password_phone_code: 'phone',
};

/**
 * Clerk solo publica `reset_password_phone_code` si la cuenta tiene un teléfono
 * verificado y el SMS está activado en la instancia: es la fuente de verdad.
 */
export function passwordResetOptions(factors: readonly ClerkFactor[] | undefined): PasswordResetOption[] {
  const options = (factors ?? []).flatMap((factor) => {
    const channel = channelByStrategy[factor.strategy ?? ''];
    return channel ? [{ channel, destination: factor.safeIdentifier ?? '' }] : [];
  });
  return (['email', 'phone'] as const).flatMap((channel) => options.find((option) => option.channel === channel) ?? []);
}

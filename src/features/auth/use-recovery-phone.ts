import { useUser } from '@clerk/expo';
import type { PhoneNumberResource } from '@clerk/expo/types';
import { useCallback, useState } from 'react';

import { codigoDeClerk, comoError } from '@/features/auth/clerk-errors';
import { normalizeProfilePhone } from '@/features/auth/profile-phone';
import { matchingRecoveryPhone, recoveryPhoneStatus, staleRecoveryPhones, type RecoveryPhoneStatus } from '@/features/auth/recovery-phone';
import { defineCopy, useCopy } from '@/providers/i18n-context';

const copy = defineCopy({
  es: { inUse: 'Ese número ya está vinculado a otra cuenta.', sendFailed: 'No pudimos enviar el SMS. La recuperación por SMS puede no estar disponible todavía.', verifyFailed: 'No pudimos verificar el código.', removeFailed: 'No pudimos retirar tu número anterior de la recuperación de contraseña.' },
  fr: { inUse: 'Ce numéro est déjà lié à un autre compte.', sendFailed: 'Impossible d’envoyer le SMS. La récupération par SMS n’est peut-être pas encore disponible.', verifyFailed: 'Impossible de vérifier le code.', removeFailed: 'Impossible de retirer votre ancien numéro de la récupération du mot de passe.' },
  en: { inUse: 'That number is already linked to another account.', sendFailed: 'We could not send the text message. Recovery by text may not be available yet.', verifyFailed: 'We could not verify the code.', removeFailed: 'We could not remove your previous number from password recovery.' },
});

export type RecoveryPhone = {
  status: RecoveryPhoneStatus;
  /** Envía por SMS el código que verifica el número del perfil en Clerk. */
  sendCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  /** Retira de Clerk los números que ya no son el del perfil. */
  removeStalePhones: (nextPhone: string | null) => Promise<void>;
};

/**
 * El SMS de recuperación lo envía Clerk, y solo a números verificados en Clerk:
 * el número de public.users no basta. Este hook mantiene ambos alineados.
 */
export function useRecoveryPhone(profilePhone: string | null): RecoveryPhone | null {
  const { user } = useUser();
  const labels = useCopy(copy);
  const [pending, setPending] = useState<PhoneNumberResource>();

  const sendCode = useCallback(async () => {
    const phoneNumber = normalizeProfilePhone(profilePhone ?? '');
    if (!user || !phoneNumber) return;
    try {
      const phone = matchingRecoveryPhone(user.phoneNumbers, phoneNumber) ?? await user.createPhoneNumber({ phoneNumber });
      await phone.prepareVerification();
      setPending(phone);
    } catch (error) {
      throw codigoDeClerk(error) === 'form_identifier_exists' ? new Error(labels.inUse) : comoError(error, labels.sendFailed);
    }
  }, [labels, profilePhone, user]);

  const verifyCode = useCallback(async (code: string) => {
    const phone = pending ?? (user ? matchingRecoveryPhone(user.phoneNumbers, profilePhone) : undefined);
    if (!user || !phone) return;
    try {
      await phone.attemptVerification({ code: code.trim() });
      await user.reload();
      setPending(undefined);
    } catch (error) {
      throw comoError(error, labels.verifyFailed);
    }
  }, [labels, pending, profilePhone, user]);

  const removeStalePhones = useCallback(async (nextPhone: string | null) => {
    if (!user) return;
    const stale = staleRecoveryPhones(user.phoneNumbers, nextPhone);
    if (!stale.length) return;
    try {
      await Promise.all(stale.map((phone) => phone.destroy()));
      await user.reload();
      setPending(undefined);
    } catch (error) {
      throw comoError(error, labels.removeFailed);
    }
  }, [labels, user]);

  // Sesiones demo: no hay cuenta de Clerk que verificar.
  if (!user) return null;
  return { status: recoveryPhoneStatus(user.phoneNumbers, profilePhone), sendCode, verifyCode, removeStalePhones };
}

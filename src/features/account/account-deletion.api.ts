import { FunctionsHttpError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Eliminación diferida de cuenta, la misma que la web (accountDeletionService):
// la Edge Function account-deletion marca el perfil como pending_deletion,
// suspende sus publicaciones y programa el borrado definitivo. Durante el plazo
// de recuperación administración puede revertirlo.

/** Palabra que la Edge Function exige para confirmar, igual que en la web. */
export const ACCOUNT_DELETION_CONFIRMATION = 'ELIMINAR';

export type AccountDeletionResult = { scheduledFor: string };

export function isDeletionConfirmed(value: string): boolean {
  return value.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRMATION;
}

async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
    } catch {
      // Cuerpo no JSON: se usa el mensaje genérico.
    }
  }
  return 'No se pudo programar la eliminación de la cuenta.';
}

export async function requestAccountDeletion(confirmation: string): Promise<AccountDeletionResult> {
  if (!isSupabaseConfigured) throw new Error('La eliminación requiere conexión con el servidor de CasaSeg.');
  if (!isDeletionConfirmed(confirmation)) throw new Error(`Escribe ${ACCOUNT_DELETION_CONFIRMATION} para confirmar.`);
  const { data, error } = await supabase.functions.invoke('account-deletion', {
    body: { action: 'request', confirmation: ACCOUNT_DELETION_CONFIRMATION },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.success || typeof data.scheduledFor !== 'string') throw new Error('No se pudo programar la eliminación de la cuenta.');
  return { scheduledFor: data.scheduledFor };
}

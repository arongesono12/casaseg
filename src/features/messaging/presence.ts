import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

// Presencia compartida con la web (migración 062): set_current_user_presence
// actualiza user_presence, que el servidor consulta para decidir si avisa por
// correo a un propietario ausente. La web late cada 45 s; aquí se late igual
// mientras la app está en primer plano y se marca ausente al ir a segundo plano.

export const PRESENCE_HEARTBEAT_MS = 45_000;

export async function setPresence(isOnline: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_current_user_presence', { p_is_online: isOnline });
  if (error) throw error;
}

/**
 * La presencia es una señal auxiliar: un latido perdido se corrige con el
 * siguiente, así que los fallos de red no se propagan a la interfaz.
 */
function beat(isOnline: boolean) {
  setPresence(isOnline).catch(() => undefined);
}

export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      beat(true);
      timer ??= setInterval(() => beat(true), PRESENCE_HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      beat(false);
    };
    const onChange = (state: AppStateStatus) => (state === 'active' ? start() : stop());

    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', onChange);
    return () => {
      subscription.remove();
      stop();
    };
  }, [enabled]);
}

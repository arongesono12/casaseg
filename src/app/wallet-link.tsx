import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Vuelta de FondosEG tras vincular la billetera (`casaseg://wallet-link?status=…`).
 *
 * La función fondoseg-wallet-link ya completó el vínculo en el servidor y
 * openAuthSessionAsync entrega el resultado a la tarjeta de pagos. En Android
 * el deep link también llega al router: se vuelve a la pantalla anterior en
 * lugar de mostrar "no encontrado".
 */
export default function WalletLinkReturn() {
  const [canGoBack] = useState(() => router.canGoBack());

  useEffect(() => {
    if (canGoBack) router.back();
  }, [canGoBack]);

  return canGoBack ? null : <Redirect href="/(tabs)/profile" />;
}

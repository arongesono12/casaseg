import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// expo-print y expo-document-picker llevan código nativo. Un build compilado
// antes de añadirlos no lo incluye y un import estático tumba la pantalla entera
// ("Cannot find native module"). Se cargan al usarlos para que solo falle esa
// acción, con un mensaje que pide actualizar la app.

export class NativeModuleUnavailableError extends Error {
  constructor() {
    super('Esta función necesita la versión más reciente de la app. Actualízala e inténtalo de nuevo.');
    this.name = 'NativeModuleUnavailableError';
  }
}

/** En web estos paquetes usan APIs del navegador y no registran módulo nativo. */
const isNativeModuleAvailable = (name: string): boolean =>
  Platform.OS === 'web' || requireOptionalNativeModule(name) != null;

export async function loadPrint(): Promise<typeof import('expo-print')> {
  if (!isNativeModuleAvailable('ExpoPrint')) throw new NativeModuleUnavailableError();
  return import('expo-print');
}

export async function loadDocumentPicker(): Promise<typeof import('expo-document-picker')> {
  if (!isNativeModuleAvailable('ExpoDocumentPicker')) throw new NativeModuleUnavailableError();
  return import('expo-document-picker');
}

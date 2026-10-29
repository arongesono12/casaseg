import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Detect Expo Go to avoid loading custom native modules such as Clerk push/sign-in integrations.
 * `isRunningInExpoGo` checks for Expo Go's own native module (the same check expo-notifications
 * uses); `executionEnvironment` alone stopped identifying Expo Go reliably on SDK 58.
 */
export const isExpoGo = isRunningInExpoGo() || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

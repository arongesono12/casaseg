import Constants, { ExecutionEnvironment } from 'expo-constants';

/** SDK 54 does not embed the platform-specific Expo UI renderers in Expo Go. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

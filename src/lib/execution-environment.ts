import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Detect Expo Go to avoid loading custom native modules such as Clerk push/sign-in integrations. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

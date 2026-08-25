import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { appStorage } from '@/lib/local-storage';

type SessionStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

// expo-secure-store documents a 2048-byte ceiling per value, and a Supabase
// session (access token + refresh token + user metadata) goes well past it.
// Percent-encoding first guarantees pure ASCII, so a chunk of N characters is
// always N bytes and never splits a multi-byte codepoint.
const CHUNK_SIZE = 1024;
const INDEX_SUFFIX = '.chunks';

// AFTER_FIRST_UNLOCK lets autoRefreshToken renew the session while the app is
// backgrounded; the default (WHEN_UNLOCKED) would fail on a locked device.
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readChunkCount(key: string) {
  const index = await SecureStore.getItemAsync(key + INDEX_SUFFIX, storeOptions);
  if (index === null) return null;
  const count = Number(index);
  return Number.isInteger(count) && count > 0 ? count : null;
}

async function deleteChunks(key: string, from: number, to: number) {
  const deletions = [];
  for (let index = from; index < to; index += 1) {
    deletions.push(SecureStore.deleteItemAsync(chunkKey(key, index), storeOptions));
  }
  await Promise.all(deletions);
}

async function writeItem(key: string, value: string) {
  const encoded = encodeURIComponent(value);
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += CHUNK_SIZE) {
    chunks.push(encoded.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push('');

  const previousCount = await readChunkCount(key);
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk, storeOptions)));
  // The index is written last so an interrupted write never leaves a count
  // pointing at chunks that do not exist yet.
  await SecureStore.setItemAsync(key + INDEX_SUFFIX, String(chunks.length), storeOptions);
  if (previousCount && previousCount > chunks.length) {
    await deleteChunks(key, chunks.length, previousCount);
  }
}

async function eraseItem(key: string) {
  const count = await readChunkCount(key);
  await SecureStore.deleteItemAsync(key + INDEX_SUFFIX, storeOptions);
  if (count) await deleteChunks(key, 0, count);
}

// Sessions written by earlier builds live in the unencrypted SQLite localStorage
// shim. Move them across on first read so upgrading users are not signed out.
async function migrateLegacyValue(key: string) {
  const legacy = appStorage.getItem(key);
  if (legacy === null) return null;
  await writeItem(key, legacy);
  appStorage.removeItem(key);
  return legacy;
}

const secureStorage: SessionStorage = {
  async getItem(key) {
    const count = await readChunkCount(key);
    if (count === null) return migrateLegacyValue(key);

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index), storeOptions)),
    );
    // A partially wiped keychain entry is unrecoverable; drop it so the app
    // falls back to a clean signed-out state instead of a corrupt session.
    if (chunks.some((chunk) => chunk === null)) {
      await eraseItem(key);
      return null;
    }

    return decodeURIComponent(chunks.join(''));
  },
  async setItem(key, value) {
    await writeItem(key, value);
    appStorage.removeItem(key);
  },
  async removeItem(key) {
    await eraseItem(key);
    appStorage.removeItem(key);
  },
};

/**
 * Supabase auth storage. Native keeps tokens in the Keychain / EncryptedSharedPreferences;
 * web keeps browser storage, where SecureStore has no equivalent.
 */
export const sessionStorage: SessionStorage = Platform.OS === 'web' ? appStorage : secureStorage;

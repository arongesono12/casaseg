type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const memory = new Map<string, string>();
const memoryStorage: StorageLike = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); }, removeItem: (key) => { memory.delete(key); } };
export const appStorage: StorageLike = typeof globalThis.localStorage === 'undefined' ? memoryStorage : globalThis.localStorage;

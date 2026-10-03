declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export const mock: { module(specifier: string, factory: () => Record<string, unknown>): void };
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toBeString(): void;
    toBeUndefined(): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toThrow(expected?: string | RegExp): void;
    not: { toContain(expected: unknown): void; toThrow(expected?: string | RegExp): void };
  };
}

// Lo mínimo de Node que usan los tests (el proyecto no instala @types/node).
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}

declare module 'node:path' {
  export function join(...segments: string[]): string;
}

interface ImportMeta {
  /** Carpeta del archivo actual (Bun). */
  readonly dir: string;
}

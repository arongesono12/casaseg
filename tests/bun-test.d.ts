declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toContain(expected: unknown): void;
    toBeString(): void;
    toBeUndefined(): void;
    toThrow(expected?: string | RegExp): void;
    not: { toContain(expected: unknown): void; toThrow(expected?: string | RegExp): void };
  };
}

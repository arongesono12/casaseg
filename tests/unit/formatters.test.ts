import { describe, expect, test } from 'bun:test';
import { formatDate, formatXaf } from '../../src/utils/formatters';

describe('formatters', () => {
  test('adds the monthly suffix', () => expect(formatXaf(1200000, 'per_month')).toContain('/ mes'));
  test('does not add rental suffix to sale price', () => expect(formatXaf(20000000, 'sale')).not.toContain('/ mes'));
  test('formats ISO dates without throwing', () => expect(formatDate('2026-07-05T12:00:00Z')).toBeString());
});

import { describe, expect, test } from 'bun:test';
import { formatDate, formatTime, formatXaf } from '../../src/utils/formatters';

describe('formatters', () => {
  test('adds the monthly suffix', () => expect(formatXaf(1200000, 'per_month')).toContain('/ mes'));
  test('does not add rental suffix to sale price', () => expect(formatXaf(20000000, 'sale')).not.toContain('/ mes'));
  test('translates the rental suffix to the active language', () => {
    expect(formatXaf(1200000, 'per_month', 'fr')).toContain('/ mois');
    expect(formatXaf(50000, 'per_night', 'en')).toContain('/ night');
  });
  test('formats ISO dates without throwing', () => expect(formatDate('2026-07-05T12:00:00Z')).toBeString());
  test('formats message times as hours and minutes', () => expect(formatTime(new Date(2026, 6, 5, 9, 7), 'es')).toBe('9:07'));
  test('returns an empty time for invalid dates instead of throwing', () => expect(formatTime('not-a-date')).toBe(''));
});

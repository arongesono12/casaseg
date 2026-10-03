import { describe, expect, test } from 'bun:test';
import { roleLabel, statusLabel } from '../../src/features/admin/admin-copy';

describe('admin labels', () => {
  test('translates database roles', () => expect(roleLabel('owner', 'fr')).toBe('Propriétaire'));
  test('translates statuses regardless of case', () => expect(statusLabel('ACTIVE', 'en')).toBe('Active'));
  test('shows unknown statuses unchanged instead of hiding them', () => expect(statusLabel('on_hold', 'es')).toBe('on_hold'));
});

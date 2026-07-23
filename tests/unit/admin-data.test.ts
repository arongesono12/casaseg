import { describe, expect, test } from 'bun:test';
import { derivePropertyReviewStatus } from '../../src/features/admin/admin-data';

describe('admin property review status', () => {
  test('treats active properties without a required license as verified', () => {
    expect(derivePropertyReviewStatus('active', 'not_required')).toBe('verified');
  });

  test('keeps pending publication and license states visible for review', () => {
    expect(derivePropertyReviewStatus('draft', 'not_required')).toBe('pending');
    expect(derivePropertyReviewStatus('active', 'submitted')).toBe('pending');
  });

  test('prioritizes restricted states over pending states', () => {
    expect(derivePropertyReviewStatus('pending', 'revoked')).toBe('restricted');
    expect(derivePropertyReviewStatus('suspended', 'verified')).toBe('restricted');
  });
});

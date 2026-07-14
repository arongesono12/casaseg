import { describe, expect, test } from 'bun:test';
import { isOwnerRole, isWebAdminRole } from '../../src/lib/access-control';

describe('role permissions', () => {
  test('owner areas reject clients', () => expect(isOwnerRole('client')).toBe(false));
  test('owner areas accept owner and admins', () => { expect(isOwnerRole('owner')).toBe(true); expect(isOwnerRole('admin')).toBe(true); expect(isOwnerRole('superadmin')).toBe(true); });
  test('admin panel preference only applies to admin roles', () => { expect(isWebAdminRole('owner')).toBe(false); expect(isWebAdminRole('admin')).toBe(true); });
});

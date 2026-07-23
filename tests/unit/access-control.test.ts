import { describe, expect, test } from 'bun:test';
import { canAccessAdminPanel, canAccessOwnerPanel, isAdminRole, isClientRole, isOwnerRole, parseUserRole } from '../../src/lib/access-control';

describe('role permissions', () => {
  test('client responsibility is exclusive to client accounts', () => {
    expect(isClientRole('client')).toBe(true);
    expect(isClientRole('owner')).toBe(false);
    expect(isClientRole('admin')).toBe(false);
  });

  test('owner panel only accepts property owners', () => {
    expect(isOwnerRole('owner')).toBe(true);
    expect(canAccessOwnerPanel('owner')).toBe(true);
    expect(canAccessOwnerPanel('client')).toBe(false);
    expect(canAccessOwnerPanel('admin')).toBe(false);
    expect(canAccessOwnerPanel('superadmin')).toBe(false);
  });

  test('admin panel only accepts administrative roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(canAccessAdminPanel('owner')).toBe(false);
    expect(canAccessAdminPanel('client')).toBe(false);
  });

  test('only accepts roles from trusted application sources', () => {
    expect(parseUserRole('superadmin')).toBe('superadmin');
    expect(parseUserRole('client')).toBe('client');
    expect(parseUserRole('SUPERADMIN')).toBe(undefined);
    expect(parseUserRole('unknown')).toBe(undefined);
    expect(parseUserRole(null)).toBe(undefined);
  });
});

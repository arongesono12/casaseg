import { describe, expect, test } from 'bun:test';

import { callingCountryForRegion, splitPhoneNumber } from '../../src/features/auth/country-calling-codes';
import { passwordResetOptions } from '../../src/features/auth/password-reset';
import { recoveryPhoneStatus, staleRecoveryPhones } from '../../src/features/auth/recovery-phone';
import { phoneVerificationPatch, toE164 } from '../../supabase/functions/_shared/phone';

const guinea = callingCountryForRegion('GQ');
const spain = callingCountryForRegion('ES');

describe('número guardado → desplegable de prefijos', () => {
  test('separa el prefijo del número nacional', () => {
    const { country, nationalNumber } = splitPhoneNumber('+240222123456', spain);
    expect(country[0]).toBe('GQ');
    expect(nationalNumber).toBe('222123456');
  });

  test('con prefijos compartidos respeta el país detectado y si no usa el principal', () => {
    expect(splitPhoneNumber('+12025550123', callingCountryForRegion('CA')).country[0]).toBe('CA');
    expect(splitPhoneNumber('+12025550123', guinea).country[0]).toBe('US');
    expect(splitPhoneNumber('+447700900123', guinea).country[0]).toBe('GB');
  });

  test('un número antiguo sin prefijo queda con el país por defecto', () => {
    const { country, nationalNumber } = splitPhoneNumber('222 123 456', guinea);
    expect(country[0]).toBe('GQ');
    expect(nationalNumber).toBe('222 123 456');
    expect(splitPhoneNumber('', guinea).nationalNumber).toBe('');
  });
});

describe('opciones para recibir el código de recuperación', () => {
  test('ofrece correo y SMS cuando la cuenta tiene un teléfono verificado', () => {
    expect(passwordResetOptions([
      { strategy: 'password' },
      { strategy: 'reset_password_phone_code', safeIdentifier: '+240******456' },
      { strategy: 'reset_password_email_code', safeIdentifier: 'a***@gmail.com' },
    ])).toEqual([
      { channel: 'email', destination: 'a***@gmail.com' },
      { channel: 'phone', destination: '+240******456' },
    ]);
  });

  test('solo ofrece el correo si Clerk no admite SMS para esa cuenta', () => {
    expect(passwordResetOptions([{ strategy: 'reset_password_email_code', safeIdentifier: 'a***@gmail.com' }]))
      .toEqual([{ channel: 'email', destination: 'a***@gmail.com' }]);
    expect(passwordResetOptions(undefined)).toEqual([]);
  });
});

describe('teléfono de recuperación en Clerk', () => {
  const verified = { id: 'p1', phoneNumber: '+240222123456', verification: { status: 'verified' } };
  const pending = { id: 'p2', phoneNumber: '+34612345678', verification: { status: 'unverified' } };

  test('solo cuenta como recuperación el número del perfil verificado en Clerk', () => {
    expect(recoveryPhoneStatus([verified], '+240 222 123 456')).toBe('verified');
    expect(recoveryPhoneStatus([pending], '+34612345678')).toBe('pending');
    expect(recoveryPhoneStatus([verified], '+34612345678')).toBe('pending');
    expect(recoveryPhoneStatus([verified], null)).toBe('none');
  });

  test('al cambiar el número del perfil, los anteriores dejan de poder recuperar la cuenta', () => {
    expect(staleRecoveryPhones([verified, pending], '+34612345678').map((phone) => phone.id)).toEqual(['p1']);
    expect(staleRecoveryPhones([verified, pending], null).map((phone) => phone.id)).toEqual(['p1', 'p2']);
  });
});

describe('webhook de Clerk → public.users', () => {
  const clerk = (status: string, phone = '+240222123456') => ({
    primary_phone_number_id: 'p1',
    phone_numbers: [{ id: 'p1', phone_number: phone, verification: { status } }],
  });

  test('normaliza a E.164 sin inventar prefijos', () => {
    expect(toE164('+240 222 123 456')).toBe('+240222123456');
    expect(toE164('222123456')).toBe(null);
    expect(toE164(42)).toBe(null);
  });

  test('marca verificado el número del perfil cuando Clerk lo verificó', () => {
    expect(phoneVerificationPatch({ phone: '+240 222 123 456', phone_verified: false }, clerk('verified')))
      .toEqual({ phone: '+240222123456', phone_verified: true });
    expect(phoneVerificationPatch({ phone: '+240222123456', phone_verified: true }, clerk('verified'))).toBe(null);
  });

  test('completa un perfil sin teléfono con el número verificado en Clerk', () => {
    expect(phoneVerificationPatch({ phone: null, phone_verified: false }, clerk('verified')))
      .toEqual({ phone: '+240222123456', phone_verified: true });
  });

  test('no toca el perfil si Clerk no verificó ese número', () => {
    expect(phoneVerificationPatch({ phone: '+240222123456', phone_verified: false }, clerk('unverified'))).toBe(null);
    expect(phoneVerificationPatch({ phone: '+34612345678', phone_verified: false }, clerk('verified'))).toBe(null);
    expect(phoneVerificationPatch({ phone: null, phone_verified: false }, { primary_phone_number_id: null, phone_numbers: [] })).toBe(null);
  });
});

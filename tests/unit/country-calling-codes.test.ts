import { describe, expect, test } from 'bun:test';

import { callingCountryForRegion, countryCallingCodes, phoneWithCallingCode } from '../../src/features/auth/country-calling-codes';

describe('registration country calling codes', () => {
  test('includes country and territory calling codes with Equatorial Guinea as fallback', () => {
    expect(countryCallingCodes.length).toBeGreaterThanOrEqual(200);
    expect(callingCountryForRegion('GQ')[1]).toBe('+240');
    expect(callingCountryForRegion('us')[1]).toBe('+1');
    expect(callingCountryForRegion(null)[1]).toBe('+240');
    expect(callingCountryForRegion('ZZ')[1]).toBe('+240');
  });

  test('combines the selected code with the national number', () => {
    expect(phoneWithCallingCode(callingCountryForRegion('GQ'), ' 222 123 456 ')).toBe('+240 222 123 456');
    expect(phoneWithCallingCode(callingCountryForRegion('FR'), '')).toBe('');
  });
});

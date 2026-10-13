import { describe, expect, test } from 'bun:test';

import { callingCountryForRegion, callingCountryForTimeZone, countryCallingCodes, phoneWithCallingCode } from '../../src/features/auth/country-calling-codes';
import { regionForTimeZone } from '../../src/features/auth/timezone-regions';

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

describe('calling code from the device time zone', () => {
  test('detects the country of the registering person from their time zone', () => {
    expect(callingCountryForTimeZone('Africa/Malabo')[0]).toBe('GQ');
    expect(callingCountryForTimeZone('Europe/Madrid')[0]).toBe('ES');
    expect(callingCountryForTimeZone('Atlantic/Canary')[0]).toBe('ES');
    expect(callingCountryForTimeZone('Africa/Douala')[0]).toBe('CM');
    expect(callingCountryForTimeZone('Africa/Libreville')[0]).toBe('GA');
    expect(callingCountryForTimeZone('America/New_York')[1]).toBe('+1');
  });

  test('understands legacy time zone names still reported by some devices', () => {
    expect(regionForTimeZone('Asia/Calcutta')).toBe('IN');
    expect(regionForTimeZone('Europe/Kiev')).toBe('UA');
    expect(regionForTimeZone('US/Eastern')).toBe('US');
    expect(regionForTimeZone('Iceland')).toBe('IS');
  });

  test('falls back to Equatorial Guinea when the time zone does not identify a country', () => {
    expect(callingCountryForTimeZone(null)[0]).toBe('GQ');
    expect(callingCountryForTimeZone(undefined)[0]).toBe('GQ');
    expect(callingCountryForTimeZone('UTC')[0]).toBe('GQ');
    expect(callingCountryForTimeZone('Etc/GMT+1')[0]).toBe('GQ');
    expect(callingCountryForTimeZone('CET')[0]).toBe('GQ');
    expect(callingCountryForTimeZone('Antarctica/Troll')[0]).toBe('GQ');
  });

  test('every mapped region has a calling code', () => {
    for (const zone of ['Africa/Malabo', 'Europe/Paris', 'Asia/Tokyo', 'America/Sao_Paulo', 'Australia/Sydney']) {
      const region = regionForTimeZone(zone);
      expect(typeof region).toBe('string');
      expect(callingCountryForRegion(region)[0]).toBe(region ?? '');
    }
  });
});

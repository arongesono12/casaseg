import { describe, expect, test } from 'bun:test';
import { defaultPropertyFilters, propertyFiltersSchema } from '../../src/features/properties/schemas/property-filters.schema';

describe('property filters', () => {
  test('accepts the default serializable filters', () => expect(propertyFiltersSchema.safeParse(defaultPropertyFilters).success).toBe(true));
  test('rejects negative maximum prices', () => expect(propertyFiltersSchema.safeParse({ ...defaultPropertyFilters, maxPrice: '-10' }).success).toBe(false));
  test('rejects unsupported categories', () => expect(propertyFiltersSchema.safeParse({ ...defaultPropertyFilters, category: 'Hotel' }).success).toBe(false));
});

import { describe, expect, test } from 'bun:test';

import { buildLeaseContractHtml, DEFAULT_LEASE_TERMS, type LeaseContract } from '../../src/features/contracts/lease-contract.model';
import { paymentBreakdown, propertyInitialTotal, propertyNextPaymentTotal } from '../../src/features/properties/pricing';

// Misma regla que la web (src/utils/rentalCharges.ts) y el servidor
// (create_rental_payment_order): servicio e impuestos con cada pago; fianza y
// limpieza solo con el primero.

const property = { price: 150000, serviceFeeAmount: 5000, cleaningFeeAmount: 2500, taxAmount: 1000, securityDepositAmount: 30000 };

describe('cargos del alquiler', () => {
  test('el primer pago suma la renta y todos los cargos', () => {
    expect(propertyInitialTotal(property)).toBe(188500);
  });

  test('los pagos siguientes no repiten la fianza ni la limpieza', () => {
    expect(propertyNextPaymentTotal(property)).toBe(156000);
    const next = paymentBreakdown(150000, property, { firstPayment: false });
    expect([next.cleaningFeeAmount, next.securityDepositAmount]).toEqual([0, 0]);
  });
});

const contract: LeaseContract = {
  id: 'c1',
  contractNumber: 'CEG-1',
  agreementId: 'a1',
  propertyId: 'p1',
  propertyTitle: 'Vivienda',
  templateVersion: 1,
  ownerId: 'o1',
  clientId: 'u1',
  status: 'signed',
  contentHash: 'hash',
  createdAt: '2026-10-26T10:00:00Z',
  snapshot: {
    title: 'Contrato',
    property: { id: 'p1', title: 'Vivienda', location: 'Malabo', price: 140000, currency: 'FCFA' },
    owner: { id: 'o1', name: 'Propietario', email: 'o@example.com' },
    client: { id: 'u1', name: 'Inquilino', email: 'u@example.com' },
    agreement: { id: 'a1', agreedPrice: 140000, currency: 'FCFA' },
    terms: { ...DEFAULT_LEASE_TERMS, depositAmount: 30000 },
    charges: { serviceFeeAmount: 5000, cleaningFeeAmount: 2500, taxAmount: 1000, securityDepositAmount: 30000 },
    generatedAt: '2026-10-26T10:00:00Z',
  },
};

describe('documento del contrato', () => {
  test('incluye los cargos firmados y los dos totales', () => {
    const html = buildLeaseContractHtml(contract);
    expect(html).toContain('Servicio');
    expect(html).toContain('Limpieza');
    expect(html).toContain('Impuestos');
    expect(html).toContain('Total del primer pago');
    expect(html).toContain('178.500 FCFA');
    expect(html).toContain('146.000 FCFA');
  });
});

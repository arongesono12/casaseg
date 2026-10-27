import { describe, expect, test } from 'bun:test';

import { buildLeaseContractHtml, cancellationReasonError, canRequestCancellation, DEFAULT_LEASE_TERMS, mapCancellationRequest, type LeaseContract } from '../../src/features/contracts/lease-contract.model';
import { identityDocumentExpiryError, parseDisplayDate } from '../../src/features/owner/identity-documents';
import { latestVerificationByProperty, OWNERSHIP_ROUTE_DOCUMENTS, ownershipDocumentDateError, ownershipReviewDecisionError, ownershipStatusSummary } from '../../src/features/owner/property-ownership';
import { canTenantHidePayment, isHiddenByTenant, mapPaymentOrder, ORDER_COLUMNS } from '../../src/features/payments/payment-order-state';
import { paymentBreakdown } from '../../src/features/properties/pricing';
import { mapProperty } from '../../src/features/properties/api/property.mapper';
import { parseCreatePropertyInput, parseUpdatePropertyInput } from '../../supabase/functions/_shared/property-input';
import type { PropertyOwnershipVerification } from '../../src/types';

// Funciones que la web añadió y la app replica con las mismas reglas que el servidor.

const today = new Date('2026-10-27T12:00:00');

describe('luz y agua', () => {
  test('se cobran con cada pago, también el primero', () => {
    const charges = { serviceFeeAmount: 1000, cleaningFeeAmount: 2000, electricityFeeAmount: 15000, waterFeeAmount: 5000 };
    expect(paymentBreakdown(100000, charges, { firstPayment: true }).totalDue).toBe(123000);
    expect(paymentBreakdown(100000, charges, { firstPayment: false }).totalDue).toBe(121000);
  });

  test('la vivienda lee los importes de la fila', () => {
    const property = mapProperty({ id: 'p1', electricity_fee_amount: 15000, water_fee_amount: '5000', ownership_verification_status: 'missing', status: 'pending' });
    expect([property.electricityFeeAmount, property.waterFeeAmount, property.ownershipVerificationStatus, property.status]).toEqual([15000, 5000, 'missing', 'pending']);
    expect(mapProperty({ id: 'p2', ownership_verification_status: 'otra' }).ownershipVerificationStatus).toBeUndefined();
  });

  test('las Edge Functions validan y guardan los importes', () => {
    const create = parseCreatePropertyInput({ title: 'Casa grande', description: 'Una casa con jardín', location: 'Malabo', coordinates: { lat: 3.75, lng: 8.78 }, price: 100000, price_type: 'per_month', bedrooms: 2, bathrooms: 1, electricity_fee_amount: 15000 });
    expect([create.fees.electricityFeeAmount, create.fees.waterFeeAmount]).toEqual([15000, 0]);
    const update = parseUpdatePropertyInput({ property_id: 'p1', title: 'Casa grande', description: 'Una casa con jardín', price: 100000, water_fee_amount: 4000 });
    expect(update.fees).toEqual({ waterFeeAmount: 4000 });
    expect(() => parseCreatePropertyInput({ title: 'Casa grande', description: 'Una casa con jardín', location: 'Malabo', coordinates: { lat: 3.75, lng: 8.78 }, price: 100000, price_type: 'per_month', bedrooms: 2, bathrooms: 1, water_fee_amount: 1.5 })).toThrow('importe entero');
  });
});

const contract: LeaseContract = {
  id: 'c1', contractNumber: 'CEG-1', agreementId: 'a1', propertyId: 'p1', propertyTitle: 'Vivienda', templateVersion: 1,
  ownerId: 'owner', clientId: 'client', status: 'signed', contentHash: 'hash', createdAt: '2026-10-01T00:00:00Z',
  snapshot: {
    title: 'Contrato', property: { id: 'p1', title: 'Vivienda', location: 'Malabo', price: 100000, currency: 'XAF' },
    owner: { id: 'owner', name: 'Ana', email: 'ana@example.test' }, client: { id: 'client', name: 'Luis', email: 'luis@example.test' },
    agreement: { id: 'a1', agreedPrice: 100000, currency: 'XAF' }, terms: DEFAULT_LEASE_TERMS,
    charges: { serviceFeeAmount: 0, cleaningFeeAmount: 0, taxAmount: 0, securityDepositAmount: 0, electricityFeeAmount: 15000 },
    generatedAt: '2026-10-01T00:00:00Z',
  },
};

describe('contrato', () => {
  test('el documento dice si luz y agua van con el alquiler', () => {
    const html = buildLeaseContractHtml(contract);
    expect(html).toContain('con cada pago');
    expect(html).toContain('Agua: No se cobra con el alquiler');
    expect(html).not.toContain('Luz: No se cobra');
  });

  test('la anulación la pide una parte, con motivo, si no hay otra pendiente', () => {
    expect(cancellationReasonError('corto')).toContain('10 caracteres');
    expect(cancellationReasonError('El inquilino se muda de ciudad')).toBe(null);
    expect(canRequestCancellation(contract, 'client')).toBe(true);
    expect(canRequestCancellation(contract, 'otro')).toBe(false);
    expect(canRequestCancellation({ ...contract, status: 'cancelled' }, 'client')).toBe(false);
    const pending = mapCancellationRequest({ id: 'r1', contract_id: 'c1', requested_by: 'owner', requester_role: 'owner', reason: 'Venta de la vivienda', status: 'pending', created_at: '2026-10-20T00:00:00Z' });
    expect(pending.requesterRole).toBe('owner');
    expect(canRequestCancellation(contract, 'client', pending)).toBe(false);
  });
});

describe('intentos de pago ocultos', () => {
  const order = (status: string, hidden?: string) => mapPaymentOrder({ id: 'o1', contract_id: 'c1', tenant_id: 'tenant', owner_id: 'owner', amount: 1000, status, payment_method: 'fondoseg', hidden_by_tenant_at: hidden });

  test('el inquilino solo oculta intentos que no se cobraron', () => {
    expect(ORDER_COLUMNS).toContain('hidden_by_tenant_at');
    expect(canTenantHidePayment(order('failed'), 'tenant')).toBe(true);
    expect(canTenantHidePayment(order('completed'), 'tenant')).toBe(false);
    expect(canTenantHidePayment(order('failed'), 'owner')).toBe(false);
  });

  test('solo se ocultan para el inquilino', () => {
    const hidden = order('expired', '2026-10-20T00:00:00Z');
    expect(isHiddenByTenant(hidden, 'tenant')).toBe(true);
    expect(isHiddenByTenant(hidden, 'owner')).toBe(false);
  });
});

describe('identidad del propietario', () => {
  test('acepta DD/MM/AAAA y rechaza fechas imposibles', () => {
    expect(parseDisplayDate('20/5/2031')).toBe('2031-05-20');
    expect(parseDisplayDate('31/02/2031')).toBe('');
  });

  test('exige un documento vigente y con una caducidad creíble', () => {
    expect(identityDocumentExpiryError('', today)).toContain('caducidad');
    expect(identityDocumentExpiryError('2026-10-26', today)).toContain('caducado');
    expect(identityDocumentExpiryError('2026-10-27', today)).toBe(null);
    expect(identityDocumentExpiryError('2050-01-01', today)).toContain('no es válida');
  });
});

describe('verificación de la propiedad', () => {
  test('las tres vías piden los mismos documentos que el servidor', () => {
    expect(OWNERSHIP_ROUTE_DOCUMENTS).toEqual({
      registry: ['registry_certificate', 'public_deed'],
      notarial: ['public_deed'],
      developer: ['award_contract', 'settlement_certificate', 'handover_record'],
    });
  });

  test('el certificado registral tiene fecha y menos de 3 meses', () => {
    expect(ownershipDocumentDateError('registry_certificate', '', today)).toContain('fecha');
    expect(ownershipDocumentDateError('registry_certificate', '2026-06-01', today)).toContain('3 meses');
    expect(ownershipDocumentDateError('registry_certificate', '2026-10-01', today)).toBe(null);
    expect(ownershipDocumentDateError('public_deed', '', today)).toBe(null);
    expect(ownershipDocumentDateError('public_deed', '2027-01-01', today)).toContain('futura');
  });

  const verification = (status: PropertyOwnershipVerification['status'], createdAt: string): PropertyOwnershipVerification => ({
    id: createdAt, propertyId: 'p1', ownerId: 'o1', route: 'registry', status, reviewNotes: null, reviewedAt: null, createdAt, documents: [],
  });

  test('el propietario ve el estado de la revisión más reciente', () => {
    const latest = latestVerificationByProperty([verification('rejected', '2026-10-01'), verification('pending', '2026-10-10')]).get('p1');
    expect(latest?.status).toBe('pending');
    expect(ownershipStatusSummary({ status: 'pending', ownershipVerificationStatus: 'missing' }, latest)).toEqual({ key: 'pendingUnpublished', tone: 'warning', canSubmit: false });
    expect(ownershipStatusSummary({ status: 'pending', ownershipVerificationStatus: 'missing' }).key).toBe('missing');
    expect(ownershipStatusSummary({ status: 'active', ownershipVerificationStatus: 'approved' }).canSubmit).toBe(false);
    expect(ownershipStatusSummary({ status: 'active', ownershipVerificationStatus: 'exempt' }, verification('rejected', '2026-10-01')).key).toBe('rejected');
  });

  test('el superadmin aprueba solo con todo válido y rechaza con motivo', () => {
    expect(ownershipReviewDecisionError('approved', ['valid', undefined])).toContain('Marca cada documento');
    expect(ownershipReviewDecisionError('approved', ['valid', 'invalid'])).toContain('todos los documentos deben ser válidos');
    expect(ownershipReviewDecisionError('approved', ['valid', 'valid'])).toBe(null);
    expect(ownershipReviewDecisionError('rejected', ['valid', 'valid'])).toContain('explica el motivo');
    expect(ownershipReviewDecisionError('rejected', ['valid', 'valid'], 'Otra finca')).toBe(null);
    expect(ownershipReviewDecisionError('rejected', ['invalid', 'valid'])).toBe(null);
  });
});

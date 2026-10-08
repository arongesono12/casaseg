import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Contratos entre la app y el backend compartido con la web: nombres de RPC,
// parámetros y mapeo de filas. Si la web cambia una firma, estos tests son los
// que deben fallar primero.

type Call = { kind: 'rpc' | 'invoke' | 'insert' | 'upload' | 'remove'; name: string; args?: unknown };
const calls: Call[] = [];
const rpcResults: Record<string, { data: unknown; error: unknown }> = {};
const invokeResults: Record<string, { data: unknown; error: unknown }> = {};
const storage = new Map<string, string>();

mock.module('react-native', () => ({ Platform: { OS: 'android', Version: 34 } }));
mock.module('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
mock.module('expo-linking', () => ({ createURL: (path: string) => `casaseg://${path.replace(/^\//, '')}` }));
mock.module('expo-web-browser', () => ({ openBrowserAsync: async () => ({ type: 'dismiss' }) }));
mock.module('expo', () => ({ requireOptionalNativeModule: () => ({}) }));
mock.module('expo-print', () => ({ printAsync: async () => undefined }));
mock.module('@/lib/read-local-file', () => ({ readLocalFile: async () => new ArrayBuffer(2048) }));
mock.module('@/lib/local-storage', () => ({
  appStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } },
}));
mock.module('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push({ kind: 'rpc', name, args });
      return rpcResults[name] ?? { data: null, error: null };
    },
    functions: {
      invoke: async (name: string, options: { body: unknown }) => {
        calls.push({ kind: 'invoke', name, args: options.body });
        return invokeResults[name] ?? { data: null, error: null };
      },
    },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        calls.push({ kind: 'insert', name: table, args: row });
        return { error: null };
      },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          calls.push({ kind: 'upload', name: bucket, args: path });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          calls.push({ kind: 'remove', name: bucket, args: paths });
          return { error: null };
        },
      }),
    },
  },
}));

const model = await import('../../src/features/contracts/lease-contract.model');
const contracts = await import('../../src/features/contracts/contracts.api');
const payments = await import('../../src/features/payments/payments.api');
const bankTransfer = await import('../../src/features/payments/bank-transfer.api');
const ownerPlan = await import('../../src/features/owner/owner-plan.api');
const compliance = await import('../../src/features/compliance/compliance.api');
const views = await import('../../src/features/properties/property-views');
const visits = await import('../../src/features/properties/api/visit-requests');
const schedule = await import('../../src/features/visits/visit-schedule');
const ownerUpgrade = await import('../../src/features/owner/owner-upgrade.api');
const accountDeletion = await import('../../src/features/account/account-deletion.api');

const contractRow = {
  id: 'c1',
  contract_number: 'CEG-20260101-ABC123-XYZ789',
  agreement_id: 'a1',
  property_id: 'p1',
  template_version: 3,
  owner_id: 'owner-1',
  client_id: 'client-1',
  status: 'partially_signed',
  snapshot: {
    title: 'Contrato <b>',
    property: { id: 'p1', title: 'Piso', location: 'Malabo', price: 150000, currency: 'FCFA' },
    owner: { id: 'owner-1', name: 'Ana', email: 'ana@example.com' },
    client: { id: 'client-1', name: 'Luis', email: 'luis@example.com' },
    agreement: { id: 'a1', agreedPrice: 150000, currency: 'FCFA' },
    terms: { durationMonths: 6 },
    generatedAt: '2026-01-01T10:00:00Z',
  },
  content_hash: 'abc',
  owner_signed_at: '2026-01-02T10:00:00Z',
  client_signed_at: null,
  owner_signature: { signerName: 'Ana', signerRole: 'owner' },
  client_signature: null,
  signed_at: null,
  created_at: '2026-01-01T10:00:00Z',
  properties: { title: 'Piso céntrico' },
};

beforeEach(() => {
  calls.length = 0;
  storage.clear();
  for (const key of Object.keys(rpcResults)) delete rpcResults[key];
  for (const key of Object.keys(invokeResults)) delete invokeResults[key];
});

describe('lease contract model', () => {
  test('maps the real lease_contracts columns and fills default terms', () => {
    const contract = model.mapLeaseContract(contractRow);
    expect(contract.status).toBe('partially_signed');
    expect(contract.templateVersion).toBe(3);
    expect(contract.propertyTitle).toBe('Piso céntrico');
    expect(contract.ownerSignature?.signerName).toBe('Ana');
    expect(contract.snapshot?.terms.durationMonths).toBe(6);
    expect(contract.snapshot?.terms.noticeDays).toBe(30);
  });

  test('only asks the party that has not signed yet', () => {
    const contract = model.mapLeaseContract(contractRow);
    expect(model.needsSignatureFrom(contract, 'owner-1')).toBe(false);
    expect(model.needsSignatureFrom(contract, 'client-1')).toBe(true);
    expect(model.needsSignatureFrom(contract, 'stranger')).toBe(false);
    expect(model.needsSignatureFrom({ ...contract, status: 'cancelled' }, 'client-1')).toBe(false);
  });

  test('rejects signer names shorter than the database minimum', () => {
    expect(() => model.normalizeSignerName(' Al ')).toThrow();
    expect(model.normalizeSignerName('  Luis Obiang ')).toBe('Luis Obiang');
  });

  test('accepts only terms the contract snapshot can rely on', () => {
    expect(model.validLeaseTerms(model.DEFAULT_LEASE_TERMS)).toBe(true);
    expect(model.validLeaseTerms({ ...model.DEFAULT_LEASE_TERMS, paymentDay: 31 })).toBe(false);
    expect(model.validLeaseTerms({ ...model.DEFAULT_LEASE_TERMS, durationMonths: 0 })).toBe(false);
    expect(model.validLeaseTerms({ ...model.DEFAULT_LEASE_TERMS, depositAmount: 1.5 })).toBe(false);
  });

  test('escapes snapshot text in the printable document', () => {
    const html = model.buildLeaseContractHtml(model.mapLeaseContract(contractRow));
    expect(html).toContain('Contrato &lt;b&gt;');
    expect(html).toContain('SHA-256: abc');
  });
});

describe('contracts api', () => {
  test('signs through sign_lease_contract with the web parameters', async () => {
    rpcResults.sign_lease_contract = { data: { ...contractRow, status: 'signed' }, error: null };
    const signed = await contracts.signContract('c1', 'Luis Obiang');
    expect(signed.status).toBe('signed');
    expect(calls[0]).toEqual({
      kind: 'rpc',
      name: 'sign_lease_contract',
      args: { p_contract_id: 'c1', p_signer_name: 'Luis Obiang', p_user_agent: 'CasaSeg Expo (android 34)', p_assurance_level: 'authenticated_session' },
    });
  });

  test('records a downloaded audit event after opening the document', async () => {
    await contracts.openContractDocument(model.mapLeaseContract(contractRow), 'client-1');
    expect(calls[0].name).toBe('contract_audit_events');
    expect((calls[0].args as { event_type: string }).event_type).toBe('downloaded');
  });
});

describe('payments api', () => {
  test('requires a phone only where rental-payment-initiate does', () => {
    expect(payments.providerRequiresPhone('muni_dinero')).toBe(true);
    expect(payments.providerRequiresPhone('ecobank')).toBe(true);
    expect(payments.providerRequiresPhone('fondoseg')).toBe(false);
    expect(payments.providerRequiresPhone('bank_transfer')).toBe(false);
  });

  test('never offers payment methods the server rejects for new orders', () => {
    expect(payments.paymentProviders).not.toContain('card');
    expect(payments.paymentProviders).not.toContain('mtn_money');
  });

  test('treats review and expiry states correctly', () => {
    const order = payments.mapPaymentOrder({ id: 'o1', contract_id: 'c1', amount: '1000', total_due: '1200', payment_method: 'bank_transfer', status: 'awaiting_review', instructions: { reference: 'CEG-RENT-1', ignored: 3 } });
    expect(order.totalDue).toBe(1200);
    expect(order.instructions).toEqual({ reference: 'CEG-RENT-1' });
    expect(payments.isOpenPaymentStatus(order.status)).toBe(true);
    expect(payments.isOpenPaymentStatus('expired')).toBe(false);
  });

  test('initiates through rental-payment-initiate with the web body', async () => {
    invokeResults['rental-payment-initiate'] = { data: { order: { id: 'o1', contract_id: 'c1', amount: 1000, payment_method: 'fondoseg', status: 'pending' }, requiresRedirect: false, message: 'Orden creada' }, error: null };
    const result = await payments.initiateRentalPayment({ contractId: 'c1', provider: 'fondoseg', chargesAccepted: true, cancellationPolicyAccepted: true });
    expect(result.order.id).toBe('o1');
    expect(calls[0].name).toBe('rental-payment-initiate');
    const body = calls[0].args as Record<string, unknown>;
    expect(body.paymentMethod).toBe('fondoseg');
    expect(body.idempotencyKey).toBe('11111111-1111-4111-8111-111111111111');
    expect(body.returnUrl).toBe('casaseg://payment/success');
    expect(body.chargesAccepted).toBe(true);
  });

  test('refuses to pay without accepting charges', async () => {
    let message = '';
    try {
      await payments.initiateRentalPayment({ contractId: 'c1', provider: 'fondoseg', chargesAccepted: false, cancellationPolicyAccepted: false });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('aceptar');
    expect(calls.length).toBe(0);
  });
});

describe('bank transfer api', () => {
  test('rejects receipts the bucket does not accept', () => {
    expect(() => bankTransfer.validateReceipt({ uri: 'file://x', name: 'x.gif', mimeType: 'image/gif' })).toThrow();
    expect(() => bankTransfer.validateReceipt({ uri: 'file://x', name: 'x.pdf', mimeType: 'application/pdf', size: 11 * 1024 * 1024 })).toThrow();
  });

  test('removes the uploaded receipt when the proof cannot be registered', async () => {
    rpcResults.submit_bank_transfer_proof = { data: null, error: new Error('order is not a bank transfer') };
    let failed = false;
    try {
      await bankTransfer.submitBankTransferProof({ order: { id: 'o1', provider: 'bank_transfer' }, tenantId: 't1', file: { uri: 'file://r.pdf', name: 'r.pdf', mimeType: 'application/pdf' }, senderName: 'Luis', bankReference: 'REF', transferredAt: new Date('2026-01-03T09:00:00Z') });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(calls.map((call) => call.kind)).toEqual(['upload', 'rpc', 'remove']);
    expect(String(calls[0].args)).toBe('t1/o1/11111111-1111-4111-8111-111111111111.pdf');
  });
});

describe('owner plan api', () => {
  test('keeps only the plan types the web defines', () => {
    expect(ownerPlan.mapOwnerPlan({ id: '1', type: 'normal', name: 'Normal', max_properties: 8, price_monthly: 15000, features: ['a', 2] })?.features).toEqual(['a']);
    expect(ownerPlan.mapOwnerPlan({ id: '2', type: 'basic' })).toBe(null);
  });

  test('maps entitlements without negative remaining quota', () => {
    const entitlements = ownerPlan.mapOwnerEntitlements({ plan_type: 'normal', max_properties: 8, used_properties: 9, remaining_properties: -1, can_publish: false, reason: 'property_limit_reached' });
    expect(entitlements.remainingProperties).toBe(0);
    expect(entitlements.canPublish).toBe(false);
  });
});

describe('compliance api', () => {
  const contract = { id: 'c1', status: 'signed', ownerId: 'owner-1', clientId: 'client-1' };
  const paid = new Set(['c1']);

  test('mirrors the web review eligibility rules', () => {
    const base = { contract, paidContractIds: paid, reviewedContractIds: new Set<string>() };
    expect(compliance.getReviewEligibility({ ...base, viewer: { id: 'client-1', role: 'client' } }).canReview).toBe(true);
    expect(compliance.getReviewEligibility({ ...base, viewer: { id: 'owner-1', role: 'owner' } }).reason).toBe('is_owner');
    expect(compliance.getReviewEligibility({ ...base, viewer: { id: 'client-1', role: 'admin' } }).reason).toBe('staff');
    expect(compliance.getReviewEligibility({ ...base, viewer: { id: 'client-1', role: 'client' }, paidContractIds: new Set() }).reason).toBe('payment_pending');
    expect(compliance.getReviewEligibility({ ...base, viewer: { id: 'client-1', role: 'client' }, reviewedContractIds: paid }).reason).toBe('already_reviewed');
  });

  test('creates verified reviews by contract, not by property', async () => {
    rpcResults.create_verified_property_review = { data: { id: 'r1', property_id: 'p1', contract_id: 'c1', reviewer_id: 'client-1', rating: 5 }, error: null };
    await compliance.createVerifiedPropertyReview({ contractId: 'c1', rating: 5, comment: '  ' });
    expect(calls[0].args).toEqual({ p_contract_id: 'c1', p_rating: 5, p_comment: null });
  });
});

describe('property views', () => {
  test('records one view per viewer and day and skips the owner', async () => {
    await views.trackPropertyView({ propertyId: 'p1', ownerId: 'owner-1', viewerId: 'owner-1' });
    await views.trackPropertyView({ propertyId: 'p1', ownerId: 'owner-1', viewerId: 'client-1' });
    await views.trackPropertyView({ propertyId: 'p1', ownerId: 'owner-1', viewerId: 'client-1' });
    expect(calls).toEqual([{ kind: 'insert', name: 'property_views', args: { property_id: 'p1', owner_id: 'owner-1', viewer_id: 'client-1' } }]);
  });
});

describe('visits as web meeting agreements', () => {
  test('maps an agreement row to a visit in local time', () => {
    const visit = visits.mapAgreementToVisit({ id: 'a1', property_id: 'p1', client_id: 'client-1', owner_id: 'owner-1', meeting_date: '2026-10-20', meeting_time: '16:00:00', notes: 'Hola', status: 'client_confirmed', properties: [{ title: 'Piso' }] });
    const local = new Date(visit.proposedAt);
    expect(visit.status).toBe('pending');
    expect(visit.propertyTitle).toBe('Piso');
    expect(local.getHours()).toBe(16);
    expect(local.getDate()).toBe(20);
  });

  test('only a fully confirmed agreement is an accepted visit', () => {
    expect(schedule.visitStatusFromAgreement('fully_confirmed')).toBe('accepted');
    expect(schedule.visitStatusFromAgreement('owner_confirmed')).toBe('pending');
    expect(schedule.visitStatusFromAgreement('rejected')).toBe('rejected');
  });

  test('stores meeting date and time without time zone, like the web', () => {
    expect(schedule.toMeetingDateTime(new Date(2026, 0, 5, 9, 0))).toEqual({ meetingDate: '2026-01-05', meetingTime: '09:00' });
  });

  test('maps each intent to the server-side agreement RPC', () => {
    expect(visits.agreementRpcFor('accepted')).toBe('confirm_meeting_agreement');
    expect(visits.agreementRpcFor('rejected')).toBe('reject_meeting_agreement');
    expect(visits.agreementRpcFor('cancelled')).toBe('reject_meeting_agreement');
    expect(() => visits.agreementRpcFor('pending')).toThrow();
  });

  test('confirms through confirm_meeting_agreement instead of writing the row', async () => {
    await visits.updateVisitRequestStatus('a1', 'accepted');
    expect(calls).toEqual([{ kind: 'rpc', name: 'confirm_meeting_agreement', args: { p_agreement_id: 'a1' } }]);
  });
});

describe('owner upgrade request', () => {
  const valid = { planType: 'normal' as const, isYearly: false, paymentMethod: 'muni_dinero' as const, phoneNumber: '222 123 456', fullName: 'Luis Obiang', residenceLocation: 'Malabo', nationality: 'GQ', documentType: 'dni' as const, documentNumber: 'AB-1234' };

  test('applies the same rules as the owner_upgrade_requests trigger', () => {
    expect(ownerUpgrade.validateOwnerUpgradeInput(valid)).toBe(null);
    expect(ownerUpgrade.validateOwnerUpgradeInput({ ...valid, phoneNumber: '+240 222 123 456' })).toContain('Muni');
    expect(ownerUpgrade.validateOwnerUpgradeInput({ ...valid, documentNumber: 'AB 12' })).toContain('documento');
    expect(ownerUpgrade.validateOwnerUpgradeInput({ ...valid, paymentMethod: 'bank_transfer', phoneNumber: '+240 222 123 456' })).toBe(null);
  });

  test('only accepts real PDF files for the title deed', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).buffer;
    expect(ownerUpgrade.validateTitlePdf({ uri: 'file://t.pdf', name: 't.pdf', mimeType: 'application/pdf' }, pdf)).toBe(null);
    expect(ownerUpgrade.validateTitlePdf({ uri: 'file://t.pdf', name: 't.pdf', mimeType: 'application/pdf' }, png)).toContain('firma PDF');
    expect(ownerUpgrade.validateTitlePdf({ uri: 'file://t.png', name: 't.png', mimeType: 'image/png' }, pdf)).toContain('PDF');
  });
});

describe('account deletion', () => {
  test('requires the same confirmation word as the web', () => {
    expect(accountDeletion.isDeletionConfirmed(' eliminar ')).toBe(true);
    expect(accountDeletion.isDeletionConfirmed('borrar')).toBe(false);
  });

  test('requests deferred deletion through the shared Edge Function', async () => {
    invokeResults['account-deletion'] = { data: { success: true, scheduledFor: '2026-10-09T10:00:00Z' }, error: null };
    const result = await accountDeletion.requestAccountDeletion('ELIMINAR');
    expect(result.scheduledFor).toBe('2026-10-09T10:00:00Z');
    expect(calls[0]).toEqual({ kind: 'invoke', name: 'account-deletion', args: { action: 'request', confirmation: 'ELIMINAR' } });
  });
});

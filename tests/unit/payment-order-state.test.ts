import { describe, expect, test } from 'bun:test';
import {
  canTenantCancelPayment,
  isCancellablePaymentStatus,
  isOpenPaymentStatus,
  mapPaymentOrder,
  paymentReturnOutcome,
  showsInsufficientFunds,
} from '../../src/features/payments/payment-order-state';

const row = {
  id: 'order-1',
  contract_id: 'contract-1',
  tenant_id: 'tenant-uuid',
  owner_id: 'owner-uuid',
  amount: 100000,
  total_due: 112000,
  currency: 'FCFA',
  payment_method: 'fondoseg',
  status: 'pending',
  payment_reference: 'CASAS-1',
  checkout_url: 'https://pay.example/checkout/1',
  instructions: { note: 'ok', ignored: 3 },
  expires_at: '2026-10-20T10:00:00Z',
  failure_reason: null,
  cancelled_at: null,
};

describe('mapPaymentOrder', () => {
  test('maps the amount the tenant actually pays and the failure fields', () => {
    const order = mapPaymentOrder({ ...row, failure_reason: 'insufficient_funds' });
    expect(order.totalDue).toBe(112000);
    expect(order.failureReason).toBe('insufficient_funds');
    expect(order.cancelledAt).toBeUndefined();
    expect(order.instructions).toEqual({ note: 'ok' });
  });

  test('ignores failure reasons the server does not define', () => {
    expect(mapPaymentOrder({ ...row, failure_reason: 'something_else' }).failureReason).toBeUndefined();
  });

  test('keeps the cancellation timestamp', () => {
    const order = mapPaymentOrder({ ...row, status: 'cancelled', failure_reason: 'cancelled_by_tenant', cancelled_at: '2026-10-19T09:00:00Z' });
    expect(order.status).toBe('cancelled');
    expect(order.failureReason).toBe('cancelled_by_tenant');
    expect(order.cancelledAt).toBe('2026-10-19T09:00:00Z');
  });
});

describe('payment status rules (same as rental-payment-cancel)', () => {
  test('only pending and processing orders can be cancelled', () => {
    expect(isCancellablePaymentStatus('pending')).toBe(true);
    expect(isCancellablePaymentStatus('processing')).toBe(true);
    expect(isCancellablePaymentStatus('awaiting_review')).toBe(false);
    expect(isCancellablePaymentStatus('completed')).toBe(false);
    expect(isCancellablePaymentStatus('cancelled')).toBe(false);
  });

  test('a proof under review still counts as an open order', () => {
    expect(isOpenPaymentStatus('awaiting_review')).toBe(true);
    expect(isOpenPaymentStatus('expired')).toBe(false);
  });

  test('only the tenant of the order can cancel it', () => {
    const order = mapPaymentOrder(row);
    expect(canTenantCancelPayment(order, 'tenant-uuid')).toBe(true);
    expect(canTenantCancelPayment(order, 'owner-uuid')).toBe(false);
    expect(canTenantCancelPayment(order, undefined)).toBe(false);
    expect(canTenantCancelPayment({ ...order, status: 'completed' }, 'tenant-uuid')).toBe(false);
  });

  test('the insufficient funds notice only shows while the order is still open', () => {
    const order = mapPaymentOrder({ ...row, failure_reason: 'insufficient_funds' });
    expect(showsInsufficientFunds(order)).toBe(true);
    expect(showsInsufficientFunds({ ...order, status: 'cancelled' })).toBe(false);
    expect(showsInsufficientFunds(mapPaymentOrder(row))).toBe(false);
  });
});

describe('paymentReturnOutcome (same messages as the web return hook)', () => {
  test('a server confirmation wins', () => {
    expect(paymentReturnOutcome({ confirmed: true, status: 'completed' })).toBe('confirmed');
  });

  test('closed orders tell the tenant nothing was charged', () => {
    expect(paymentReturnOutcome({ confirmed: false, status: 'cancelled' })).toBe('notCompleted');
    expect(paymentReturnOutcome({ confirmed: false, status: 'expired' })).toBe('notCompleted');
    expect(paymentReturnOutcome({ confirmed: false, status: 'failed' })).toBe('notCompleted');
  });

  test('anything else is still being processed', () => {
    expect(paymentReturnOutcome({ confirmed: false, status: 'pending' })).toBe('processing');
    expect(paymentReturnOutcome({ confirmed: false, status: 'processing' })).toBe('processing');
  });
});

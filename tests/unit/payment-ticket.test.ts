import { describe, expect, test } from 'bun:test';
import type { LeaseContract } from '../../src/features/contracts/lease-contract.model';
import { canDownloadPaymentTicket, mapPaymentOrder } from '../../src/features/payments/payment-order-state';
import {
  buildPaymentTicketData,
  buildPaymentTicketHtml,
  buildVerificationCode,
  paymentTicketLabels,
} from '../../src/features/payments/payment-ticket';

const order = mapPaymentOrder({
  id: '974cf211-1b74-4c49-813f-9bcefb05f102',
  contract_id: 'contract-1',
  tenant_id: 'tenant-1',
  owner_id: 'owner-1',
  amount: 90000,
  total_due: 107000,
  currency: 'FCFA',
  payment_method: 'fondoseg',
  status: 'completed',
  payment_reference: 'CEG-RENT-20261027231854-19CF3993',
  provider_reference: 'ac9e6350-d24f-4542-85ad-180b11a994b4',
  service_fee_amount: 5000,
  cleaning_fee_amount: 0,
  tax_amount: 2000,
  security_deposit_amount: 0,
  electricity_fee_amount: 6000,
  water_fee_amount: 4000,
  completed_at: '2026-10-27T23:21:07.603Z',
});

const contract = {
  id: 'contract-1',
  contractNumber: 'CEG-20261027-3BD2E1-B8F612',
  propertyTitle: 'Apartamento en Malabo II',
  snapshot: {
    title: 'Contrato',
    property: { id: 'property-1', title: 'Apartamento en Malabo II', location: 'Malabo, Bioko Norte', price: 90000, currency: 'FCFA' },
    owner: { id: 'owner-1', name: 'Propietaria Ejemplo', email: 'owner@example.com' },
    client: { id: 'tenant-1', name: 'Inquilino <Ejemplo>', email: 'tenant@example.com' },
    agreement: { id: 'agreement-1', agreedPrice: 90000, currency: 'FCFA' },
    terms: { rentPeriod: 'monthly' },
    generatedAt: '2026-10-27T10:00:00.000Z',
  },
} as unknown as LeaseContract;

describe('ticket de pago', () => {
  test('solo se ofrece para pagos completados', () => {
    expect(canDownloadPaymentTicket(order)).toBe(true);
    expect(canDownloadPaymentTicket({ ...order, status: 'processing' })).toBe(false);
  });

  test('reúne las partes, la vivienda y solo los cargos cobrados (como la web)', () => {
    const data = buildPaymentTicketData(order, contract, new Date('2026-10-28T10:00:00Z'));
    expect(data.currency).toBe('XAF');
    expect(data.total).toBe(107000);
    expect(data.rentPeriod).toBe('monthly');
    expect(data.lines.map((line) => line.key)).toEqual(['rent', 'serviceFee', 'tax', 'electricity', 'water']);
    expect(data.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(data.total);
    expect(buildVerificationCode(order.id)).toBe('974C-F211-F102');
  });

  test('genera el HTML del ticket con el detalle y escapa los datos', () => {
    const data = buildPaymentTicketData(order, contract, new Date('2026-10-28T10:00:00Z'));
    const html = buildPaymentTicketHtml(data, paymentTicketLabels.es, { methodLabel: 'FondosEG', locale: 'es-ES' });
    for (const text of ['Ticket de pago', order.paymentReference, 'Apartamento en Malabo II', 'Mensual', 'Luz', 'Agua', '974C-F211-F102', '107.000 XAF', '5.000 XAF']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('Inquilino &lt;Ejemplo&gt;');
    expect(html.includes('<Ejemplo>')).toBe(false);
  });

  test('sin contrato sigue saliendo con lo que tiene la orden', () => {
    const html = buildPaymentTicketHtml(buildPaymentTicketData(order, null), paymentTicketLabels.en, { methodLabel: 'FondosEG', locale: 'en-GB' });
    expect(html).toContain('Payment receipt');
    expect(html).toContain('Not available');
  });
});

import { brand, colors } from '@/constants/brand';
import type { LeaseContract } from '@/features/contracts/lease-contract.model';
import type { PaymentOrder } from '@/features/payments/payment-order-state';

/**
 * Ticket de pago de una orden de alquiler pagada: mismos datos y mismo diseño
 * que el PDF de la web (src/services/paymentTicketPdf.ts). Aquí se genera en
 * HTML y expo-print lo convierte en PDF. Sin React Native, para poder probarlo.
 */

export type PaymentTicketChargeKey = 'rent' | 'serviceFee' | 'cleaningFee' | 'tax' | 'securityDeposit' | 'electricity' | 'water';

export type PaymentTicketLine = { key: PaymentTicketChargeKey; amount: number };

export type PaymentTicketData = {
  ticketNumber: string;
  verificationCode: string;
  orderId: string;
  providerReference: string;
  paidAt: string;
  issuedAt: string;
  currency: string;
  total: number;
  lines: PaymentTicketLine[];
  tenant: { name: string; email: string };
  owner: { name: string; email: string };
  property: { title: string; location: string };
  contractNumber: string;
  rentPeriod: string;
};

export type PaymentTicketLabels = {
  documentTitle: string;
  subtitle: string;
  ticketNumber: string;
  issuedAt: string;
  paid: string;
  paidVia: string;
  amountPaid: string;
  tenant: string;
  owner: string;
  property: string;
  contract: string;
  rentPeriod: string;
  paymentDetails: string;
  method: string;
  paymentReference: string;
  providerReference: string;
  transactionId: string;
  paidAt: string;
  breakdown: string;
  concept: string;
  amount: string;
  total: string;
  charges: Record<PaymentTicketChargeKey, string>;
  periods: Record<string, string>;
  verificationCode: string;
  verificationNote: string;
  footerNote: string;
  notAvailable: string;
};

/** Textos del ticket: los mismos que `rentalPayments.ticket` de la web. */
export const paymentTicketLabels: Record<'es' | 'fr' | 'en', PaymentTicketLabels> = {
  es: {
    documentTitle: 'Ticket de pago',
    subtitle: 'Comprobante de pago de alquiler',
    ticketNumber: 'N.º de ticket',
    issuedAt: 'Emitido',
    paid: 'Pagado',
    paidVia: 'Pago confirmado por {method}',
    amountPaid: 'Importe pagado',
    tenant: 'Inquilino',
    owner: 'Propietario',
    property: 'Vivienda',
    contract: 'Contrato',
    rentPeriod: 'Periodo',
    paymentDetails: 'Detalle del pago',
    method: 'Método de pago',
    paymentReference: 'Referencia de pago',
    providerReference: 'Referencia del proveedor',
    transactionId: 'ID de transacción',
    paidAt: 'Fecha de pago',
    breakdown: 'Desglose de cargos',
    concept: 'Concepto',
    amount: 'Importe',
    total: 'Total pagado',
    charges: { rent: 'Alquiler', serviceFee: 'Gastos de servicio', cleaningFee: 'Limpieza', tax: 'Impuestos', securityDeposit: 'Fianza', electricity: 'Luz', water: 'Agua' },
    periods: { monthly: 'Mensual', weekly: 'Semanal', nightly: 'Por noche' },
    verificationCode: 'Código de verificación',
    verificationNote: 'Indica este código a soporte de CasasEG para verificar la autenticidad del ticket.',
    footerNote: 'Documento generado por CasasEG. Acredita el pago confirmado por el proveedor indicado.',
    notAvailable: 'No disponible',
  },
  fr: {
    documentTitle: 'Reçu de paiement',
    subtitle: 'Justificatif de paiement du loyer',
    ticketNumber: 'N° de reçu',
    issuedAt: 'Émis le',
    paid: 'Payé',
    paidVia: 'Paiement confirmé par {method}',
    amountPaid: 'Montant payé',
    tenant: 'Locataire',
    owner: 'Propriétaire',
    property: 'Logement',
    contract: 'Contrat',
    rentPeriod: 'Période',
    paymentDetails: 'Détails du paiement',
    method: 'Moyen de paiement',
    paymentReference: 'Référence de paiement',
    providerReference: 'Référence du prestataire',
    transactionId: 'ID de transaction',
    paidAt: 'Date du paiement',
    breakdown: 'Détail des frais',
    concept: 'Libellé',
    amount: 'Montant',
    total: 'Total payé',
    charges: { rent: 'Loyer', serviceFee: 'Frais de service', cleaningFee: 'Ménage', tax: 'Taxes', securityDeposit: 'Caution', electricity: 'Électricité', water: 'Eau' },
    periods: { monthly: 'Mensuel', weekly: 'Hebdomadaire', nightly: 'Par nuit' },
    verificationCode: 'Code de vérification',
    verificationNote: "Communiquez ce code au support CasasEG pour vérifier l'authenticité du reçu.",
    footerNote: 'Document généré par CasasEG. Il atteste le paiement confirmé par le prestataire indiqué.',
    notAvailable: 'Non disponible',
  },
  en: {
    documentTitle: 'Payment receipt',
    subtitle: 'Rent payment receipt',
    ticketNumber: 'Receipt no.',
    issuedAt: 'Issued',
    paid: 'Paid',
    paidVia: 'Payment confirmed by {method}',
    amountPaid: 'Amount paid',
    tenant: 'Tenant',
    owner: 'Owner',
    property: 'Property',
    contract: 'Contract',
    rentPeriod: 'Period',
    paymentDetails: 'Payment details',
    method: 'Payment method',
    paymentReference: 'Payment reference',
    providerReference: 'Provider reference',
    transactionId: 'Transaction ID',
    paidAt: 'Payment date',
    breakdown: 'Charges breakdown',
    concept: 'Item',
    amount: 'Amount',
    total: 'Total paid',
    charges: { rent: 'Rent', serviceFee: 'Service fee', cleaningFee: 'Cleaning', tax: 'Taxes', securityDeposit: 'Security deposit', electricity: 'Electricity', water: 'Water' },
    periods: { monthly: 'Monthly', weekly: 'Weekly', nightly: 'Per night' },
    verificationCode: 'Verification code',
    verificationNote: 'Give this code to CasasEG support to verify that this receipt is authentic.',
    footerNote: 'Document generated by CasasEG. It certifies the payment confirmed by the stated provider.',
    notAvailable: 'Not available',
  },
};

export const PAYMENT_TICKET_LOCALES: Record<'es' | 'fr' | 'en', string> = { es: 'es-ES', fr: 'fr-FR', en: 'en-GB' };

const ISO_CURRENCY: Record<string, string> = { FCFA: 'XAF', CFA: 'XAF', FCA: 'XAF' };

export function toTicketCurrency(currency: string): string {
  const code = String(currency || '').replace(/\s+/g, '').toUpperCase();
  return ISO_CURRENCY[code] ?? (code || 'XAF');
}

/** Código corto impreso que permite al soporte localizar la orden (igual que la web). */
export function buildVerificationCode(orderId: string): string {
  const compact = orderId.replace(/-/g, '').toUpperCase();
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(-4)}`;
}

/** El alquiler siempre se imprime; el resto de cargos solo si se cobraron. */
export function buildTicketLines(order: PaymentOrder): PaymentTicketLine[] {
  const charges: PaymentTicketLine[] = [
    { key: 'serviceFee', amount: order.serviceFeeAmount },
    { key: 'cleaningFee', amount: order.cleaningFeeAmount },
    { key: 'tax', amount: order.taxAmount },
    { key: 'securityDeposit', amount: order.securityDepositAmount },
    { key: 'electricity', amount: order.electricityFeeAmount },
    { key: 'water', amount: order.waterFeeAmount },
  ];
  return [{ key: 'rent', amount: order.amount }, ...charges.filter((line) => Number(line.amount) > 0)];
}

export function buildPaymentTicketData(order: PaymentOrder, contract: LeaseContract | null, issuedAt: Date = new Date()): PaymentTicketData {
  const snapshot = contract?.snapshot;
  // El snapshot guarda `rentPeriod` aunque el tipo de términos de la app aún no lo declare.
  const rentPeriod = (snapshot?.terms as { rentPeriod?: unknown } | undefined)?.rentPeriod;
  return {
    ticketNumber: order.paymentReference,
    verificationCode: buildVerificationCode(order.id),
    orderId: order.id,
    providerReference: order.providerReference ?? '',
    paidAt: order.completedAt ?? order.updatedAt ?? '',
    issuedAt: issuedAt.toISOString(),
    currency: toTicketCurrency(order.currency),
    total: order.totalDue,
    lines: buildTicketLines(order),
    tenant: { name: snapshot?.client.name ?? '', email: snapshot?.client.email ?? '' },
    owner: { name: snapshot?.owner.name ?? '', email: snapshot?.owner.email ?? '' },
    property: { title: snapshot?.property.title ?? contract?.propertyTitle ?? '', location: snapshot?.property.location ?? '' },
    contractNumber: contract?.contractNumber ?? '',
    rentPeriod: typeof rentPeriod === 'string' ? rentPeriod : '',
  };
}

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// `always`: es-ES no agrupa los miles de 4 cifras y la tabla mezclaría 5000 con 90.000.
const MONEY_FORMAT = { maximumFractionDigits: 2, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions;

/** Documento A4 listo para expo-print, con la misma composición que el PDF de la web. */
export function buildPaymentTicketHtml(
  data: PaymentTicketData,
  labels: PaymentTicketLabels,
  { methodLabel, locale }: { methodLabel: string; locale: string },
): string {
  const money = (value: number) => `${escapeHtml(Number(value || 0).toLocaleString(locale, MONEY_FORMAT))} ${escapeHtml(data.currency)}`;
  const date = (iso: string) => {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime())
      ? escapeHtml(labels.notAvailable)
      : escapeHtml(new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(parsed));
  };
  const orDash = (value: string) => escapeHtml(value.trim() ? value : labels.notAvailable);
  const period = labels.periods[data.rentPeriod] ?? '';
  const propertyMeta = [
    data.property.location,
    data.contractNumber ? `${labels.contract}: ${data.contractNumber}` : '',
    period ? `${labels.rentPeriod}: ${period}` : '',
  ].filter(Boolean).join('  ·  ');
  const details: [string, string][] = [
    [labels.method, escapeHtml(methodLabel)],
    [labels.paymentReference, escapeHtml(data.ticketNumber)],
    [labels.providerReference, orDash(data.providerReference)],
    [labels.transactionId, escapeHtml(data.orderId)],
    [labels.paidAt, date(data.paidAt)],
  ];
  const c = {
    brand: brand.logo.deep,
    brandDark: brand.blue[800],
    brandSoft: brand.blue[100],
    accent: brand.logo.sky,
    text: brand.logo.graphite,
    muted: brand.neutral[500],
    border: brand.neutral[200],
    surface: brand.neutral[50],
    success: colors.success,
  };

  return `<!doctype html>
<html lang="${escapeHtml(locale.slice(0, 2))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(labels.documentTitle)} ${escapeHtml(data.ticketNumber)}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: ${c.text}; background: #fff; }
.page { min-height: 297mm; display: flex; flex-direction: column; }
header { background: ${c.brand}; color: #fff; padding: 12mm 18mm 7mm; border-bottom: 1.4mm solid ${c.accent}; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
.mark { display: flex; align-items: center; gap: 4mm; }
.logo { width: 13mm; height: 13mm; border-radius: 3mm; background: #fff; color: ${c.brand}; font-weight: 700; font-size: 20px; display: flex; align-items: center; justify-content: center; }
.brand-name { font-size: 22px; font-weight: 700; }
.soft { color: ${c.brandSoft}; font-size: 11px; }
.ticket { text-align: right; }
.ticket strong { display: block; font-size: 14px; margin: 1.5mm 0; color: #fff; }
.caps { text-transform: uppercase; letter-spacing: 0.08em; font-size: 9.5px; }
h1 { margin: 7mm 0 0; font-size: 28px; }
main { padding: 8mm 18mm 0; flex: 1; }
.card { border: 0.3mm solid ${c.border}; border-radius: 2.5mm; padding: 5mm; }
.hero { background: ${c.surface}; display: flex; justify-content: space-between; align-items: center; }
.label { color: ${c.muted}; font-weight: 700; }
.total { font-size: 32px; font-weight: 700; margin-top: 2mm; }
.right { text-align: right; color: ${c.muted}; font-size: 11px; line-height: 1.6; }
.pill { display: inline-block; background: ${c.success}22; color: ${c.success}; font-weight: 700; border-radius: 99px; padding: 1.6mm 4mm; margin-bottom: 2mm; }
.grid { display: flex; gap: 6mm; margin-top: 6mm; }
.grid .card { flex: 1; }
.section { color: ${c.brand}; font-weight: 700; }
.name { font-size: 14px; font-weight: 700; margin: 2mm 0 1mm; }
.muted { color: ${c.muted}; font-size: 11px; }
.block { margin-top: 6mm; }
table { width: 100%; border-collapse: collapse; margin-top: 2.5mm; font-size: 11.5px; }
td, th { padding: 1.8mm 4mm; }
td:last-child, th:last-child { text-align: right; }
.details tr:nth-child(odd) { background: ${c.surface}; }
.details td:first-child { color: ${c.muted}; }
.details td:last-child { font-weight: 700; }
.breakdown th { background: ${c.brandSoft}; color: ${c.brandDark}; text-align: left; }
.breakdown td { border-bottom: 0.2mm solid ${c.border}; }
.sum { margin-top: 1.5mm; background: ${c.brand}; color: #fff; border-radius: 1.5mm; display: flex; justify-content: space-between; padding: 3mm 4mm; font-weight: 700; font-size: 13px; }
.verify { margin-top: 7mm; background: ${c.surface}; display: flex; justify-content: space-between; align-items: center; gap: 6mm; }
.code { color: ${c.brand}; font-size: 15px; font-weight: 700; letter-spacing: 0.12em; margin-top: 1mm; }
.verify .muted { max-width: 95mm; text-align: right; }
footer { margin: 8mm 18mm; padding-top: 3mm; border-top: 0.3mm solid ${c.border}; display: flex; justify-content: space-between; font-size: 9.5px; color: ${c.muted}; }
footer strong { color: ${c.brand}; }
</style></head>
<body><div class="page">
<header>
  <div class="head">
    <div class="mark"><div class="logo">C</div><div><div class="brand-name">CasasEG</div><div class="soft">${escapeHtml(labels.subtitle)}</div></div></div>
    <div class="ticket soft"><span class="caps">${escapeHtml(labels.ticketNumber)}</span><strong>${escapeHtml(data.ticketNumber)}</strong>${escapeHtml(labels.issuedAt)}: ${date(data.issuedAt)}</div>
  </div>
  <h1>${escapeHtml(labels.documentTitle)}</h1>
</header>
<main>
  <div class="card hero">
    <div><div class="caps label">${escapeHtml(labels.amountPaid)}</div><div class="total">${money(data.total)}</div></div>
    <div class="right"><span class="pill caps">&#10003; ${escapeHtml(labels.paid)}</span><br>${escapeHtml(labels.paidVia.replace('{method}', methodLabel))}<br>${date(data.paidAt)}</div>
  </div>
  <div class="grid">
    <div class="card"><div class="caps section">${escapeHtml(labels.tenant)}</div><div class="name">${orDash(data.tenant.name)}</div><div class="muted">${orDash(data.tenant.email)}</div></div>
    <div class="card"><div class="caps section">${escapeHtml(labels.owner)}</div><div class="name">${orDash(data.owner.name)}</div><div class="muted">${orDash(data.owner.email)}</div></div>
  </div>
  <div class="card block"><div class="caps section">${escapeHtml(labels.property)}</div><div class="name">${orDash(data.property.title)}</div><div class="muted">${orDash(propertyMeta)}</div></div>
  <div class="block"><div class="caps section">${escapeHtml(labels.paymentDetails)}</div>
    <table class="details">${details.map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${value}</td></tr>`).join('')}</table>
  </div>
  <div class="block"><div class="caps section">${escapeHtml(labels.breakdown)}</div>
    <table class="breakdown"><tr><th>${escapeHtml(labels.concept)}</th><th>${escapeHtml(labels.amount)}</th></tr>${data.lines.map((line) => `<tr><td>${escapeHtml(labels.charges[line.key])}</td><td>${money(line.amount)}</td></tr>`).join('')}</table>
    <div class="sum"><span class="caps">${escapeHtml(labels.total)}</span><span>${money(data.total)}</span></div>
  </div>
  <div class="card verify"><div><div class="caps label">${escapeHtml(labels.verificationCode)}</div><div class="code">${escapeHtml(data.verificationCode)}</div></div><div class="muted">${escapeHtml(labels.verificationNote)}</div></div>
</main>
<footer><span>${escapeHtml(labels.footerNote)}</span><strong>casaseg.com</strong></footer>
</div></body></html>`;
}

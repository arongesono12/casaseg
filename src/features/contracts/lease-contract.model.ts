// Modelo de public.lease_contracts compartido con la web (migración 034 de
// CasasEG). Sin React ni Supabase para poder probarlo solo. Las columnas y los
// estados son los del esquema real: no existe `version` (es
// `template_version`) ni un estado único `awaiting_signature`, porque firman
// las dos partes por separado.

export type LeaseContractStatus = 'awaiting_signatures' | 'partially_signed' | 'signed' | 'cancelled';
export type ContractParty = 'owner' | 'client';

export type LeaseContractTerms = {
  durationMonths: number;
  depositAmount: number;
  paymentDay: number;
  paymentMethod: string;
  utilitiesIncluded: string[];
  occupantsAllowed: number;
  petsAllowed: boolean;
  noticeDays: number;
  maintenanceTerms: string;
  houseRules: string;
  inventoryNotes: string;
  additionalClauses: string;
};

export type LeaseContractSnapshot = {
  title: string;
  property: { id: string; title: string; location: string; price: number; currency: string };
  owner: { id: string; name: string; email: string };
  client: { id: string; name: string; email: string };
  agreement: { id: string; agreedPrice: number; currency: string; meetingDate?: string; meetingTime?: string };
  terms: LeaseContractTerms;
  generatedAt: string;
};

export type ContractSignature = { signerName?: string; signerRole?: ContractParty; acceptedAt?: string };

export type LeaseContract = {
  id: string;
  contractNumber: string;
  agreementId: string;
  propertyId: string;
  propertyTitle: string;
  templateVersion: number;
  ownerId: string;
  clientId: string;
  status: LeaseContractStatus;
  snapshot: LeaseContractSnapshot | null;
  contentHash: string;
  ownerSignedAt?: string;
  clientSignedAt?: string;
  ownerSignature?: ContractSignature;
  clientSignature?: ContractSignature;
  signedAt?: string;
  createdAt: string;
};

/** Valores por defecto de la plantilla, idénticos a DEFAULT_LEASE_TERMS de la web. */
export const DEFAULT_LEASE_TERMS: LeaseContractTerms = {
  durationMonths: 12,
  depositAmount: 0,
  paymentDay: 5,
  paymentMethod: 'Transferencia o medio acordado entre las partes',
  utilitiesIncluded: [],
  occupantsAllowed: 1,
  petsAllowed: false,
  noticeDays: 30,
  maintenanceTerms: 'El arrendatario conservara la vivienda en buen estado y comunicara cualquier averia al arrendador.',
  houseRules: 'La vivienda se destinara exclusivamente a residencia y se respetaran las normas de convivencia.',
  inventoryNotes: '',
  additionalClauses: '',
};

export const LEASE_CONTRACT_COLUMNS =
  'id,contract_number,agreement_id,property_id,template_version,owner_id,client_id,status,snapshot,content_hash,owner_signed_at,client_signed_at,owner_signature,client_signature,signed_at,created_at,properties(title)';

export type LeaseContractRow = {
  id: unknown;
  contract_number: unknown;
  agreement_id: unknown;
  property_id: unknown;
  template_version: unknown;
  owner_id: unknown;
  client_id: unknown;
  status: unknown;
  snapshot: unknown;
  content_hash: unknown;
  owner_signed_at: unknown;
  client_signed_at: unknown;
  owner_signature: unknown;
  client_signature: unknown;
  signed_at: unknown;
  created_at: unknown;
  properties?: { title?: unknown } | { title?: unknown }[] | null;
};

const statuses: readonly LeaseContractStatus[] = ['awaiting_signatures', 'partially_signed', 'signed', 'cancelled'];

function isStatus(value: unknown): value is LeaseContractStatus {
  return statuses.includes(value as LeaseContractStatus);
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function mapSignature(value: unknown): ContractSignature | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const role = record.signerRole === 'owner' || record.signerRole === 'client' ? record.signerRole : undefined;
  return { signerName: optionalText(record.signerName), signerRole: role, acceptedAt: optionalText(record.acceptedAt) };
}

function mapSnapshot(value: unknown): LeaseContractSnapshot | null {
  const record = asRecord(value);
  if (!record || !asRecord(record.property) || !asRecord(record.agreement)) return null;
  const snapshot = record as unknown as LeaseContractSnapshot;
  return { ...snapshot, terms: { ...DEFAULT_LEASE_TERMS, ...(asRecord(record.terms) ?? {}) } };
}

export function mapLeaseContract(row: LeaseContractRow): LeaseContract {
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const snapshot = mapSnapshot(row.snapshot);
  const propertyTitle = optionalText(property?.title) ?? snapshot?.property.title ?? 'Propiedad';

  return {
    id: String(row.id),
    contractNumber: String(row.contract_number ?? ''),
    agreementId: String(row.agreement_id ?? ''),
    propertyId: String(row.property_id ?? ''),
    propertyTitle,
    templateVersion: Number(row.template_version) || 1,
    ownerId: String(row.owner_id ?? ''),
    clientId: String(row.client_id ?? ''),
    status: isStatus(row.status) ? row.status : 'awaiting_signatures',
    snapshot,
    contentHash: String(row.content_hash ?? ''),
    ownerSignedAt: optionalText(row.owner_signed_at),
    clientSignedAt: optionalText(row.client_signed_at),
    ownerSignature: mapSignature(row.owner_signature),
    clientSignature: mapSignature(row.client_signature),
    signedAt: optionalText(row.signed_at),
    createdAt: String(row.created_at ?? ''),
  };
}

/** Papel del perfil en el contrato, o null si no es parte. */
export function contractPartyOf(contract: Pick<LeaseContract, 'ownerId' | 'clientId'>, profileId: string | undefined): ContractParty | null {
  if (!profileId) return null;
  if (profileId === contract.ownerId) return 'owner';
  if (profileId === contract.clientId) return 'client';
  return null;
}

/**
 * true si a este perfil le falta su propia firma. sign_lease_contract rechaza
 * la segunda firma de la misma parte; el botón no debe ofrecerla.
 */
export function needsSignatureFrom(contract: LeaseContract, profileId: string | undefined): boolean {
  if (contract.status === 'signed' || contract.status === 'cancelled') return false;
  const party = contractPartyOf(contract, profileId);
  if (party === 'owner') return !contract.ownerSignedAt;
  if (party === 'client') return !contract.clientSignedAt;
  return false;
}

/** El día de pago debe existir en todos los meses. */
const MAX_PAYMENT_DAY = 28;

/** Términos válidos para el snapshot: enteros no negativos, duración y ocupantes positivos. */
export function validLeaseTerms(terms: LeaseContractTerms): boolean {
  const integers = [terms.durationMonths, terms.depositAmount, terms.noticeDays, terms.occupantsAllowed, terms.paymentDay];
  return integers.every((value) => Number.isInteger(value) && value >= 0)
    && terms.durationMonths > 0
    && terms.occupantsAllowed > 0
    && terms.paymentDay >= 1
    && terms.paymentDay <= MAX_PAYMENT_DAY;
}

const MIN_SIGNER_NAME_LENGTH = 3;

/** La base de datos exige un nombre de al menos tres caracteres. */
export function normalizeSignerName(name: string | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (trimmed.length < MIN_SIGNER_NAME_LENGTH) throw new Error('Completa tu nombre en el perfil antes de firmar.');
  return trimmed;
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSignedAt(value: string | undefined) {
  return value ? escapeHtml(new Date(value).toLocaleString('es-ES')) : 'Firma pendiente';
}

/**
 * Documento del contrato generado desde el snapshot inmutable. Es el mismo
 * documento que imprime la web (buildLeaseContractHtml): no hay PDF guardado en
 * Storage, el texto vinculante es el snapshot cuyo hash figura al pie.
 */
export function buildLeaseContractHtml(contract: LeaseContract): string {
  const { snapshot } = contract;
  if (!snapshot) throw new Error('El contrato no tiene contenido generado.');
  const terms = snapshot.terms;
  const currency = escapeHtml(snapshot.agreement.currency);
  const utilities = terms.utilitiesIncluded.length ? terms.utilitiesIncluded.join(', ') : 'Ninguno';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(contract.contractNumber)}</title>
<style>
body{font-family:Arial,sans-serif;color:#111827;line-height:1.55;margin:32px}
h1{text-align:center;font-size:22px;margin-bottom:4px}h2{font-size:15px;margin-top:24px}
.meta{text-align:center;color:#4b5563;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.box{border:1px solid #d1d5db;padding:14px;border-radius:6px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px}
.signature{border-top:1px solid #111827;padding-top:8px;font-size:12px}.hash{word-break:break-all;font-family:monospace;font-size:9px;color:#6b7280;margin-top:32px}
</style></head><body>
<h1>${escapeHtml(snapshot.title)}</h1>
<p class="meta">Contrato ${escapeHtml(contract.contractNumber)} · Version de plantilla ${contract.templateVersion}</p>
<h2>1. Partes</h2>
<div class="grid">
<div class="box"><strong>Arrendador</strong><br>${escapeHtml(snapshot.owner.name)}<br>${escapeHtml(snapshot.owner.email)}</div>
<div class="box"><strong>Arrendatario</strong><br>${escapeHtml(snapshot.client.name)}<br>${escapeHtml(snapshot.client.email)}</div>
</div>
<h2>2. Vivienda</h2>
<p>${escapeHtml(snapshot.property.title)}, ubicada en ${escapeHtml(snapshot.property.location)}.</p>
<h2>3. Condiciones economicas</h2>
<p>Renta acordada: <strong>${escapeHtml(Number(snapshot.agreement.agreedPrice).toLocaleString('es-ES'))} ${currency}</strong>.
Fianza: <strong>${escapeHtml(Number(terms.depositAmount).toLocaleString('es-ES'))} ${currency}</strong>.
Pago antes del dia ${escapeHtml(terms.paymentDay)} mediante ${escapeHtml(terms.paymentMethod)}.</p>
<h2>4. Duracion y terminacion</h2>
<p>Duracion prevista: ${escapeHtml(terms.durationMonths)} meses. Preaviso: ${escapeHtml(terms.noticeDays)} dias.</p>
<h2>5. Uso y ocupacion</h2>
<p>Ocupantes permitidos: ${escapeHtml(terms.occupantsAllowed)}. Mascotas: ${terms.petsAllowed ? 'permitidas' : 'no permitidas'}.
Servicios incluidos: ${escapeHtml(utilities)}.</p>
<h2>6. Conservacion y normas</h2>
<p>${escapeHtml(terms.maintenanceTerms)}</p><p>${escapeHtml(terms.houseRules)}</p>
${terms.inventoryNotes ? `<h2>7. Inventario y estado de entrega</h2><p>${escapeHtml(terms.inventoryNotes)}</p>` : ''}
${terms.additionalClauses ? `<h2>8. Clausulas adicionales</h2><p>${escapeHtml(terms.additionalClauses)}</p>` : ''}
<div class="signatures">
<div class="signature"><strong>Arrendador:</strong> ${escapeHtml(contract.ownerSignature?.signerName || 'Pendiente')}<br>${formatSignedAt(contract.ownerSignedAt)}</div>
<div class="signature"><strong>Arrendatario:</strong> ${escapeHtml(contract.clientSignature?.signerName || 'Pendiente')}<br>${formatSignedAt(contract.clientSignedAt)}</div>
</div>
<p class="hash">SHA-256: ${escapeHtml(contract.contentHash)}</p>
</body></html>`;
}

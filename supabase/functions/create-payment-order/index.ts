import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { toPaymentOrderPayload } from '../_shared/payment-order.ts';
import { requireUser } from '../_shared/supabase.ts';
import { oneOf, optionalText, uuid } from '../_shared/validate.ts';

// Métodos que la base de datos ya conoce; `fondoseg` es el valor por defecto de
// create_rental_payment_order.
const providers = ['fondoseg', 'bank_transfer', 'card'] as const;

Deno.serve(serveJson(async (request) => {
  const { supabase } = await requireUser(request);
  const body = await readJsonObject(request);

  const contractId = uuid(body.contract_id, 'Identificador de contrato');
  const provider = oneOf(body.provider ?? 'fondoseg', 'Método de pago', providers);
  const phoneNumber = optionalText(body.phone_number, 'Teléfono', 30);

  // La clave de idempotencia la genera el cliente una vez por intento de pago:
  // si la petición se reintenta, la base de datos devuelve la misma orden en
  // lugar de cobrar dos veces.
  const idempotencyKey = uuid(body.idempotency_key, 'Clave de idempotencia');

  if (provider === 'fondoseg' && !phoneNumber) {
    throw new RuleError('FondoSeg necesita un número de teléfono para el cobro.', 400);
  }

  // Toda la lógica de importes, contrato y duplicados vive en
  // private.create_rental_payment_order. Aquí solo se autentica y se traduce.
  const { data, error } = await supabase.rpc('create_rental_payment_order', {
    p_contract_id: contractId,
    p_payment_method: provider,
    p_phone_number: phoneNumber || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row) throw new RuleError('El contrato no existe o no admite pagos.', 404);

  return toPaymentOrderPayload(row);
}, 'No se pudo crear la orden de pago.'));

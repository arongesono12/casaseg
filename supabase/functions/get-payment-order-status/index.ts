import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { paymentOrderColumns, toPaymentOrderPayload } from '../_shared/payment-order.ts';
import { requireUser } from '../_shared/supabase.ts';
import { uuid } from '../_shared/validate.ts';

Deno.serve(serveJson(async (request) => {
  const { supabase } = await requireUser(request);
  const body = await readJsonObject(request);

  const orderId = uuid(body.order_id, 'Identificador de orden');

  // RLS decide qué órdenes ve cada usuario: si la consulta no devuelve fila,
  // o no existe o no es suya, y en ambos casos la respuesta debe ser la misma
  // para no revelar la existencia de órdenes ajenas.
  const { data, error } = await supabase
    .from('rental_payment_orders')
    .select(paymentOrderColumns)
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new RuleError('La orden de pago no existe.', 404);

  return toPaymentOrderPayload(data);
}, 'No se pudo consultar el estado del pago.'));

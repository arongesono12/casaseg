import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { oneOf } from '../_shared/validate.ts';

const plans = ['basic', 'professional'] as const;

// Importes en francos CFA, la moneda de Guinea Ecuatorial.
const monthlyPrice: Record<(typeof plans)[number], number> = {
  basic: 0,
  professional: 25_000,
};

Deno.serve(serveJson(async (request) => {
  const { supabase, user } = await requireUser(request);
  const body = await readJsonObject(request);

  const plan = oneOf(body.plan, 'Plan', plans);

  if (plan === 'basic') {
    throw new RuleError('El plan básico no requiere pago.', 400);
  }

  // El proveedor de cobro se configura por entorno. Sin él la función falla de
  // forma explícita en vez de devolver un enlace que no lleva a ninguna parte:
  // un checkout roto silencioso es peor que un error visible.
  const checkoutBaseUrl = Deno.env.get('SUBSCRIPTION_CHECKOUT_URL');
  if (!checkoutBaseUrl) {
    throw new RuleError(
      'El proveedor de cobro no está configurado. Define SUBSCRIPTION_CHECKOUT_URL en las variables de la función.',
      503,
    );
  }

  const { data, error } = await supabase
    .from('subscription_orders')
    .insert({
      user_id: user.id,
      plan,
      amount: monthlyPrice[plan],
      currency: 'XAF',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;

  // El identificador de la orden viaja en la URL para que el retorno del
  // proveedor se pueda casar con la fila que acabamos de crear.
  const checkoutUrl = new URL(checkoutBaseUrl);
  checkoutUrl.searchParams.set('order_id', String(data.id));
  checkoutUrl.searchParams.set('plan', plan);
  checkoutUrl.searchParams.set('amount', String(monthlyPrice[plan]));

  return { checkout_url: checkoutUrl.toString(), order_id: String(data.id) };
}, 'No se pudo iniciar la mejora de plan.'));

-- Cierra las escrituras directas que sustituyen las funciones de
-- 20261007130000_rental_flow_rpcs.
--
-- APLICAR SOLO CUANDO la web y la app Expo desplegadas usen
-- propose/confirm/reject_meeting_agreement y generate_lease_contract: una
-- versión anterior de cualquiera de las dos dejaría de poder crear acuerdos o
-- contratos.
--
-- - agreements: los participantes podían cambiar cualquier columna, incluido el
--   estado. Se retiran sus políticas de INSERT/UPDATE; administración conserva
--   la suya.
-- - lease_contracts: la política de inserción comparaba columnas consigo
--   mismas (agreement.owner_id = agreement.owner_id) y no ataba el contrato a
--   las partes del acuerdo. Los contratos solo se crean con
--   generate_lease_contract.

drop policy if exists "Allow authenticated users to create agreements" on public.agreements;
drop policy if exists "Allow participants to update agreements" on public.agreements;

drop policy if exists "Owners create lease contracts" on public.lease_contracts;
revoke insert on table public.lease_contracts from authenticated;

notify pgrst, 'reload schema';

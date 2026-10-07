# Paridad de backend Expo ↔ web (CasasEG)

**Fecha:** 7 de octubre de 2026. **Base:** `docs/BackendUnit.md` (inventario web), código de este repositorio, código web en `../CasasEG-V1.5` y comprobaciones de solo lectura contra el Supabase compartido (`oxyvtdmlkkirsjntttod`): existencia de tablas, columnas y RPC con la clave publicable (sin ejecutar nada ni leer datos privados) y `supabase functions list`.

Leyenda: **sí** = misma lógica que la web · **parcial** · **divergente** = hace lo mismo por otro camino · **no** = falta · **pendiente de despliegue** = el código ya está corregido pero producción todavía ejecuta la versión anterior.

## 1. Bloqueos y su estado

| # | Hallazgo | Estado |
|---|---|---|
| B1 | Las 16 Edge Functions web que identifican al usuario usaban `supabase.auth.getUser()`, que rechaza el token de Clerk. | **Corregido en `../CasasEG-V1.5`, pendiente de despliegue.** Nuevo `supabase/functions/_shared/caller.ts`: con token de Supabase Auth sigue usando `getUser()` (la web no cambia); con token de Clerk resuelve la identidad con `current_profile()`, exige `status = 'active'` y lee el email de `public.users`. `account-deletion` ya no falla con cuentas que solo existen en Clerk (no tienen fila en `auth.users` que banear). Desplegar las 16 funciones y probar una llamada con cada tipo de token. Si la pasarela rechaza el token de Clerk antes de entrar en la función (`verify_jwt = true`), desplegarlas con `--no-verify-jwt`: el código ya verifica la identidad. |
| B2 | La migración Expo `20260827120000` no está aplicada (`visit_requests`, `subscription_orders`, `lease_contracts.document_path` no existen). | **Ya no hace falta.** Las visitas usan `agreements` y los planes `owner_plans`, como la web. **No aplicar esa migración** (crearía tablas duplicadas y concede `UPDATE` sobre `lease_contracts`); conviene borrar el archivo. |
| B3 | 8 funciones de este repo sin desplegar. | Siete eran duplicados divergentes y se han **eliminado** (`create-visit-request`, `create-payment-order`, `get-payment-order-status`, `sign-contract`, `create-contract-signed-url`, `create-kyc-upload-url`, `create-subscription-checkout`). **Sigue sin desplegar `clerk-user-webhook`:** hay que confirmar cómo se crea el perfil `public.users` de las altas nuevas en Clerk. |
| B4 | Las políticas de `storage.objects` siguen usando `auth.uid()`, que falla con el `sub` de Clerk. | **Sin aplicar.** La migración que las reescribía a `public.app_uid()` (con comprobación por carpeta en `property-images`) no se pudo crear desde esta sesión. Afecta a subidas desde Expo: imágenes, comprobantes bancarios y título de propiedad. |

## 2. Matriz de paridad

### Perfil y cuenta

| Funcionalidad | Móvil | Archivo Expo / nota |
|---|---|---|
| Perfil y rol efectivo desde el servidor | sí | `current_profile()` en `use-profile-id.ts`. |
| Ajustes (tema, idioma) | **sí (corregido)** | `settings.tsx` enviaba el id de Clerk como `user_settings.user_id` (uuid); ahora envía el uuid del perfil. |
| Eliminación diferida de cuenta | **sí, pendiente de despliegue** | `features/account/account-deletion.api.ts` + sección en Ajustes; misma confirmación `ELIMINAR` que la web. Depende de B1. |
| Avatar, portada, redes, privacidad | parcial | Solo nombre, tema e idioma. |

### Catálogo y propiedades

| Funcionalidad | Móvil | Archivo Expo / nota |
|---|---|---|
| Catálogo, filtros, mapa | divergente | Consulta directa a `properties`; la web usa `list_public_active_properties_page` y prioriza destacadas. |
| Favoritos | sí | Tabla `favorites`. |
| Vistas de propiedad | sí | `features/properties/property-views.ts`. |
| Publicar con cupo de plan | **sí, pendiente de despliegue** | `create-property` comprueba `get_owner_entitlements`. |
| Estado inicial / bucket de imágenes | divergente | Expo publica `pending` en `property-images`; la web `active` en `propiedades-images` (D3). |
| Reseñas verificadas | sí | `compliance.api.ts`; convive con la valoración libre de Expo en `reviews` (D4). |
| Seguir propietarios, destacar, beneficios | no aplica | `follows`, `set_property_featured` y `submit_owner_benefit_request` no existen en producción. |

### Visitas, mensajería y contratos

| Funcionalidad | Móvil | Archivo Expo / nota |
|---|---|---|
| Visitas = acuerdos de reunión | **sí (migrado)** | `visit-requests.ts` usa `agreements` como `agreementService` de la web: el cliente propone (`client_confirmed`), el propietario confirma (`fully_confirmed`, requisito del contrato) y cancelar o rechazar guarda `rejected`. Se eliminó "marcar como realizada", que no existe en la web. |
| Chat, no leídos, tiempo real, presencia | sí | `send_chat_message`, `list_my_chats`, `presence.ts`. |
| Correo al propietario ausente | **sí, pendiente de despliegue** | `sendMessage` invoca `notify-message-owner` como la web. Depende de B1. |
| Indicador de escritura | no | Sin canal broadcast en Expo. |
| Contratos: listado, firma, documento | sí | `lease-contract.model.ts`, `sign_lease_contract`, impresión con `expo-print`. |
| Generar contrato desde el acuerdo | no | Requiere leer nombre y email de la otra parte, que la RLS de `users` no permite. Recomendado: RPC de servidor `generate_lease_contract(p_agreement_id)` (necesita migración). |

### Pagos, planes y cumplimiento

| Funcionalidad | Móvil | Archivo Expo / nota |
|---|---|---|
| Pago de alquiler | **sí, pendiente de despliegue** | `rental-payment-initiate` con el contrato de la web. Depende de B1. |
| Transferencia, cuentas de cobro | sí (sin pantalla) | `bank-transfer.api.ts`, `owner-payouts.api.ts`. Subida afectada por B4. |
| Plan y cupo del propietario | **sí (migrado)** | `owner/subscription.tsx` muestra `owner_plans` y `get_owner_entitlements`. Se retiró el checkout propio (`basic/professional`). Como en la web, un propietario no puede cambiar de plan por su cuenta: se dirige a soporte. |
| Solicitud para ser propietario | **sí (migrado)** | `owner/onboarding.tsx` + `owner-upgrade.api.ts`: plan, pago, datos personales, título PDF en `documents`, `record_terms_acceptance` y `owner_upgrade_requests`, con las mismas validaciones que el trigger de la tabla. Accesible para clientes desde Perfil. Solo métodos validados por administración (Muni Dinero, transferencia); Stripe/PayPal quedan fuera hasta decidir la política de las tiendas (D2). Subida afectada por B4. |
| KYC, licencia, parte de viajeros, informe fiscal | pendiente de despliegue / sin pantalla | Funciones web ya compatibles con Clerk tras B1. |
| Panel admin | parcial | Lectura directa limitada; la web usa `admin-users` (compatible tras B1). |
| Push nativo | parcial | Se registran `device_tokens`, pero ningún servidor envía push. |

## 3. Actualización del 7 de octubre (tarde)

Hecho en código, **sin aplicar ni desplegar** en producción:

- `20261007120000_storage_policies_app_uid.sql`: reglas de Storage con `public.app_uid()`. Comprobado contra producción que `auth.uid()` hace `sub::uuid` y falla con Clerk, y que el helper real es `private.has_property_owner_role()`.
- `20261007130000_rental_flow_rpcs.sql`: `propose/confirm/reject_meeting_agreement`, `generate_lease_contract` (snapshot y hash en servidor, idempotente, auditoría y aviso al arrendatario) y `admin_set_property_status`.
- `20261007140000_lock_agreement_and_contract_writes.sql`: retira las escrituras directas en `agreements` y la política de inserción de `lease_contracts`, que en producción compara columnas consigo mismas (`agreement.owner_id = agreement.owner_id`) y no ata el contrato a las partes. **Aplicar solo cuando las dos apps desplegadas usen las funciones nuevas.**
- Web (`../CasasEG-V1.5`): `agreementService` y `leaseContractService.generateLeaseContract` llaman a esas funciones.
- Expo: visitas por RPC, botón "Generar contrato" en Solicitudes, aprobar/suspender viviendas en Admin, comprobante de transferencia en Pagos, cuenta de cobro FondosEG, reseña verificada en Contratos, reseñas verificadas en la ficha (la valoración libre deja de mostrarse; la tabla `reviews` y el componente se conservan), editor de plantilla de contrato y reintento del perfil tras el alta en Clerk.

Detectado en producción: `propiedades-images` tiene políticas que dejan a cualquier usuario autenticado borrar o sustituir cualquier archivo del bucket (`Allow authenticated deletes/updates 1lghmvj_0`, `Users can delete their own property images`). Conviene restringirlas.

## 4. Pasos para producción (en este orden)

1. Aplicar `20261007120000` (Storage) y probar una subida desde Expo.
2. Configurar `CLERK_WEBHOOK_SIGNING_SECRET` y `CLERK_SECRET_KEY`, desplegar `clerk-user-webhook --no-verify-jwt` y registrar el endpoint en Clerk.
3. Aplicar `20261007130000` (funciones del flujo de alquiler).
4. Desplegar las 16 funciones y los servicios de la web, y `create-property` desde aquí.
5. Publicar la app (las builds necesitan recompilarse por `expo-print` y `expo-document-picker`).
6. Con las dos apps ya actualizadas, aplicar `20261007140000`.
7. Configurar los secretos de FondosEG/Ecobank si se van a ofrecer esos métodos: hoy no existen en el proyecto.

## 5. Decisiones pendientes

- **D2 · Cobro en tiendas.** ¿Se ofrece Stripe/PayPal para el plan de propietario dentro de la app? Apple y Google pueden exigir su compra integrada. Por ahora solo métodos validados por administración.
- **D3 · Moderación en la web.** Expo ya aprueba con `admin_set_property_status`; la web sigue publicando `active` directamente y su panel no tiene botón de aprobación. Para unificar: añadir ese botón en la web y publicar en `pending`.

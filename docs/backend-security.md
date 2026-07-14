# Contrato backend móvil de CasaSeg

La aplicación Expo usa el proyecto Supabase existente. No contiene `service_role`, secretos de Stripe, webhooks, Resend, FondosEG, EcoBank ni KYC.

## RLS obligatoria

- `properties`: lectura pública solo para publicaciones activas; escritura limitada a `owner_id = auth.uid()`. El servidor ignora cualquier `owner_id` enviado por el cliente.
- `favorites`, `notifications`, `device_tokens`, `user_settings`: `user_id = auth.uid()`.
- `conversation_participants`, `messages`, `conversation_summaries`: lectura y escritura solo para participantes; el remitente se obtiene de `auth.uid()`.
- `lease_contracts`, snapshots, firmas y documentos: firmantes y administradores autorizados. Un snapshot firmado es inmutable.
- órdenes y transacciones de pago: pagador, beneficiario y roles autorizados. El importe final y el éxito se calculan en servidor.
- KYC: bucket privado y políticas de mínimo privilegio; nunca URLs públicas permanentes.

Los roles administrativos deben resolverse mediante claims no editables o una función `security definer` auditada, nunca mediante un booleano del cliente. Las tablas usadas por filtros, paginación y Realtime deben tener índices por estado, propietario, participantes, fecha y claves foráneas.

## Edge Functions esperadas

- `create-property`: valida MIME real, tamaño, propiedad de los objetos y usa `auth.uid()`.
- `create-payment-order`: calcula importe, exige clave idempotente y crea la intención con secretos del proveedor.
- `get-payment-order-status`: devuelve el estado confirmado por webhook.
- `sign-contract`: exige versión esperada, confirmación, sesión reciente/MFA y registra fecha, firmante, versión e IP cuando aplique.
- `create-contract-signed-url`: URL temporal para PDF privado generado server-side.
- función de push: envía notificaciones desde servidor y genera deep links a chat/propiedad.

Todas deben limitar CORS, aplicar rate limiting, validar JWT, registrar auditoría y verificar webhooks.

## Operaciones sin modo offline

Pagos, firmas, permisos, publicación final, eliminación de cuenta y administración requieren conexión y confirmación del servidor. Explorer, últimas visitas, preferencias y borradores sí pueden persistirse localmente.

# BackendUnit — inventario de lógica compartida entre web y móvil

**Fecha de revisión:** 7 de octubre de 2026. **Alcance:** código de esta copia de CasasEG (React + Vite, cliente Capacitor, Supabase/Postgres/Storage/Realtime/Edge Functions). Este repositorio no contiene un proyecto React Native + Expo; por eso **«Móvil: por comprobar» no significa «falta»**. Tampoco se ha comprobado contra una instancia Supabase desplegada. Las migraciones describen la implementación prevista; hay que confirmar cuáles se aplicaron en el entorno que comparten ambas apps. La migración `075_harden_property_review_eligibility.sql` y varios cambios relacionados figuran como cambios locales sin confirmar en Git en el momento de esta revisión.

> **PUNTO 1 — ACCESO EN EXPO: CLERK.** Según la configuración indicada para la app móvil, **Clerk** gestiona el acceso. La web usa **Supabase Auth**. **No portar a Expo** `src/services/supabase/authService.ts`, el login de `AuthProvider.tsx`, los OTP de acceso, Google OAuth de la web, el almacenamiento de sesión Supabase ni las pantallas de restablecimiento como si fueran el backend compartido. Los métodos de acceso concretos de Expo deben cotejarse con su configuración Clerk. Lo que sí se comparte es la base de datos y la lógica de negocio **una vez resuelta la identidad Clerk ↔ Supabase**. Leer la sección siguiente antes de marcar cualquier casilla de la matriz.

## 1. Acceso e identidad: Clerk en Expo, Supabase Auth en web

| Responsabilidad | Web actual | Expo |
|---|---|---|
| Registro, login, logout, recuperación, Google, email/SMS y MFA de acceso | Supabase Auth, OTP propio y TOTP (`src/services/supabase/authService.ts`, `otpService.ts`, `totpMfaService.ts`; `src/modules/auth/context/AuthProvider.tsx`). | **Clerk**. Cotejar esta experiencia con la configuración de Clerk del proyecto móvil; no implementar estos métodos de Supabase Auth para conseguir paridad visual. |
| Sesión y token | `src/services/supabaseClient.ts` persiste/renueva una sesión de Supabase Auth. | Clerk mantiene la sesión. El cliente Supabase de Expo, si accede directamente a Data API/Storage/Realtime/Functions, necesita presentar un token Clerk aceptado por Supabase mediante la integración de autenticación de terceros. El token de Clerk no se convierte por sí mismo en una sesión de Supabase Auth. |
| Identidad de negocio y permisos | `public.users.id`, claves ajenas y parámetros RPC son UUID; RLS y RPC usan `auth.uid()`; varias EF llaman a `supabase.auth.getUser()` con el bearer recibido. | Resolver explícitamente la correspondencia **Clerk user ID ↔ UUID de `public.users`/`auth.users`** y adaptar permisos, RPC y EF que suponen un usuario de Supabase Auth. Usar el mismo email no demuestra que sean la misma cuenta de negocio. |

### Condición previa para usar el backend compartido desde Expo

La integración oficial permite que Supabase acepte tokens de Clerk como proveedor externo y que el cliente Supabase reciba el token de sesión de Clerk mediante `accessToken`. Esto habilita la verificación del JWT; **no sincroniza automáticamente perfiles ni transforma el `sub` de Clerk en el UUID que espera este esquema**. Las guías oficiales usan el `sub` de Clerk en RLS y explican la configuración de terceros: [Clerk + Supabase](https://clerk.com/docs/guides/development/integrations/databases/supabase) y [Supabase: Clerk como proveedor externo](https://supabase.com/docs/guides/auth/third-party/clerk).

En este repositorio, `auth.uid()` aparece en las migraciones `024`, `050`, `052`, `068` y otras; las tablas de dominio relacionan usuarios mediante UUID. Por ejemplo, `publish_property_if_allowed`, `send_message_transaction`, la creación de reseñas y el borrado de cuenta dependen de esa identidad. EF como `rental-payment-initiate`, `owner-upgrade-stripe-checkout`, `owner-upgrade-paypal-checkout`, `account-deletion`, `admin-users` y `notify-message-owner` llaman a `auth.getUser()` de Supabase. **La integración de terceros por sí sola no prueba compatibilidad de estas funciones existentes.** Hay que revisar y probar cada una antes de asumir que el token Clerk concede el mismo acceso que el JWT de la web.

**Decisión de arquitectura pendiente (no inferible sin el código Expo ni el despliegue):** definir una identidad canónica para ambas apps y una vinculación segura, única y verificable entre la cuenta Clerk y el perfil UUID existente. Después, ajustar en el servidor los RPC/RLS/EF que leen `auth.uid()` o `supabase.auth.getUser()` según esa decisión. No cambiar `users.id` a un ID Clerk de texto ni crear un perfil duplicado por email sin plan de migración de las claves ajenas, contratos, pagos y auditoría.

**Prueba de habilitación:** con la **misma persona** en web y Expo, comprobar que ambos clientes resuelven el **mismo `public.users.id`**, el mismo rol efectivo y los mismos inmuebles/mensajes/contratos; que otro usuario no puede verlos; y que una EF protegida y una carga de Storage funcionan con la identidad móvil. Hasta pasar estas pruebas, las casillas de funciones protegidas de abajo permanecen «por comprobar», aunque Clerk inicie sesión correctamente.

**Checklist obligatorio antes de implementar la matriz en Expo:**

- [ ] Confirmar que Clerk está registrado como proveedor de terceros en el Supabase compartido y que un token Clerk llega al cliente Supabase móvil.
- [ ] Definir y probar la vinculación `Clerk user ID ↔ public.users.id` sin duplicar cuentas por coincidencia de email.
- [ ] Auditar RLS, Storage y RPC que usan `auth.uid()` o esperan UUID; adaptar el servidor donde corresponda.
- [ ] Auditar EF que usan `supabase.auth.getUser()`, incluidos pagos, borrado de cuenta y administración; verificar que autentican y autorizan correctamente al usuario de Clerk.
- [ ] Decidir cómo se reflejan en `public.users` los atributos de verificación de Clerk que la lógica de negocio web consulta; cubrir alta, cambios y eliminación de cuenta.

## Cómo utilizar este documento

1. Aplicar primero el **Punto 1: Clerk y vinculación de identidad**. La matriz compara lógica de negocio; no pide replicar el sistema de acceso web.
2. Anotar junto a cada casilla: `sí / parcial / no`, archivo móvil, prueba realizada y diferencia encontrada.
3. Si una operación escribe datos o dinero, comprobar la respuesta del servidor y el estado persistido. Los estados locales de React no son autoridad.
4. Usar el mismo proyecto Supabase y esquema/migraciones, con una clave pública de cliente y un token aceptado por la configuración de autenticación de ese proyecto. En Expo, ese token procede de Clerk **sólo después de configurar y verificar la integración**. Nunca incorporar `service_role`, secretos de proveedores ni lógica de webhook en la app.

**Leyenda:** `Auth` = Supabase Auth **de la web**; `Clerk` = acceso **de Expo**; `RPC` = función Postgres llamada mediante `supabase.rpc`; `EF` = Supabase Edge Function; `DB` = tabla PostgREST; `Storage` = bucket; `RT` = Supabase Realtime. Las rutas citadas son relativas a la raíz del repositorio.

## Arquitectura y contratos transversales

| Tema | Web comprobada | Qué cotejar en Expo |
|---|---|---|
| Cliente Supabase | `src/services/supabaseClient.ts`: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; sesión Supabase Auth persistida y detectada en URL. | URL y clave pública del **mismo** proyecto; si se usa el SDK Supabase, configurarlo para obtener el token Clerk de la sesión móvil. No copiar `secureAuthStorage`, `detectSessionInUrl` ni el login web. |
| Identidad y autorización | `AuthProvider.tsx` carga el perfil; roles `client`, `owner`, `admin`, `superadmin`. `public.administrators` separa membresía administrativa (`056`, `059`). | Resolver antes la equivalencia Clerk ↔ UUID de perfil. Leer el rol efectivo desde el servidor; RLS/RPC/EF deben validarlo, sin confiar en un rol local de Clerk. |
| Modelo de datos | `src/types/index.ts`; mapeos `snake_case` ↔ `camelCase` en `src/services/supabase/supabaseUtils.ts`. | Compartir o reproducir tipos, enumeraciones, normalización de importes, fechas, imágenes y estados. |
| Seguridad | Políticas RLS y permisos en `supabase/migrations/`; `070` restaura concesiones a `authenticated`; `068` define RPC públicos para web/móvil. Muchas reglas actuales comparan UUID con `auth.uid()`. | Probar cada operación con token Clerk y con `anon`, cliente, propietario, admin y superadmin. La aceptación del token no resuelve por sí sola las comparaciones de identidad ni los `auth.getUser()` de las EF. Varios servicios web convierten errores en listas vacías. |
| Archivos | Buckets `propiedades-images`, `documents`, `bank-transfer-receipts`. | Implementar carga binaria compatible con RN, nombre/ruta y MIME correctos, URL firmada cuando proceda y limpieza tras fallo. |
| Caché/offline | React Query, caché de propiedades/perfil y cola local en `src/services/offlineStorageService.ts`; invalidación tras mutaciones. | Estrategia nativa de caché, aislamiento por usuario y limpieza al cerrar sesión. No repetir ciegamente acciones financieras en cola offline. |
| Tiempo real | Suscripciones a `messages` y `agreements`, difusión de escritura y presencia (`src/modules/messaging/context/MessagingProvider.tsx`). | Reconexión al volver del segundo plano, quitar canales al cambiar de usuario y refrescar al recuperar conexión. |
| Correo | EF `send-email`, `send-otp`, `notify-message-owner`; registros `email_logs`. | Activar desde las mismas operaciones de negocio; las claves y plantillas de envío permanecen en el servidor. |

## 2. Matriz de lógica de negocio: web implementada / móvil por comprobar

Marcar cada casilla después de comparar con el repositorio Expo. Cada referencia identifica el punto de entrada web principal; una misma funcionalidad puede aparecer además en componentes o migraciones.

### Perfil de negocio y verificaciones heredadas

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Perfil de aplicación (`public.users`) y rol efectivo compartidos entre web y Expo; el perfil debe vincularse de forma segura con la identidad Clerk. Altas que piden rol propietario arrancan como cliente hasta completar el proceso autorizado. | RPC `get_current_user_profile`, DB `users`; `src/services/supabase/userService.ts`, `src/modules/auth/context/AuthProvider.tsx`. **Este RPC usa la identidad Supabase actual: revisar según Punto 1.** |
| [ ] | Verificaciones que la web guarda en `users` (`email_verified`, `phone_verified`, `mfa_email_enabled`) cuando sean requisitos de negocio, por ejemplo el ascenso a propietario. Decidir si Clerk proporciona la evidencia equivalente y adaptar el flujo servidor. | Web: RPC `upsert_user_otp`, `consume_user_otp`, `mark_user_email_verified`, EF `send-otp`; `src/services/otpService.ts`, migraciones `021`, `0220`. **No copiar estos OTP como mecanismo de acceso móvil.** |
| [ ] | Edición de nombre, avatar, portada, teléfono, redes y preferencias; privacidad de perfil público, visibilidad de email/teléfono. | DB `users`, `user_settings`; Storage `propiedades-images` para multimedia de perfil; `src/services/supabase/userService.ts`, `storageService.ts`, `src/services/settingsService.ts`, `src/modules/profile/components/ProfileView.tsx`. |
| [ ] | Solicitud de eliminación diferida y recuperación antes de ejecución. | EF `account-deletion`; `src/services/accountDeletionService.ts`; migración `050`. |

### Catálogo, propiedades y relaciones sociales

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Catálogo público de propiedades **activas** con paginación (48 por página en web), prioridad de destacadas/plan, detalle, búsqueda/filtros/mapa. | RPC `list_public_active_properties_page(p_offset,p_limit)` con fallback DB `properties`; `src/services/supabase/propertyService.ts`, `src/modules/properties/context/PropertyProvider.tsx`; migración `068`. Filtros web: `src/hooks/usePropertyFilters.ts`. |
| [ ] | Ficha del propietario y resumen público de usuarios sin exponer correos. | RPC `get_public_platform_summary`; DB `users` según RLS; `src/services/supabase/userService.ts`; migración `068`. |
| [ ] | Guardar/quitar propiedad y favoritos. Revisar si Expo necesita ambos conceptos: `saved_properties` es un **campo que el código espera en `users`**, mientras `favorites` es una tabla. | `src/services/supabase/userService.ts` (`saveProperty`, `unsaveProperty`, `getSavedProperties`); `favoriteService.ts` (`toggleFavorite`, `getUserFavoriteIds`); migración `015`. No se encontró definición de `users.saved_properties` en los SQL versionados. |
| [ ] | Seguir/dejar de seguir propietario y notificar a seguidores al publicar. | El servicio usa DB `follows` y `notifications`: `src/services/supabase/followService.ts`, `propertyService.ts`. No se encontró creación de `follows` en los SQL versionados; confirmar esquema real. |
| [ ] | Conteo de vistas por propiedad y visitante; estadísticas de propietario. | DB `property_views`; `src/services/propertyViewsService.ts`, `src/services/dashboardService.ts`. |
| [ ] | Propietario: crear publicación sólo si servidor permite la cuota; listar propias, editar/suspender y borrar. Al borrar se limpian imágenes y se conserva historial financiero desligando `property_id` de eventos. | RPC `get_owner_entitlements`, `publish_property_if_allowed`; DB `properties`; `src/services/supabase/domainService.ts`, `propertyService.ts`; migraciones `024`, `0251`. |
| [ ] | Imágenes de propiedad: carga, URL pública y borrado de archivos sustituidos. Validación de texto/números; `rating` y `reviewCount` son derivados y no se envían como cambios de propietario. | Storage `propiedades-images`; `src/services/supabase/storageService.ts`, `propertyService.ts`, `supabaseUtils.ts`; `src/utils/validation.ts`. |
| [ ] | Propiedad: categorías, precio por noche/mes/venta, ubicación/coordenadas, características, ocupación, cargos, licencia turística, política de cancelación y destacado. | Modelo `Property` en `src/types/index.ts`; DB `properties`; UI de alta `src/components/property/PropertyUploadModal.tsx`. Verificar qué campos existen en el esquema desplegado. |
| [ ] | Propietario: destacar propiedad respetando cuota y prioridad del plan; solicitud de soporte/beneficios. | RPC `get_owner_plan_capabilities`, `set_property_featured`, `submit_owner_benefit_request`; DB `owner_benefit_requests`; `src/services/supabase/ownerPlanBenefitsService.ts`; migraciones `048`, `055`. |
| [ ] | Reseñas públicas y creación de reseña verificada; la calificación agregada se calcula en DB. | RPC `create_verified_property_review`; DB `property_reviews`, `review_audit_events`; `src/services/supabase/complianceService.ts`; **migración local `075`**. Si se aplica `075`: sólo arrendatario de contrato `signed` con orden de alquiler `completed`, una reseña por estancia; ni propietario ni personal. UI: `src/utils/reviewEligibility.ts`. |

### Mensajes, acuerdos y reuniones

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Conversación cliente–propietario ligada a una propiedad; carga de chats/mensajes y envío con identidad del JWT. | RPC `send_message_transaction` (crea chat/mensaje/notificación de forma transaccional), fallback directo protegido por RLS; DB `chats`, `messages`, `notifications`; `src/services/supabase/domainService.ts`, `messagingService.ts`; migraciones `024`, `063`, `064`. |
| [ ] | Contador de no leídos, leído/entregado con marcas de tiempo, notificación interna y correo al propietario ausente. | DB `messages`, `notifications`, `user_presence`; RPC `set_current_user_presence`; EF `notify-message-owner`; `src/services/supabase/messagingService.ts`, `src/modules/messaging/context/MessagingProvider.tsx`; migración `062`. |
| [ ] | Mensajes y acuerdos en tiempo real, indicador de escritura mediante `broadcast`; presencia se actualiza cada 45 s en web. | RT `messages` filtrado por remitente/destinatario, RT `agreements` por parte, canal de escritura por chat; `MessagingProvider.tsx`. En móvil relacionar presencia con AppState/conexión. |
| [ ] | Propuesta de reunión/precio por cliente o propietario; confirmaciones de ambas partes, rechazo y estados `pending`, `client_confirmed`, `owner_confirmed`, `fully_confirmed`, `rejected`. | DB `agreements`; `src/services/supabase/agreementService.ts`, `src/modules/messaging/context/MessagingProvider.tsx`. Las actualizaciones de estado tienen que respetar RLS. |

### Contratos de arrendamiento

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Plantilla contractual por propiedad, términos y versiones; activar borrador. | DB `lease_contract_templates`; `src/services/supabase/leaseContractService.ts`; migración `034`. |
| [ ] | Generar contrato sólo tras acuerdo `fully_confirmed` y plantilla activa. Se guarda snapshot inmutable, hash SHA-256 y número de contrato; operación idempotente por `agreement_id`. | DB `lease_contracts`, `contract_audit_events`; `src/services/supabase/leaseContractService.ts`. En Expo no copiar datos de UI obsoletos: recargar acuerdo/propiedad/partes antes de generar. |
| [ ] | Firma del propietario y arrendatario, estado de ambas firmas y documento HTML/descarga, con eventos de auditoría. | RPC `sign_lease_contract`; DB `contract_audit_events`; `src/services/supabase/leaseContractService.ts`; migración `034`. El `userAgent` web se sustituye por un identificador de cliente móvil apropiado. |
| [ ] | Listados de contratos de usuario y vistas de administración, paginación/resumen de propietarios. | DB `lease_contracts`; RPC `get_lease_contract_owner_summary`; `leaseContractService.ts`; migraciones `040`, `042`. |

### Pagos de alquiler y liquidaciones

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Iniciar orden de pago **para contrato firmado** y arrendatario autenticado; enviar `contractId`, `paymentMethod`, UUID `idempotencyKey`, aceptación de cargos y cancelación, desglose y opcional teléfono/URL de retorno. | EF `rental-payment-initiate` → RPC `create_rental_payment_order`; DB `rental_payment_orders`; `src/services/supabase/rentalPaymentService.ts`; migraciones `035`, `051`. La respuesta incluye orden, instrucciones/checkout y `requiresRedirect`. |
| [ ] | Consultar órdenes propias/por contrato y mostrar estado real: `pending`, `processing`, `completed`, `failed`, `cancelled`, `expired`. Callback externo actualiza el servidor. | DB `rental_payment_orders`, EF `rental-payment-callback`; `rentalPaymentService.ts`; UI `src/components/payments/RentalPaymentModal.tsx`. Nunca deducir pago completado sólo por volver de un navegador externo. |
| [ ] | Métodos de alquiler admitidos por la lógica de servidor: FondosEG, Muni Dinero, Stripe, transferencia bancaria y Ecobank. `mtn_money` sigue en tipos/datos históricos pero se rechaza para nuevas órdenes; Orange Money se migró a Muni. | EF `rental-payment-initiate`, RPC `create_rental_payment_order`; migraciones `038`, `039`. Confirmar disponibilidad real y configuración de cada proveedor desplegado antes de habilitar botones móviles. |
| [ ] | Transferencia: obtener instrucciones bancarias, subir comprobante PDF/JPG/PNG/WebP ≤10 MB al bucket privado, registrar prueba, consultar estado y abrir URL firmada; admin aprueba/rechaza. | DB `bank_transfer_settings`, `bank_transfer_proofs`; Storage `bank-transfer-receipts`; RPC `submit_bank_transfer_proof`, `save_bank_transfer_settings`; EF `bank-transfer-review`; `src/services/supabase/bankTransferService.ts`; migraciones `037`, `074`. |
| [ ] | Propietario configura cuenta FondosEG/Ecobank; admin verifica/rechaza; se listan y reintentan liquidaciones. | DB `owner_payment_accounts`, `rental_owner_payouts`; RPC `save_owner_fondoseg_account`, `save_owner_ecobank_account`, `review_owner_payment_account`; EF `fondoseg-owner-payout`; `src/services/supabase/ownerPayoutService.ts`; migración `036`. |
| [ ] | Movimientos de cobro/transferencia y conciliación; sincronización externa administrativa. | DB `rental_payment_events`; EF `fondoseg-sync`; `src/services/fondosEgService.ts`; la migración `072` refleja órdenes en eventos. |

### Planes y conversión a propietario

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Ver planes `normal`, `advanced`, `premium`, precios mensual/anual, suscripción/historial, cupo y capacidades; propietario sin plan obtiene nivel gratuito según reglas del servidor. | DB `owner_plans`, `owner_subscriptions`; RPC `get_owner_entitlements`, `get_owner_plan_capabilities`, `can_add_property`, `count_user_properties`, `get_active_subscription`; `src/services/subscriptionService.ts`, `src/services/supabase/domainService.ts`; migraciones `014`, `048`, `066`. |
| [ ] | Solicitar ascenso de cliente a propietario con plan, datos personales, documento y método de pago; evitar duplicar solicitud pendiente y reanudar checkout Stripe/PayPal del mismo proveedor. | DB `owner_upgrade_requests`; `src/services/ownerUpgradeService.ts`, UI `src/components/subscription/OwnerUpgradeForm.tsx`; validación servidor en migraciones `045`, `073`. |
| [ ] | Documento de titularidad: sólo PDF validado, máximo 10 MB, ruta privada y URL firmada temporal. | Storage `documents`; `src/services/ownerDocumentService.ts`; migración `045`. |
| [ ] | Pago de ascenso mediante Stripe, PayPal o Ecobank; cancelación/reanudación donde procede. La confirmación autoritativa de Stripe/PayPal llega por webhook verificado, no por la URL de retorno. | EF `owner-upgrade-stripe-checkout`, `owner-upgrade-stripe-webhook`, `owner-upgrade-paypal-checkout`, `owner-upgrade-paypal-webhook`, `ecobank-billpay`; `src/services/{stripeOwnerUpgradeService,paypalOwnerUpgradeService,ecobankPaymentService}.ts`; migraciones `044`, `049`, `073`. Revisar implicaciones de tiendas móviles antes de exponer compras digitales en Expo. |
| [ ] | Admin lista, aprueba/rechaza solicitudes; usuario puede cancelar; tras verificar email se completa el ascenso y se provisiona suscripción. | RPC `get_pending_upgrade_requests`, `approve_owner_upgrade_request`, `reject_owner_upgrade_request`, `cancel_owner_upgrade_request`, `complete_owner_upgrade_after_verification`; `src/services/ownerUpgradeService.ts`, `src/services/otpService.ts`; migraciones `011`, `046`, `054`, `073`. |
| [ ] | Aceptación de términos y registros de pagos de suscripción. | RPC `record_terms_acceptance`; DB `user_terms_acceptance`, `subscription_payments`; `src/services/subscriptionService.ts`. |

### Cumplimiento, soporte y notificaciones

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Registrar aceptación versionada de términos, privacidad, marketing, cargos, cancelación y parte de viajeros. | RPC `record_compliance_acceptance`; `src/services/supabase/complianceService.ts`; migración `052`. |
| [ ] | Iniciar KYC y consultar resultado; validar licencia turística; enviar parte de viajeros ligado a contrato; exportar informe fiscal CSV/JSON. | EF `compliance-kyc-session`, `compliance-kyc-webhook`, `property-license-verify`, `traveler-report-submit`, `tax-report-export`; `complianceService.ts`; migración `052`. Las integraciones/webhooks quedan en servidor. |
| [ ] | Notificaciones internas: listar, marcar leída y abrir destino por metadatos; alta por eventos de publicación/mensaje/solicitud. | DB `notifications`; `src/services/supabase/notificationService.ts`, `src/components/settings/NotificationsModal.tsx`; migraciones `053`, `054`, `057`. |
| [ ] | Bandeja administrativa de notificaciones: listar, marcar leída y eliminar según rol. | DB `admin_notifications`; `src/components/admin/AdminLayout.tsx`; migraciones `0250`, `053`, `057`. |
| [ ] | Ajustes persistidos: email/push, alertas, privacidad, idioma, tema, moneda, vista y cantidad por página. | DB `user_settings`; `src/services/settingsService.ts`; migraciones `0230`, `028`. Un campo `pushNotifications` es una preferencia; confirmar por separado si existe entrega push nativa. |
| [ ] | Formulario de contacto y correos transaccionales con historial/estadística/reintento administrativo. | EF `contact-form`, `send-email`; DB `email_logs`; RPC `log_email`, `update_email_status`, `get_email_stats`; `src/services/contactService.ts`, `emailService.tsx`; trabajador de entrada `cloudflare/email-worker/`. |

### Paneles de propietario y administración

| Móvil | Funcionalidad y regla web | Backend y referencia web |
|---|---|---|
| [ ] | Panel propietario: propiedades, cupo/plan, vistas, visitantes únicos, contactos, acuerdos, tendencia y actividad. | DB `properties`, `owner_subscriptions`, `chats`, `agreements`, `property_views`; `src/services/dashboardService.ts`; `src/modules/dashboard/owner/pages/OwnerDashboardPage.tsx`. |
| [ ] | Panel admin: métricas y tendencias, propiedades/usuarios, acuerdos, contratos, pagos, correos y solicitudes. Admin ordinario puede tener alcance de propiedades asignadas; superadmin supervisa globalmente. | `src/services/adminService.ts`, `src/services/supabase/adminRentalPaymentService.ts`, componentes `src/components/admin/`; migraciones `0250`–`0331`, `056`–`059`, `067`, `071`. |
| [ ] | Gestión paginada de cuentas y administradores; editar rol/estado, cambiar contraseña y borrar perfil con permisos. | EF `admin-users`, `admin-set-user-password`; RPC de respaldo `list_manageable_platform_accounts`, `list_platform_users`, `list_platform_administrators`, `admin_update_platform_user`, `admin_delete_platform_profile`; `src/services/adminService.ts`. El cambio de contraseña web afecta a Supabase Auth: no es una operación de contraseña Clerk. Borrar perfil público tampoco equivale a borrar la cuenta en Clerk. |
| [ ] | Revisión administrativa de cuentas de cobro, comprobantes, beneficios, alquileres y eventos de auditoría global. | EF `bank-transfer-review`, `fondoseg-owner-payout`; RPC `list_rental_payments_admin`, `get_rental_payments_admin_summary`, `admin_update_owner_benefit_request`; DB `superadmin_audit_events`; `adminService.ts` y servicios específicos. |
| [ ] | Analítica pública de visitas sólo con consentimiento de analítica en web; RPC cuenta visitas y devuelve serie diaria. | RPC `record_public_visit`, `get_public_visit_count`, `get_public_daily_visits`; `src/services/visitService.ts`, migración `068`. La web no registra visitas desde Capacitor; decidir explícitamente la política móvil. La serie web sustituye errores por datos de ejemplo: **no tratar esos valores como métricas reales**. |

## Referencia de operaciones compartidas

### RPC de Postgres invocados desde la web

| Dominio | Nombres usados por el cliente |
|---|---|
| Público | `list_public_active_properties_page`, `get_public_platform_summary`, `record_public_visit`, `get_public_visit_count`, `get_public_daily_visits` |
| Perfil y verificación heredada de la web | `get_current_user_profile`, `mark_google_authenticated_profile_verified`, `upsert_user_otp`, `consume_user_otp`, `mark_user_email_verified`. **Los cuatro últimos no son tareas de login para Expo; revisar si alguna verificación sigue siendo requisito de negocio.** |
| Publicación y plan | `get_owner_entitlements`, `publish_property_if_allowed`, `update_property_as_admin`, `get_owner_plan_capabilities`, `set_property_featured`, `submit_owner_benefit_request`, `admin_update_owner_benefit_request`, `can_add_property`, `count_user_properties`, `get_active_subscription`, `record_terms_acceptance` |
| Mensajería y contratos | `send_message_transaction`, `set_current_user_presence`, `get_lease_contract_owner_summary`, `sign_lease_contract` |
| Alquiler y liquidaciones | `save_bank_transfer_settings`, `submit_bank_transfer_proof`, `save_owner_fondoseg_account`, `save_owner_ecobank_account`, `review_owner_payment_account`, `list_rental_payments_admin`, `get_rental_payments_admin_summary` |
| Conversión a propietario | `get_pending_upgrade_requests`, `approve_owner_upgrade_request`, `reject_owner_upgrade_request`, `cancel_owner_upgrade_request`, `complete_owner_upgrade_after_verification` |
| Cumplimiento/reseñas/correo | `record_compliance_acceptance`, `create_verified_property_review`, `log_email`, `update_email_status`, `get_email_stats` |
| Administración | `list_manageable_platform_accounts`, `list_platform_users`, `list_platform_administrators`, `admin_update_platform_user`, `admin_delete_platform_profile` |

**Nota:** la EF `rental-payment-initiate` llama internamente a `create_rental_payment_order`; Expo debe invocar la EF, no reproducir la conciliación en el dispositivo. Algunos RPC son rutas de respaldo para despliegues antiguos: no activarlas automáticamente en Expo sin comprobar permisos y versión del esquema.

### Edge Functions presentes en el repositorio

| Grupo | Funciones | Uso desde Expo |
|---|---|---|
| Autenticación web y cuenta | `send-otp`, `account-deletion` | `send-otp` pertenece al flujo heredado de verificación web. `account-deletion` se debe revisar para autenticar Clerk y completar también la eliminación en Clerk cuando proceda. |
| Comunicación | `contact-form`, `send-email`, `notify-message-owner` | `notify-message-owner` forma parte del flujo de mensajería; no enviar correos directamente desde Expo. |
| Propietario y pagos de plan | `owner-upgrade-stripe-checkout`, `owner-upgrade-stripe-webhook`, `owner-upgrade-paypal-checkout`, `owner-upgrade-paypal-webhook`, `ecobank-billpay` | Expo inicia checkout cuando proceda; los webhooks los llaman proveedores. |
| Alquiler y cobros | `rental-payment-initiate`, `rental-payment-callback`, `bank-transfer-review`, `fondoseg-owner-payout`, `fondoseg-sync` | Cliente inicia/consulta; callback, revisión y conciliación requieren permisos/eventos adecuados. |
| Cumplimiento | `compliance-kyc-session`, `compliance-kyc-webhook`, `property-license-verify`, `traveler-report-submit`, `tax-report-export` | Expo inicia acciones de usuario; webhooks permanecen servidor. |
| Administración | `admin-users`, `admin-set-user-password` | Sólo con autorización administrativa. |

### Tablas, buckets y eventos clave

| Área | Persistencia |
|---|---|
| Cuentas | Auth `auth.users`; DB `users` (el servicio espera `saved_properties`, pendiente de verificar en esquema), `administrators`, `user_settings`, `user_otp`, `user_presence`, `account_deletion_requests`. |
| Inmuebles y comunidad | DB `properties`, `property_views`, `favorites`, `property_reviews`, `review_audit_events`; servicio de `follows` pendiente de verificar en esquema; Storage `propiedades-images`. |
| Conversación/contrato | DB `chats`, `messages`, `notifications`, `agreements`, `lease_contract_templates`, `lease_contracts`, `contract_audit_events`, `message_email_notifications`; RT `messages`, `agreements`, broadcast de escritura. |
| Planes y ascenso | DB `owner_plans`, `owner_subscriptions`, `owner_upgrade_requests`, `subscription_payments`, `user_terms_acceptance`, `owner_benefit_requests`; Storage `documents`. |
| Pagos de alquiler | DB `rental_payment_orders`, `bank_transfer_settings`, `bank_transfer_proofs`, `owner_payment_accounts`, `rental_owner_payouts`, `rental_payment_events`; Storage `bank-transfer-receipts`. |
| Operación | DB `visits`, `email_logs`, `admin_notifications`, `superadmin_audit_events`, `kyc_verifications`, `property_license_verification_events`, `traveler_reports`, `tax_report_exports`, `compliance_acceptance_events`, `payment_compliance_acceptances`, `rental_license_rules`. |

## Secuencias que conviene probar de punta a punta en las dos apps

1. **Nuevo usuario:** registrar/iniciar sesión con Clerk en Expo → vincular identidad al mismo `public.users.id` de la web → cargar perfil y rol de negocio → guardar preferencias → cerrar sesión en Clerk y limpiar caché → entrar de nuevo sin mostrar datos de otro usuario.
2. **Publicación:** propietario con cupo → subir imágenes → `publish_property_if_allowed` → aparece en catálogo público → seguidores reciben notificación → editar/suspender/borrar y refrescar caché.
3. **Alquiler:** cliente contacta → `send_message_transaction` → notificación/entrega/lectura → propuesta de acuerdo → ambas confirmaciones → plantilla → contrato → ambas firmas → orden de pago idempotente → confirmación del servidor → reseña elegible.
4. **Transferencia bancaria:** crear orden → subir comprobante → RPC registra prueba → admin revisa → cliente/propietario consultan estado → liquidación y evento financiero.
5. **Ascenso de propietario:** solicitud y documento → checkout configurado → webhook confirma pago → admin aprueba/verificación → perfil cambia a `owner` → suscripción y capacidades reales → límite de publicación.
6. **Control de acceso:** intentar operaciones de propietario/admin con cliente, usuario distinto y sesión anónima; confirmar denegación en RLS/RPC/EF y ausencia de datos sensibles en respuestas.

## Puntos de la web que requieren comprobación del esquema

- `followService.ts` consulta/escribe `follows`, pero no aparece una migración o SQL versionado que cree esa tabla. La publicación atrapa errores al avisar seguidores; una publicación exitosa no demuestra que se enviaran esas notificaciones.
- `userService.ts` lee/escribe `users.saved_properties`, pero no aparece una definición versionada de esa columna. La tabla `favorites` sí tiene migración (`015`). Comprobar si ambos mecanismos funcionan realmente antes de copiarlos a Expo.
- `src/components/admin/AdminAnalytics.tsx` consulta `profiles`, mientras la fuente principal de perfiles es `users`; comprobar si ese componente se usa y si la vista/tabla `profiles` existe en producción.
- `visitService.ts` genera una serie aleatoria de ejemplo si falla `get_public_daily_visits`; para la comparación usar el RPC o la tabla real, no esa serie visual.

## Diferencias técnicas específicas para React Native + Expo

- La web también incluye código Capacitor/Android. Eso **no prueba** que el proyecto Expo tenga estas funciones; son clientes móviles distintos.
- Sustituir `window.location.origin`, `File`, `document` y otros usos del navegador en los **flujos de negocio** por equivalentes de Expo. `sessionStorage`, `localStorage` y `SecurityBridge` del acceso web **no forman parte de la implementación Clerk**.
- Configurar los deep links de acceso/recuperación en Clerk según el flujo móvil realmente utilizado. Los retornos de checkout y KYC pertenecen a los proveedores de negocio. Una URL de retorno sólo activa refresco de estado; no confirma dinero ni identidad.
- Dejar el almacenamiento y cierre de sesión de acceso a Clerk. Al cerrar sesión, limpiar también cachés Supabase y canales RT asociados al usuario anterior.
- Las validaciones de pantalla (como disponibilidad de botón de reseña o cuota) mejoran UX; la regla final está en RPC/RLS/EF. Confirmar aplicación de migraciones `068`–`075`, especialmente `075`, antes de declarar paridad.
- Considerar paginación y filtros del servidor para listados grandes; las listas y estadísticas web tienen límites propios y algunos fallbacks silenciosos.

## Estado de la comparación

**Web:** inventariada a partir de código fuente y migraciones locales. **Acceso Expo:** Clerk, según lo indicado; configuración concreta e integración con Supabase por comprobar. **Resto de Expo:** por comprobar al disponer de su repositorio. **Supabase desplegado:** por comprobar con historial de migraciones y pruebas de permisos. Este documento es la base de auditoría; no certifica por sí mismo que una función esté desplegada ni que falte en la app móvil.

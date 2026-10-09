# Alineación móvil ↔ web (9 de octubre de 2026)

## Integrado en Expo

- Catálogo público recomendado con el RPC compartido; preferencias de vista, mapa y paginación.
- Perfil con biografía, enlaces y fotos de avatar/portada; ajustes persistidos en `user_settings`.
- Mensajería con señal de escritura, eventos de encuentro, enlace a acuerdos y actualización en tiempo real.
- Panel de propietario con visitas, contactos, acuerdos y evolución mensual; cuenta Ecobank.
- Solicitud de propietario con cancelación, verificación KYC y activación tras aprobación y correo verificado.
- Parte de viajeros, informe fiscal CSV y contacto con soporte.
- Administración: directorio paginado con búsqueda y filtros.
- Webhook de Clerk: aprovisionamiento del mismo UUID en `auth.users` y `public.users` para altas nuevas verificadas.

## Backend compartido en producción

- El esquema canónico del repositorio web tiene aplicadas `20261008170000_meeting_agreements_in_chat.sql` y `20261009150000_align_web_mobile_backend.sql`. Esta última sustituye las dos migraciones móviles de aceptación de términos y ascenso a propietario; ya no deben aplicarse por separado.
- La migración de encuentros se ejecutó además una segunda vez de forma idempotente mediante la API de administración. El historial contiene la versión adicional `20261009170342`, reflejada con una copia exacta de la migración en el repositorio web.
- Se comprobó en producción la presencia de `record_terms_acceptance`, `complete_owner_upgrade_after_verification`, `list_chat_messages` y `messages.kind`.
- Se desplegaron `admin-users`, `traveler-report-submit`, `tax-report-export` y `compliance-kyc-session` con la resolución de usuarios Clerk y Supabase Auth. `clerk-user-webhook` también figura activo en producción con verificación Svix. La petición de prueba sin firma recibió HTTP 401.
- Están configurados `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` y una clave nueva `TRAVELER_REPORT_AES_256_GCM_KEY`. No había reportes cifrados antes de crearla.

## Verificación funcional pendiente

1. Confirmar en el panel de Clerk que la instancia de producción envía `user.created`, `user.updated` y `user.deleted` a `https://oxyvtdmlkkirsjntttod.supabase.co/functions/v1/clerk-user-webhook`. El CLI disponible no expone la lista de destinos Svix; el endpoint activo y el secreto no demuestran por sí solos esta suscripción.
2. Probar un alta nueva, verificación de correo, `external_id` en Clerk y el mismo UUID en `auth.users` y `public.users` sin crear una cuenta de prueba en producción durante esta verificación.
3. Probar con una sesión Clerk real las políticas de Storage para `avatars/<uuid>/...` y `covers/<uuid>/...`, y la lectura de `property_views`, `chats` y `agreements`.
4. Revisar por separado las migraciones históricas `073`, `074` y `075` del repositorio web antes de aplicarlas: siguen ausentes del historial remoto y no forman parte de la alineación móvil desplegada.

## Diferencias que aún no están cerradas

- La preferencia de moneda se guarda, pero la mayoría de importes móviles siguen mostrando XAF; se necesita el mismo origen de tipos de cambio y formateo que la web.
- Las opciones de privacidad y avisos por correo se guardan, pero su aplicación depende de las consultas y emisores del backend web. Las notificaciones push se registran o revocan desde la app al cambiar la opción.
- La exportación fiscal comparte el texto CSV; aún no crea un archivo descargable en el dispositivo.
- Las acciones administrativas de cambio de rol, estado y eliminación siguen disponibles solo en la web. Su implementación móvil exige primero resolver la autenticación Clerk de `admin-users` y la sincronización de roles con Clerk.
- El registro analítico de visita pública de la web no se ha habilitado en móvil; antes debe añadirse un consentimiento explícito y persistente.

La comprobación de tipos web y las 15 pruebas específicas de mensajería finalizaron correctamente.

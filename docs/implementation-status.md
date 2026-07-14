# Estado de la guía móvil

## Implementado

- Expo Router con Explorer raíz, tabs, Stack y guards por sesión/rol.
- Proveedores globales en el orden solicitado: gestures, safe area, React Query persistido, tema, i18n, auth, notificaciones y bottom sheets.
- Sistema visual claro/oscuro, gradiente, radios y targets táctiles.
- Explorer de una columna, filtros RHF/Zod, categorías hápticas y estados loading/error/empty.
- Tarjeta 4:3 con `expo-image`, caché, placeholder, fallback, favorito, badge, contador y dots.
- Detalle, galería, CTA contextual, propietario, servicios, legalidad, mapa y solicitud de visita.
- Mapa nativo, cluster básico, selección, ubicación contextual y degradación sin permiso.
- Supabase Auth, contraseña, registro, OTP, OAuth, recuperación, deep links y persistencia SQLite.
- React Query por dominio, cancelación, paginación de 20, favorito optimista con rollback y caché offline.
- Conversaciones, chat, una suscripción Realtime de resumen y una por conversación activa.
- Push token por dispositivo, deep links y revocación al cerrar sesión.
- Onboarding propietario y publicación multipaso; compresión, validación, concurrencia y limpieza de imágenes.
- KYC directo a bucket privado mediante signed upload, sin guardar el documento en el borrador.
- Contratos, PDF temporal, firma server-side/MFA; pagos y suscripciones mediante Edge Functions/checkout.
- Configuración Expo, permisos, privacy manifest, EAS, `.env.example`, pruebas Bun y flujos Maestro.
- TypeScript y ESLint sin errores.

## Requiere infraestructura o credenciales externas

- Aplicar/verificar RLS, índices, RPC, buckets privados, Edge Functions, webhooks, rate limits y auditoría en el proyecto Supabase existente.
- Completar IDs/keys de Supabase, Google Maps, Stripe, Sentry y EAS.
- Vincular EAS, credenciales Apple/Google, canales y publicación en stores.
- Ejecutar pagos sandbox, push físico, OAuth y MFA contra proveedores reales.
- Ejecutar Maestro en emuladores/dispositivos y la matriz visual completa.

## Limitaciones de verificación de este entorno

`npx tsc --noEmit` y ESLint pasan. La ejecución de `bun test` fue bloqueada por el límite de aprobación del entorno. Metro/Expo Web tampoco completó su reconstrucción de caché dentro del tiempo disponible, por lo que no se afirma una QA visual renderizada. Los flujos y pruebas quedan listos para ejecutarse localmente o en CI.

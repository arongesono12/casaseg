# Puesta en marcha de CasaSeg móvil

## Variables

Copiar `.env.example` a `.env.local` y completar solo claves publicables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Nunca añadir secretos de service role, Stripe, webhooks, correo, bancos, KYC o proveedores de pago a variables `EXPO_PUBLIC_*`.

## Comandos

```text
bun install
bun run typecheck
bun run lint
bun test
bun run android
```

Para EAS, iniciar sesión y vincular el proyecto antes del primer build:

```text
npx eas-cli@latest init
eas build:configure
eas build --profile development --platform android
eas build --profile preview --platform all
```

## Backend existente requerido

El cliente espera las tablas/vistas `properties`, `favorites`, `conversation_summaries`, `messages`, `notifications`, `device_tokens`, `user_settings`, `visit_requests`, `lease_contracts` y `rental_payment_orders`. Sus nombres deben adaptarse si el proyecto Supabase existente usa otros contratos.

Edge Functions esperadas:

- `create-property`, `update-property`, `create-visit-request`
- `create-kyc-upload-url`
- `create-payment-order`, `get-payment-order-status`
- `create-subscription-checkout`
- `sign-contract`, `create-contract-signed-url`
- envío push server-side

Revisar [backend-security.md](./backend-security.md) antes de conectar datos reales.

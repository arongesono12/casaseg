# Puesta en marcha de CasaSeg móvil

## Variables

Copiar `.env.example` a `.env.local` y completar solo claves publicables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (Clerk Dashboard → API keys → Publishable key)
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
bun run start
```

El arranque utiliza directamente Expo CLI. `bun run start` selecciona explícitamente
Expo Go y genera enlaces `exp://`, compatibles con su QR. Instalar una versión de
Expo Go compatible con SDK 57. El teléfono y el ordenador deben estar en la misma red.
Sin la clave publicable de Clerk, el desarrollo abre las pantallas públicas como
visitante; el acceso y las áreas privadas permanecen deshabilitados.

```text
bun run start:clear       # Expo Go, limpiando caché
bun run start:tunnel      # Expo Go cuando la red local no permite conectar
bun run android          # Expo Go en Android conectado/emulador
bun run web              # Navegador
```

En iPhone, escanear el QR con la Cámara de iOS. En Android, utilizar el lector de
Expo Go. No usar el QR de `start:dev` en Expo Go. El túnel puede solicitar instalar
`@expo/ngrok` la primera vez. El modo `start:offline` utiliza localhost y sirve para
pruebas locales; no es el comando habitual para un teléfono en la red Wi-Fi.

En un iPhone físico, iniciar sesión con la misma cuenta Expo en Expo Go y en el
ordenador con `npx expo login`. Es un requisito de Expo Go para abrir proyectos
servidos desde el entorno de desarrollo.

Metro sirve el código JavaScript; no compila ni instala la app.

Para compilar e instalar por primera vez en Android, disponer de Android Studio con
el SDK instalado y un emulador encendido o un teléfono conectado con depuración USB:

```text
bun run android:native
```

En los siguientes arranques, `bun run android:dev` inicia Metro y abre el cliente
nativo ya instalado. `bun run start:dev` muestra su QR. Los módulos nativos propios
requieren ese cliente: Expo Go utiliza OAuth por navegador
y no registra notificaciones push remotas. Expo UI está incluido en Expo Go desde
SDK 56 y los formularios nativos utilizan su API estable en SDK 57.
Para iOS, la compilación local requiere macOS y Xcode 26.4 o posterior;
desde Windows, utilizar EAS y un dispositivo iOS físico.

Después de actualizar el SDK, recompilar el cliente nativo instalado. Los clientes
compilados con SDK 54 no pueden ejecutar el runtime de SDK 57. Los proyectos nativos
generados localmente se regeneran con `npx expo prebuild --platform android`;
SDK 57 limpia esos directorios por defecto. Guardar antes cualquier cambio nativo manual.

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

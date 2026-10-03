# Colores y degradados de CasaSeg

Estado actual del código (octubre 2026). La fuente única es
[`src/constants/brand.ts`](../src/constants/brand.ts), reexportada desde
`src/constants/theme.ts`. Todo deriva de los azules del logo
(`public/logo/logo.svg`). `tests/unit/brand-palette.test.ts` comprueba los contrastes.

## 1. Colores del logo (`brand.logo`)

| Token      | Hex       | Uso |
|------------|-----------|-----|
| `deep`     | `#1D66A3` | Color de acción: botones, enlaces, selección. Único azul del logo que admite texto blanco encima (6:1). |
| `mid`      | `#2898D1` | Azul de apoyo: iconos secundarios, alias `primary` y `accent`. |
| `sky`      | `#36A9E1` | Solo decoración. No sirve para texto ni iconos sobre blanco (2,6:1). |
| `cyan`     | `#009FE3` | Degradado del logo SVG. |
| `graphite` | `#3C3F3F` | Gris del logo; color del texto principal. |

## 2. Escala de azules (`brand.blue`)

| Paso | Hex       | Paso | Hex       |
|------|-----------|------|-----------|
| 50   | `#F3F9FD` | 500  | `#2382BC` |
| 100  | `#EBF6FC` | 600  | `#1D66A3` (= `deep`) |
| 200  | `#CFE8F6` | 700  | `#164D7A` |
| 300  | `#8FCBEE` | 800  | `#113B5E` |
| 400  | `#5CB8EA` | 900  | `#0D2E49` |

## 3. Neutros (`brand.neutral`)

| Paso | Hex       | Paso | Hex       |
|------|-----------|------|-----------|
| 0    | `#FFFFFF` | 400  | `#7A8084` |
| 50   | `#F7FAFC` | 500  | `#61676A` |
| 100  | `#EDF3F8` | 700  | `#3C3F3F` |
| 200  | `#DCE5EC` | 900  | `#1F2224` |

## 4. Base del modo oscuro (`brand.dark`)

| Token           | Hex       |
|-----------------|-----------|
| `background`    | `#0B131B` |
| `surface`       | `#121C26` |
| `elevated`      | `#1A2733` |
| `text`          | `#F2F6F9` |
| `textSecondary` | `#B6C3CE` |
| `muted`         | `#7F8D99` |

## 5. Colores semánticos (`colors`)

| Token               | Valor                    | Origen / uso |
|---------------------|--------------------------|--------------|
| `brand`             | `#1D66A3`                | `logo.deep` |
| `brandDark`         | `#164D7A`                | `blue.700` |
| `primary`           | `#2898D1`                | `logo.mid` |
| `brandSoft`         | `#EBF6FC`                | `blue.100` |
| `accent`            | `#2898D1`                | alias de confianza (verificado, disponible) |
| `accentDark`        | `#1D66A3`                | |
| `accentSoft`        | `#EBF6FC`                | |
| `onBrand`           | `#FFFFFF`                | texto sobre superficies de marca |
| `onBrandMuted`      | `#EBF6FC`                | |
| `background`        | `#F7FAFC`                | `neutral.50` |
| `surface`           | `#FFFFFF`                | `neutral.0` |
| `subtle`            | `#EDF3F8`                | `neutral.100` |
| `text`              | `#3C3F3F`                | `logo.graphite` |
| `textSecondary`     | `#61676A`                | `neutral.500` |
| `muted`             | `#7A8084`                | `neutral.400` |
| `border`            | `rgba(60,63,63,0.14)`    | |
| `darkBackground`    | `#0B131B`                | |
| `darkSurface`       | `#121C26`                | |
| `darkElevated`      | `#1A2733`                | |
| `darkText`          | `#F2F6F9`                | |
| `darkTextSecondary` | `#B6C3CE`                | |
| `darkBorder`        | `rgba(255,255,255,0.12)` | |
| `success`           | `#059669`                | estado correcto, disponible |
| `warning`           | `#F59E0B`                | ocupada, pendiente, estrellas |
| `error`             | `#EF4444`                | errores, insignias de no leídos |
| `favorite`          | `#F43F5E`                | corazón de favoritos |

## 6. Paletas por tema (`AppPalette`)

Las pantallas usan `palette` desde `useAppTheme()`, no `colors` directamente.

| Clave           | Claro (`lightPalette`) | Oscuro (`darkPalette`)   |
|-----------------|------------------------|--------------------------|
| `background`    | `#F7FAFC`              | `#0B131B`                |
| `surface`       | `#FFFFFF`              | `#121C26`                |
| `elevated`      | `#FFFFFF`              | `#1A2733`                |
| `subtle`        | `#EDF3F8`              | `#1A2733`                |
| `text`          | `#3C3F3F`              | `#F2F6F9`                |
| `textSecondary` | `#61676A`              | `#B6C3CE`                |
| `muted`         | `#7A8084`              | `#7F8D99`                |
| `border`        | `rgba(60,63,63,0.14)`  | `rgba(255,255,255,0.12)` |
| `brand`         | `#1D66A3`              | `#1D66A3`                |
| `primary`       | `#2898D1`              | `#5CB8EA`                |
| `brandText`     | `#1D66A3`              | `#5CB8EA` (el azul de acción no se lee en oscuro) |
| `brandIcon`     | `#1D66A3`              | `#5CB8EA`                |
| `brandSoft`     | `#EBF6FC`              | `rgba(54,169,225,0.16)`  |

## 7. Degradados

### De marca (`brand.ts`)

| Nombre            | Colores | Dónde se usa |
|-------------------|---------|--------------|
| `actionGradient`  | `#1D66A3` → `#2382BC` | Botones principales, pestaña activa en Android, CTA del detalle, filtros, menú, mapa, chat, perfil, panel de propietario, onboarding. |
| `brandGradient`   | alias de `actionGradient` | |
| `exploreGradient` | alias de `actionGradient` | Botón de mapa en Explorar. |
| `heroGradient`    | `#0D2E49` → `#113B5E` → `#1D66A3` | Cabeceras grandes (`PremiumHero`), suscripción, panel de administración. |
| `brandGlow`       | `rgba(54,169,225,0.22)` (color, no degradado) | Brillos decorativos sin texto. |

Todos los degradados de marca empiezan en `deep`. El de acción termina en
`blue.500` y no en `mid` para que la etiqueta blanca centrada mantenga 4,5:1.

### Onboarding (`src/app/onboarding/index.tsx`)

| Nombre               | Claro | Oscuro |
|----------------------|-------|--------|
| `backgroundGradient` | `#EBF6FC` → `#F7FAFC` → `#CFE8F6` | `#0B131B` → `#121C26` → `#0D2E49` |
| `splashGradient`     | `#F3F9FD` → `#F7FAFC` → `#EBF6FC` | `#0B131B` → `#121C26` → `#0D2E49` |
| `finalGradient`      | `#CFE8F6` → `#EBF6FC` → `#F3F9FD` | `#0D2E49` → `#1A2733` → `#121C26` |
| `artworkOverlay`     | transparente → transparente → `blue.200` al 74 % (paradas 0 / 0,88 / 1) | `background` 28 % → `surface` 62 % → `blue.900` 94 % (paradas 0 / 0,7 / 1) |

### Sombreados sobre fotos y superficies

| Dónde | Colores |
|-------|---------|
| Tarjeta de propiedad (parte inferior de la imagen) | `transparent` → `rgba(15,23,42,0.42)` |
| Detalle de vivienda (parte superior, tras los botones) | `rgba(15,23,42,0.42)` → `transparent` |
| `PremiumHero` (brillo) | `brand` al 16 % → `sky` al 6 % |

## 8. Colores fuera del sistema

Valores escritos a mano que no salen de `brand.ts`. Conviene pasarlos a tokens.

| Archivo | Valor | Uso |
|---------|-------|-----|
| `src/app/(tabs)/messages.tsx` | `#334155` → `#64748B` | Degradado del avatar de conversaciones leídas (gris pizarra, ajeno a la marca). |
| `src/app/(tabs)/profile.tsx`, `src/app/owner/index.tsx` | `#D97706` | Icono y tono de Pagos. |
| `src/app/owner/subscription.tsx` | `#FDE68A` | Corona y etiqueta "recomendado". |
| `src/app/(tabs)/_layout.android.tsx` | `#171A21` / `#FFFFFF` | Fondo de la barra de pestañas (el oscuro no coincide con `dark.surface`). |
| `src/components/network-status-banner.tsx` | `#3A2600` | Banner sin conexión. |
| `src/components/property/property-gallery.tsx` | `#050505` | Fondo de la galería a pantalla completa. |
| Varios (tarjeta, detalle, contadores) | `rgba(15,23,42,…)` | Sombras y velos en azul pizarra, no en `graphite`. |
| `src/components/google-auth-button.tsx` | colores de Google | Logo oficial; deben quedarse así. |

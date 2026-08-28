# CasaSeg v2 — Plan de rediseño

> Estado: **Fase 1 construida en Figma; Fases 2–3 bloqueadas por cupo**. Redactado el
> 2026-08-27 a partir de una auditoría del código en `main` (commit `231cc62`); las
> medidas de [§1](#1-punto-de-partida-medido-no-estimado) son de ese commit y no se han
> vuelto a tomar. De las fases 1–5 no se ha ejecutado nada todavía; lo único llevado al
> código es la decisión de color de [§2](#2-el-color-de-acción-es-el-azul), aplicada el
> 2026-08-28. Ver [§6 Estado de entrega](#6-estado-de-entrega).

## Alcance

Rediseño de **layout, jerarquía y sistema de componentes**. La paleta azul/teal de
[`src/constants/theme.ts`](../src/constants/theme.ts) se mantiene: esto **no es un
repintado** — lo que cambió fue el reparto de roles entre esos dos colores
([§2](#2-el-color-de-acción-es-el-azul)), no la paleta. El problema de CasaSeg hoy no es
el color, es que no hay una capa de tokens viva ni un kit de componentes único, y cada
pantalla reinventa sus propias reglas.

### Nota sobre Figma

El archivo `ir3ixk7OuBZuSBTTootGrE` llegó **vacío** a esta auditoría: una sola página sin
contenido. El JSON `.codex/design-system-state-casaseg-v2.json` marcaba `P0.a`–`P0.f` como
completados con el bloque `entities` vacío, es decir, una corrida anterior registró estado
sin llegar a escribir nada.

Sobre ese archivo vacío se construyó después la **Fase 1** (tokens, estilos y página
Foundations), detallada en [§6](#6-estado-de-entrega). El asiento _View_ sí permite
escribir vía MCP — lo que no permite es hacerlo muchas veces: el cupo de 20 llamadas
mensuales se agotó durante esa misma fase.

---

## 1. Punto de partida (medido, no estimado)

| Señal                           | Medida                                      | Lectura                                                                            |
| ------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Colores hex literales en `.tsx` | **133 apariciones, 70 valores únicos**      | El tema define 23 colores. Hay 3× más colores sueltos que tokens.                  |
| Adopción de `spacing`           | **0 archivos**                              | El token existe y se exporta desde `theme.ts`. Nadie lo importa. Es código muerto. |
| `padding`/`margin` literales    | **239**                                     | Todo el espaciado es ad-hoc.                                                       |
| Adopción de `radius`            | 36 archivos                                 | Único token con tracción real.                                                     |
| `borderRadius` literales        | 59                                          | Aun con `radius` adoptado, se sigue escapando.                                     |
| Tamaños de fuente distintos     | **21** (de 10 a 31 px)                      | No hay escala tipográfica. `theme.ts` no define ninguna.                           |
| `fontWeight: '900'`             | **81 usos** (de 163 pesos totales)          | Casi todo está en el peso máximo. El grosor ya no comunica jerarquía.              |
| Bloques `StyleSheet.create`     | 50                                          |                                                                                    |
| Archivos con `useAppTheme`      | 43 de 72 `.tsx`                             | 29 archivos no reaccionan al tema.                                                 |
| Pantallas con shell compartido  | 21 usan `RouteScreen`, **9 montan el suyo** | Las 9 propias son las de más tráfico.                                              |

### Los dos archivos que concentran la deuda

- [`src/app/property/[id].tsx`](../src/app/property/[id].tsx) — **1652 líneas**, 94 entradas
  de estilo, y **13 componentes definidos en local**: `HeroSlide`, `ScreenState`,
  `PropertyNavigation`, `HeaderAction`, `Badge`, `TrustRow`, `Section`, `InfoRow`,
  `PriceRow`, `ReservationCard`, `PrimaryButton`, `SecondaryButton`.
- [`src/app/onboarding/index.tsx`](../src/app/onboarding/index.tsx) — **1115 líneas**, ~14
  componentes locales y **su propio sistema de tema** (`useOnboardingTheme`,
  `onboardingThemes`), paralelo al `ThemeProvider` global. Concentra **65** de los 133 hex
  del proyecto.

### La señal más clara

`property/[id].tsx` declara su propia escala de espaciado en la línea 61, con este
comentario:

> Escala de espaciado de la pantalla. Declararla una vez evita que cada bloque invente su
> propio margen, que era el origen del desorden visual.

El diagnóstico es exacto — pero la solución se aplicó **dentro de una pantalla** mientras
`spacing` seguía sin usarse en `theme.ts`. Y sus valores (`gutter: 16`, `band: 20`,
`bandLarge: 24`) son _literalmente_ `spacing.lg`, `spacing.xl` y `spacing.xxl`. Adoptar el
token aquí es un renombrado, no un rediseño.

---

## 2. El color de acción es el azul

Hasta el 2026-08-28 **competían tres identidades de marca**, y ningún rediseño de jerarquía
funciona sin un color de acción único:

| Rol              | Valor                         | Dónde mandaba                                   |
| ---------------- | ----------------------------- | ----------------------------------------------- |
| `colors.brand`   | `#2563EB` azul                | `MetricCard`, `StatusPill`, `PremiumEmptyState` |
| `actionGradient` | `#0F766E → #0369A1` teal→azul | `PremiumButton` primario, botones locales       |
| `colors.accent`  | `#14B8A6` teal                | Tint y selección de las tabs nativas            |

Un botón primario, una métrica y la tab activa decían "marca" con tres colores distintos.

**Resuelto a favor del azul.** `colors.brand` (`#2563EB`) es el color de acción y el
dominante de la interfaz. El teal baja a secundario y **semántico**: solo marca confianza y
disponibilidad, nunca una acción. Ya está aplicado en el código:

| Pieza                                 | Antes                         | Ahora                         |
| ------------------------------------- | ----------------------------- | ----------------------------- |
| `actionGradient`                      | `#0F766E → #0369A1`           | `#2563EB → #0E7490`           |
| `PremiumHero`                         | `#0B2F3A → #0F4C5C → #0F766E` | `#0B2545 → #0F3F7A → #1D4ED8` |
| Tabs (iOS, Android, web)              | `colors.accent`               | `colors.brand`                |
| Selección y foco (chips, `FormField`) | `accent` / `accentSoft`       | `brand` / `brandSoft`         |
| Onboarding                            | lavados y acento teal         | lavados y acento azul         |

Las dos primeras filas explican por qué el verde se percibía como dominante aunque el azul
apareciese en más sitios: un degradado se lee desde su inicio, así que mientras
`actionGradient` arrancara en teal **todo botón de marca empezaba en verde**; y
`PremiumHero` — que sale en Guardados, Mensajes y todas las `RouteScreen` — era la mayor
superficie teal de la app.

`colors.brandSoft` (`#EFF6FF`) es un token nuevo: no existía un equivalente azul de
`accentSoft` para los fondos de selección y foco.

El teal sobrevive únicamente en el bloque de confianza de `property/[id].tsx` — píldora
*disponible*, insignia de verificado, `ShieldCheck`, `MapPin`, `Clock`, `HomeCheck` y
comodidades: **11 usos, todos con significado**, ninguno decorativo.

Sigue pendiente añadir a `AppPalette`, que hoy no los tiene: `onBrand`, `scrim`,
`successSurface`, `warningSurface`, `errorSurface`. Sin ellos, cada pantalla sigue
construyendo a mano opacidades sobre el tono (el patrón `tone + "14"` está repetido por todo
`premium.tsx`).

---

## 3. Fases

Cada fase es independiente y deja la app funcionando. El orden importa: la 1 desbloquea
todas las demás.

### Fase 1 — Capa de tokens (base de todo)

1. **Escala tipográfica en `theme.ts`.** Hoy no existe. 21 tamaños → 7 niveles:

   | Token        | Tamaño/línea | Peso | Uso                  |
   | ------------ | ------------ | ---- | -------------------- |
   | `display`    | 30/35        | 800  | Título de hero       |
   | `title`      | 24/30        | 800  | Cabecera de pantalla |
   | `heading`    | 20/26        | 700  | `SectionTitle`       |
   | `subheading` | 17/23        | 700  | Cabecera de tarjeta  |
   | `body`       | 15/22        | 500  | Texto corrido        |
   | `bodySmall`  | 13/18        | 500  | Secundario           |
   | `caption`    | 11/14        | 700  | Pills, etiquetas     |

   El cambio de fondo: **bajar el peso por defecto**. Con `900` en 81 sitios el grosor no
   distingue nada; la jerarquía pasa a apoyarse en tamaño y color, y `800` se reserva para
   display y title.

2. **Adoptar `spacing`** en los 239 literales, empezando por `property/[id].tsx` (mapeo 1:1
   ya identificado).
3. **Consolidar los 70 colores únicos** contra el tema; los que sobrevivan entran como
   token semántico o se eliminan.
4. **Absorber `onboardingThemes`** en el `ThemeProvider` global.

### Fase 2 — Kit de componentes único

El kit vive en [`src/components/ui/premium.tsx`](../src/components/ui/premium.tsx) y ya
cubre `PremiumHero`, `PremiumButton`, `PremiumEmptyState`, `PremiumErrorState`,
`SectionTitle`, `MetricCard`, `StatusPill`, `IconTile`, `SurfaceCard`.

- **Renombrar el prefijo `Premium*`.** Colisiona con el concepto de producto _premium_
  (existe `owner/subscription.tsx`): `PremiumButton` no es "el botón de la suscripción".
  Pasar a `ui/` sin prefijo (`Button`, `Hero`, `EmptyState`…).
- **Eliminar duplicados.** `PrimaryButton` existe **tres veces**: el kit,
  `property/[id].tsx:1205` y `onboarding/index.tsx:281`. Los dos locales se borran.
- **Promover al kit** desde `property/[id].tsx`: `Badge`, `Section`, `InfoRow`, `PriceRow`,
  `TrustRow`, `HeaderAction`, `ScreenState`.
- **Unificar separadores**: hay 4 implementaciones (`PropertySeparator` ×2,
  `ListSeparator`, `NotificationSeparator`) → una sola.

### Fase 3 — Shell y navegación

`RouteScreen` cubre 21 pantallas, pero **impone `PremiumHero` + `ScrollView`**. Por eso las
9 pantallas de más tráfico (explore, property, login, register, messages, saved, chat, map,
notifications) se lo saltan: una lista necesita `FlatList` y un detalle inmersivo no quiere
hero.

Forzarlas a `RouteScreen` sería el error. La solución es **descomponerlo** en piezas
combinables:

- `Screen` — safe area + fondo del tema
- `ScreenHeader` — botón atrás + título (hero opcional)
- `ScreenScroll` / `ScreenList` — el contenedor que toque

`RouteScreen` se mantiene como composición de las tres, para no tocar las 21 pantallas que
ya funcionan.

### Fase 4 — Las dos pantallas grandes

Con las fases 1–3 hechas, `property/[id].tsx` y `onboarding/index.tsx` se reescriben
consumiendo el kit. La mayor parte de sus líneas son componentes y estilos que para
entonces ya viven fuera.

### Fase 5 — Modo oscuro y accesibilidad

- Los **29 archivos sin `useAppTheme`** son el inventario de fallos de modo oscuro.
  Prioridad: `property-gallery`, `google-auth-button`, `network-status-banner`,
  `user-avatar`, `casaseg-logo`.
- Accesibilidad: 154 atributos para 89 pulsables — cobertura aparentemente buena, pero hay
  que verificar `accessibilityState` en los que cambian de estado, y el contraste de los
  textos sobre gradiente (`#DBEAFE` sobre azul en `PremiumHero`).

---

## 4. Riesgos y puntos abiertos

- **Onboarding forzado.** [`src/app/index.tsx`](../src/app/index.tsx) tiene
  `FORZAR_ONBOARDING_AL_ARRANCAR = true`, así que la app arranca siempre en onboarding. Es
  una ayuda de desarrollo y hay que ponerlo en `false` antes de publicar; conviene
  revertirlo al cerrar la fase 4, que es justo la que toca esa pantalla.
- **Sin tests visuales.** No hay snapshots ni pruebas de UI: el único control tras cada fase
  es `bun test`, `expo lint` y `tsc --noEmit`. Un rediseño de este tamaño sin red visual
  conviene hacerlo pantalla a pantalla, no en un único PR.
- **Rama sucia.** Hay una migración de auth (Clerk/OAuth) sin commitear. El rediseño debería
  empezar sobre un árbol limpio para no mezclar dos refactors.
- **`.codex/design-system-state-casaseg-v2.json`** afirma un progreso que no existe. O se
  borra o se resetea, para que nadie lo lea como estado real.

## 5. Orden sugerido

Fase 1 primero y completa — es la que convierte el resto en trabajo mecánico. Las fases 2 y
3 pueden ir en paralelo. La 4 depende de las tres anteriores. La 5 se puede ir haciendo en
cualquier momento, archivo a archivo.

---

## 6. Estado de entrega

Archivo Figma: <https://www.figma.com/design/ir3ixk7OuBZuSBTTootGrE>

### Construido y validado (Fase 1)

| Objeto                  | Detalle                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `CasaSeg/Color`         | 23 variables, modo Light, scopes y `code syntax` fijados              |
| `CasaSeg/Spacing`       | 7 variables: 4 / 8 / 12 / 16 / 20 / 24 / 32                           |
| `CasaSeg/Radius`        | 5 variables: 10 / 16 / 22 / 28 / pill                                 |
| Estilos de texto        | Display, H1, H2, Card Title, Body, Caption, Label                     |
| Estilos de efecto       | Shadow/Card, Shadow/Raised, Shadow/Action, Shadow/Hero                |
| Página `01 Foundations` | 1240 × 3011 px, secciones Color, Typography, Spacing, Radius, Shadows |
| Páginas                 | `01 Foundations`, `02 Componentes` (vacía), `03 Pantallas` (vacía)    |

Todas las variables llevan `code syntax` web (`var(--casaseg-surface-canvas)`, etc.), así que
Dev Mode las expone con un nombre estable.

### No construido

Fase 2 (13 componentes) y Fase 3 (~40 pantallas) están **sin empezar**. El script del
componente Button quedó escrito y listo en `.codex/pending/P2.b-button.js`; no llegó a
ejecutarse.

### Los tres límites del plan Starter

Ninguno se puede sortear desde el código; los tres exigen subir de plan.

1. **20 llamadas MCP al mes.** Las escrituras **no** están exentas, en contra de lo que
   sugiere la documentación de Figma. El cupo se agotó durante la Fase 1.
2. **Máximo 3 páginas por archivo.** Por eso el plan original de "una página por
   componente" no es viable: componentes y pantallas tienen que organizarse con
   **secciones** dentro de `02 Componentes` y `03 Pantallas`.
3. **Un solo modo por colección.** Solo existe Light. El modo oscuro necesitaría una
   página visual aparte, que con el límite de 3 páginas ya no cabe.

Con un asiento Full o Dev en plan Professional el límite pasa a 200 llamadas/día y las
páginas dejan de estar capadas, que es lo que el plan completo necesita.

## 7. Trasladar el diseño a React Native

Estas recomendaciones no dependen de Figma y se pueden aplicar ya.

1. **Reescribir `theme.ts` con los nombres de los tokens de Figma.** Las variables usan
   rutas semánticas (`surface/canvas`, `text/primary`, `action/gradient-start`) mientras el
   código usa nombres de producto (`background`, `text`, `actionGradient`). Alinear los dos
   lados ahora evita un mapeo manual perpetuo. La escala de espaciado ya coincide 1:1.
2. **Añadir la escala tipográfica como tokens.** Los 7 estilos de Figma no tienen
   equivalente en el código: hoy cada componente escribe `fontSize` y `fontWeight` a mano.
   Un objeto `typography` en `theme.ts` con los 7 niveles es el traslado directo.
3. **Bajar el peso tipográfico por defecto.** El código usa `'900'` en 81 sitios; la rampa
   de Figma reserva `Extra Bold` para Display y H1, y baja a `Medium` en cuerpo. Es el
   cambio que más nota se lleva visualmente y el más barato de aplicar.
4. **Convertir las sombras en constantes.** Los cuatro estilos de efecto salen de valores
   `boxShadow` que ya están en el código, pero repetidos literal a literal en cada archivo.
5. **Un único color de acción.** Ver [§2](#2-el-color-de-acción-es-el-azul): el código ya
   está resuelto a favor del azul. Ahora **la que va por detrás es Figma**: sus variables
   `action/*` siguen siendo teal y `accent/blue` informativo, es decir, justo al revés que
   el código. Reasignar esos dos valores es lo primero que hay que hacer al recuperar cupo
   MCP; hasta entonces Dev Mode entrega el color de acción equivocado.
6. **Los botones usan `Card Title` (17/23 Bold).** Coincide con los 17 pt del botón de
   sistema de iOS y sustituye al actual 15/`'900'`.

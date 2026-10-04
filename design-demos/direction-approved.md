# Dirección aprobada

**Fecha:** 2026-10-04

**Propuestas mostradas:**
- A · Franja fluida — `A - Franja fluida.png`
- B · Foto primero — `B - Foto primero.png`
- C · Folio registral — `C - Folio registral.png`

**Elección del usuario (palabras textuales):**
> usa el diseño del "B - Foto primero.png" es el diseño para toda la app. pero usa los colores y degradados que tienen los componentes

**Cómo se interpreta:**
- La **estructura** de B se aplica a toda la app: buscador flotante en forma de píldora, categorías con icono, tarjetas con la foto a todo el ancho, detalle con una hoja redondeada que se monta sobre la foto, bloque de confianza centrado, barra inferior con el precio subrayado y el botón de acción, y cabeceras con título grande.
- Los **colores** son los del tema actual (`src/constants/theme.ts`) y los componentes de `premium.tsx`, no el negro `#222` del prototipo:
  - `actionGradient` en los botones principales;
  - `heroGradient` donde ya hay una cabecera destacada;
  - `colors.brand` y `brandSoft` en las selecciones;
  - teal solo para verificación;
  - `palette.*` para que funcione el modo oscuro.

## Splash y onboarding (2026-10-04)

**Petición del usuario (palabras textuales):**
> proceda con el prototipo B y analiza el diseño de stich para entender como vas a planear

**Qué se conserva del diseño de Stitch** (`stitch/casaseg-splash-screen/DESIGN.md`):
- El flujo: splash → descubrir → comunidad → empezar.
- Las reglas de datos: vivienda y cifras reales de Supabase, sin datos de muestra.
- El movimiento: entradas escalonadas, zoom suave sobre la foto, cargador en rotación y versión sin animación para quien la tenga reducida.

**Qué se descarta de Stitch:**
- La paleta coral y rosa (`#E55E45`, `#FFE9EC`), que `docs/redesign-v2-plan.md` ya había retirado.
- El peso tipográfico 900.

**Qué aporta B:**
- Fondo liso del tema.
- Título grande.
- La vivienda presentada como una tarjeta de Explorar, con la píldora "Verificada".
- Las cifras en el mismo bloque de confianza que el detalle de propiedad.
- El botón con `actionGradient` y los enlaces de texto subrayados.

**Cambios de tema:**
- Se elimina `onboardingThemes`, el tema propio del onboarding, y pasa a usar `palette`.
- El fondo del splash nativo (`app.json`) se alinea con `palette.background`: `#F8FAFC` en claro y `#0A0A0A` en oscuro.

## Integración con `feat/ui-quick-wins` (2026-10-04)

**Petición del usuario (palabras textuales):**
> corrija lo pendiente y Manten los iconos de "Hugeicons" y las fuentes de inter que habia en la app antes del nuevo diseño.

**Rama de trabajo:**
- El rediseño B se rehízo sobre `origin/feat/ui-quick-wins` en la rama local `feat/rediseno-b`.
- La versión anterior, hecha sobre `main`, queda guardada en `design-demos/backup/rediseno-b-sobre-main.patch` y en el stash "rediseno-b sobre main".

**Qué se conserva de la rama:**
- La paleta derivada del logo nuevo (`brand.ts`).
- Hugeicons.
- La lógica de visitas, la agenda y "Mis visitas".
- `property.mapper.ts`, sin columnas inexistentes.
- `FORZAR_ONBOARDING` en `false`.
- La cabecera del perfil, con la verificación real que viene del perfil.

**Inter:**
- No existía en el código. Solo estaba en los estilos de Figma (`.codex/pending/P2.b-button.js`).
- Se añade `@expo-google-fonts/inter` y se carga en `_layout.tsx`.
- Cada `fontWeight` pasa a la familia Inter de su peso.

**Ilustración de "Empezar":**
- Se recorta el archivo para quitar el wordmark antiguo y el texto en inglés que llevaba incrustado.

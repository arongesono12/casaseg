# CasaSeg v2 — Spec común para las tres direcciones

> Entrada única de las tres propuestas (Huashu Design, Fallback Phase 3). Las tres usan
> este mismo contenido, las mismas fotos y el mismo logo; solo cambia la interpretación.

## Reformulación (Phase 2)

CasaSeg no es "otra app de alquiler": es un marketplace inmobiliario para Guinea Ecuatorial
(Malabo, Sipopo, Bata) cuyo valor diferencial está en el nombre — **casa segura**. En un
mercado donde el riesgo real es pagar por una vivienda cuyo propietario no es quien dice, o
cuya situación legal no está clara, la app promete tres cosas: la propiedad está
**verificada** (estado legal `verified / pending / restricted`), el propietario pasó **KYC**,
y la visita, el contrato y el pago se hacen **dentro** de la app. Hoy la UI comunica esa
promesa con un escudo decorativo y degradados azules genéricos; el contenido (la
verificación) no tiene forma propia, así que la marca se diluye en "plantilla fintech".

El usuario principal es un inquilino o comprador local o expatriado, en móvil (10 cm de
distancia), en español, a menudo con conexión irregular; el secundario es el propietario que
publica y gestiona solicitudes. El tono que esperan sin decirlo: **serio y tranquilo, no
eufórico** — se está hablando de mucho dinero (280.000.000 FCFA una villa) y de su casa. La
expectativa latente es poder distinguir de un vistazo lo verificado de lo pendiente, y saber
cuánto cuesta en FCFA sin cálculos.

Con esa lectura, hago tres versiones reales y diferentes para elegir.

## Producto y pantallas

App móvil Expo (iOS / Android). Formato del prototipo: **iPhone 15 Pro 393 × 852**, cuatro
pantallas en paralelo, cada una interactiva (tabs, abrir detalle, abrir hoja de visita):

1. **Explorar** — búsqueda, categorías (Todos / Apartamentos / Casas / Estudios), número de
   resultados, listado de propiedades, acceso a mapa.
2. **Detalle de propiedad** — galería, título, ubicación, precio, hab./baños/m², estado
   legal, propietario verificado, comodidades, CTA "Reservar visita".
3. **Solicitar visita** — hoja con fechas propuestas, nota al propietario, confirmación.
4. **Panel de propietario** — métricas (visitas pendientes, propiedades, cobros), lista de
   solicitudes, acceso a publicar.

## Contenido real (de `src/data/properties.ts`)

| Propiedad | Ubicación | Precio | Hab/Baños/m² | Valoración | Estado | Propietario |
|---|---|---|---|---|---|---|
| Apartamento moderno en Malabo | Malabo II · Malabo | 1.200.000 FCFA / mes | 2 / 2 / 92 | 4,7 (31) | Verificada | Elena Nsue |
| Villa luminosa cerca de Sipopo | Sipopo · Bioko Norte | 280.000.000 FCFA (venta) | 4 / 3 / 210 | 4,9 (18) | Verificada | Miguel Obiang |
| Estudio céntrico y equipado | Centro · Bata | 480.000 FCFA / mes | 1 / 1 / 48 | 4,6 (12) | Pendiente | Ana Mangue |

Comodidades Malabo: Aire acondicionado, Seguridad, Aparcamiento, Cocina equipada.
Fotos: `img/*.jpg` (las mismas Unsplash que usa la app). Logo: SVG real de
`src/components/ui/casaseg-logo.tsx` (casa con ojo de cerradura, degradado #1D65A2→#14B3AA).

## Restricciones de marca (no negociables)

- Paleta azul/teal **se mantiene** (`docs/redesign-v2-plan.md`: "no es un repintado").
  Azul `#2563EB` = acción; teal `#0F766E/#14B8A6` = **solo** confianza/verificación, nunca
  una acción. Sin morado, sin ámbar como color de rol.
- Texto ≥ 14 px cuerpo, ≥ 12 px etiquetas, contraste ≥ 4.5:1. Zonas táctiles ≥ 44–48 px.
- Peso tipográfico: 800 solo display/título, cuerpo 400–500 (fin del `900` por todas partes).
- Escala de espaciado 4/8/12/16/20/24/32. Moneda siempre "FCFA".
- Nada de `Sparkles`, orbes decorativos ni emoji como iconos.

## Imágenes (Phase 3.5)

Contenido necesario: sí (es un marketplace de viviendas; sin foto se pierde información).
Se usan las fotos reales del catálogo, compartidas por las tres versiones. Avatares de
propietario solo donde identifican a la persona (detalle, solicitudes).

## Form — cinco preguntas

- **Rol narrativo**: Explorar = catálogo; Detalle = decisión; Visita = compromiso; Panel = gestión.
- **Distancia**: 10 cm, una mano; información densa pero escaneable.
- **Temperatura**: calmada y con autoridad — la de una notaría amable, no la de un casino.
- **Capacidad**: 3 propiedades + chrome caben en 852 px con una tarjeta y media visible.
- **Motivo visual propio**: **la verificación como sello / expediente** — cada vivienda tiene
  un "folio" con su estado legal; el ojo de cerradura del logo como forma recurrente. Ningún
  otro tema tendría un sello registral como pieza central.

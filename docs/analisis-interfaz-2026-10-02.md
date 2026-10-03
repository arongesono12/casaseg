# Análisis de la interfaz de CasaSeg

Fecha: 2 de octubre de 2026.

## Alcance y método

Se inventariaron las 43 rutas `tsx` de `src/app` y los 35 componentes `tsx` de `src/components`. La revisión en profundidad cubrió navegación, Explorar, Guardados, Mensajes, mapa, autenticación, formularios compartidos, tema y recursos; el resto se examinó mediante búsquedas estáticas. La inspección visual se realizó en la vista web de Explorar a 320 × 568 y 900 × 430 píxeles. Las rutas que requieren autenticación no se probaron visualmente con una cuenta. La vista web es una comprobación de diseño, no una medida de rendimiento nativo.

## Resultado por criterio

| Criterio | Hallazgo y cambio aplicado | Validación pendiente |
| --- | --- | --- |
| Adaptabilidad | `app.json` y el manifiesto Android bloqueaban la orientación vertical. Se habilitaron ambas orientaciones. Explorar y Guardados ahora calculan de una a cuatro columnas según ancho y escala de texto. En pantallas bajas, Explorar prioriza búsqueda, categorías y contenido. Los estados sin sesión de Guardados y Mensajes ahora se desplazan. | Probar rotación real en iOS y Android, incluidos los flujos de onboarding y publicación. El cambio de orientación Android requiere una nueva compilación nativa. |
| Ergonomía táctil | La navegación principal ya estaba abajo. El botón compartido de volver creció a 48 × 48; los controles de ordenación de fotos crecieron a 48 × 48 y pueden pasar a otra línea. El mapa ahora da respuesta visual al pulsar y anuncia las acciones a lectores de pantalla. | Medir en dispositivo los controles superpuestos en mapa, galería y detalle de propiedad. |
| Claridad visual | Se conservó la paleta azul de marca y su tema oscuro. La cabecera de Explorar muestra menos información en horizontal para dejar espacio a las viviendas. La cuadrícula cambia a tarjetas anchas cuando dos columnas estrecharían el texto. | Revisar los flujos autenticados con datos reales y texto largo en español, francés e inglés. |
| Rendimiento | Los listados principales usan `FlatList`; las imágenes remotas usan `expo-image` con caché de disco; las fotos que sube un propietario se reducen a 1600 px y JPEG de calidad 0,78. Se quitó la animación de desplazamiento entre pestañas Android. | Medir FPS, memoria, tamaño descargado y tiempo hasta interacción en un Android de gama media o baja. El PNG de la última pantalla de onboarding ocupa ~0,94 MB y es candidato a una codificación más ligera si la calidad visual se mantiene. |
| Feedback | Los botones compartidos ya exponen estados pulsado, ocupado y deshabilitado; las acciones importantes usan respuesta háptica. El mapa recibió estado pulsado. Los estados vacíos y de error ofrecen acciones para continuar o reintentar. | Comprobar respuesta háptica y estados de carga en iOS y Android reales. |
| Accesibilidad | El tema ahora distingue el rojo de texto de error en claro y oscuro. La prueba de paleta exige contraste mínimo 4,5:1 para ambos. Las cuadrículas reservan más espacio al aumentar el texto del sistema. Se añadieron etiquetas y roles a acciones del mapa. | Pasar VoiceOver y TalkBack por cada flujo, verificar orden de foco y probar escalas de texto elevadas. Un escaneo de código marca iconos decorativos de 10–28 px como posibles objetivos táctiles; esos avisos requieren inspección del contenedor pulsable. |

## Prioridades siguientes para una aceptación completa

1. Ejecutar una matriz de dispositivo real: 320–430 dp en vertical, un teléfono en horizontal, una tableta, texto al 200 %, modo claro y oscuro, y los tres idiomas.
2. Pasar VoiceOver y TalkBack por búsqueda, filtros, favoritos, mapa, reserva, chat, publicación, pagos y ajustes. Comprobar que los controles anidados se anuncian una sola vez y que el foco sigue un orden lógico.
3. Medir rendimiento en compilación de producción sobre un Android de gama media o baja. Inspeccionar especialmente la cabecera plegable de Explorar, los carruseles de fotos y los marcadores del mapa antes de cambiar su implementación.
4. Revisar los textos de error propios de cada pantalla que aún usan el rojo genérico `colors.error`, y sustituirlo por `palette.errorText` donde se rendericen como texto.
5. Optimizar la ilustración PNG de onboarding después de comparar visualmente una versión WebP o AVIF compatible con las plataformas objetivo.

## Comprobaciones ejecutadas

- TypeScript: `tsc --noEmit`, correcto.
- Lint: `expo lint`, correcto.
- Pruebas: 94 correctas, incluidas las nuevas pruebas de columnas responsive y contraste del texto de error.
- Navegador: a 320 px la tarjeta de vivienda midió 296 px y no hubo desbordamiento horizontal. La comprobación de rotación física y fluidez nativa queda pendiente.

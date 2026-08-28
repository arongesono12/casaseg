// P2.b — Button component set for CasaSeg v2.
// Escrito y listo para ejecutar, pero NO ejecutado: el cupo mensual de llamadas MCP
// de Figma (20/mes en plan Starter) se agotó justo antes de esta llamada.
// Ejecutar con use_figma sobre fileKey ir3ixk7OuBZuSBTTootGrE cuando haya cupo.
// Depende de: variables CasaSeg/Color, CasaSeg/Spacing, CasaSeg/Radius y del
// estilo de texto CasaSeg/Card Title (todos ya existen en el archivo).

await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

const page = figma.root.children.find((p) => p.name === '02 Componentes');
await figma.setCurrentPageAsync(page);

const cvars = await figma.variables.getLocalVariablesAsync('COLOR');
const nvars = await figma.variables.getLocalVariablesAsync('FLOAT');
const C = Object.fromEntries(cvars.map((v) => [v.name, v]));
const N = Object.fromEntries(nvars.map((v) => [v.name, v]));
const styles = await figma.getLocalTextStylesAsync();
const cardTitle = styles.find((s) => s.name === 'CasaSeg/Card Title');

const alias = (v) => ({ type: 'VARIABLE_ALIAS', id: v.id });
const boundSolid = (v) => figma.variables.setBoundVariableForPaint(
  { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);

// Degradado de confianza con AMBAS paradas vinculadas a tokens — sin colores literales.
const actionGradient = () => ({
  type: 'GRADIENT_LINEAR',
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
  gradientStops: [
    { position: 0, color: { r: 0.06, g: 0.46, b: 0.43, a: 1 }, boundVariables: { color: alias(C['action/gradient-start']) } },
    { position: 1, color: { r: 0.01, g: 0.41, b: 0.63, a: 1 }, boundVariables: { color: alias(C['action/gradient-end']) } },
  ],
});

function radius(node, name) {
  for (const corner of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
    node.setBoundVariable(corner, N[name]);
  }
}

async function makeButton(variantName, opts) {
  const c = figma.createComponent();
  c.name = variantName;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'CENTER';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'FIXED';
  c.resize(280, 54);
  c.setBoundVariable('paddingLeft', N['space/xl']);
  c.setBoundVariable('paddingRight', N['space/xl']);
  c.setBoundVariable('itemSpacing', N['space/sm']);
  radius(c, 'radius/md');
  c.fills = opts.fills;
  if (opts.stroke) { c.strokes = [boundSolid(opts.stroke)]; c.strokeWeight = 1; }

  if (opts.spinner) {
    const ring = figma.createEllipse();
    ring.resize(20, 20);
    ring.fills = [];
    ring.strokes = [boundSolid(C['text/on-action'])];
    ring.strokeWeight = 2.5;
    ring.arcData = { startingAngle: 0, endingAngle: 4.5, innerRadius: 0.72 };
    c.appendChild(ring);
  }

  const label = figma.createText();
  label.characters = opts.label;
  await label.setTextStyleIdAsync(cardTitle.id);
  label.fills = [boundSolid(opts.text)];
  c.appendChild(label);

  return c;
}

const primary = await makeButton('Variant=Primary', {
  label: 'Reservar visita', fills: [actionGradient()], text: C['text/on-action'],
});
const secondary = await makeButton('Variant=Secondary', {
  label: 'Ver detalles', fills: [boundSolid(C['surface/default'])],
  stroke: C['border/default'], text: C['text/primary'],
});
const danger = await makeButton('Variant=Danger', {
  label: 'Eliminar propiedad', fills: [boundSolid(C['surface/default'])],
  stroke: C['status/error'], text: C['status/error'],
});
const loading = await makeButton('Variant=Loading', {
  label: 'Procesando…', fills: [actionGradient()], text: C['text/on-action'], spinner: true,
});

const set = figma.combineAsVariants([primary, secondary, danger, loading], page);
set.name = 'Button';
set.description = 'Acción principal de CasaSeg. Primary usa el degradado de confianza teal→azul. '
  + 'Altura 54 px para superar el objetivo táctil de 48. Secondary para acciones de apoyo, '
  + 'Danger solo para acciones destructivas, Loading bloquea la interacción.';

// Las variantes se apilan en (0,0) tras combinar — hay que colocarlas a mano.
set.layoutMode = 'VERTICAL';
set.itemSpacing = 20;
set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
set.primaryAxisSizingMode = 'AUTO';
set.counterAxisSizingMode = 'AUTO';
set.x = 80; set.y = 80;

return {
  componentSetId: set.id,
  variants: set.children.map((v) => ({ name: v.name, id: v.id })),
  page: page.name,
};

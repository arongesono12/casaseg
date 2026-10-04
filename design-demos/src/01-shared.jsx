// Shared across the three directions: real logo, real catalogue data, icons, phone state machine.

const ICON_PATHS = {
  search: ['M21 21l-4.3-4.3', { circle: [11, 11, 8] }],
  pin: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', { circle: [12, 10, 3] }],
  heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  chat: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  user: ['M20 21a8 8 0 0 0-16 0', { circle: [12, 8, 5] }],
  bed: ['M2 4v16', 'M2 8h18a2 2 0 0 1 2 2v10', 'M2 17h20', 'M6 8v9'],
  bath: ['M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5', 'M10 5 8 7', 'M2 12h20', 'M7 19v2', 'M17 19v2'],
  area: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
  star: ['M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  calendar: ['M16 2v4', 'M8 2v4', 'M3 10h18', { rect: [3, 4, 18, 18, 2] }],
  left: ['m15 18-6-6 6-6'],
  right: ['m9 18 6-6-6-6'],
  map: ['M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z', 'M15 5.764v15', 'M9 3.236v15'],
  home: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  building: ['M9 22v-4h6v4', 'M8 6h.01', 'M16 6h.01', 'M12 6h.01', 'M12 10h.01', 'M12 14h.01', 'M16 10h.01', 'M16 14h.01', 'M8 10h.01', 'M8 14h.01', { rect: [4, 2, 16, 20, 2] }],
  check: ['M20 6 9 17l-5-5'],
  clock: ['M12 6v6l4 2', { circle: [12, 12, 10] }],
  plus: ['M5 12h14', 'M12 5v14'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M2 14h4', 'M10 8h4', 'M18 16h4'],
  wallet: ['M2 10h20', { rect: [2, 5, 20, 14, 2] }],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8'],
  bell: ['M10.268 21a2 2 0 0 0 3.464 0', 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'],
  key: ['m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4', 'm21 2-9.6 9.6', { circle: [7.5, 15.5, 5.5] }],
};

function Icon({ name, size = 20, color = 'currentColor', stroke = 1.8, fill = 'none', style }) {
  const parts = ICON_PATHS[name] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {parts.map((p, i) => typeof p === 'string'
        ? <path key={i} d={p} />
        : p.circle ? <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} />
        : <rect key={i} x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]} rx={p.rect[4]} />)}
    </svg>
  );
}

// Real CasaSeg mark — path data is injected at build time from src/components/ui/casaseg-logo.tsx.
const LOGO_PATHS = __LOGO_PATHS__;
function Logo({ size = 32, mono }) {
  const id = 'lg' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const fill = (n) => (mono ? mono : `url(#${id}${n})`);
  return (
    <svg width={Math.round(size * 1.233)} height={size} viewBox="0 0 138.35 112.22" aria-label="CasaSeg">
      <defs>
        <linearGradient id={`${id}1`} x1="62.13" y1="83.86" x2="79.37" y2="83.86" gradientUnits="userSpaceOnUse"><stop offset="0.28" stopColor="#1d65a2" /><stop offset="1" stopColor="#14b3aa" /></linearGradient>
        <linearGradient id={`${id}2`} x1="36.76" y1="61.95" x2="103.85" y2="61.95" gradientUnits="userSpaceOnUse"><stop offset="0.28" stopColor="#1d65a2" /><stop offset="1" stopColor="#14b3aa" /></linearGradient>
        <linearGradient id={`${id}3`} x1="26.02" y1="39.6" x2="112.33" y2="39.6" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#14b3aa" /><stop offset="0.8" stopColor="#1d65a2" /></linearGradient>
      </defs>
      {LOGO_PATHS.map((d, i) => <path key={i} fill={fill(i + 1)} d={d} />)}
    </svg>
  );
}

const PROPERTIES = [
  {
    id: 'malabo', title: 'Apartamento moderno en Malabo', short: 'Apartamento en Malabo II', location: 'Malabo II · Malabo', city: 'Malabo',
    images: ['img/malabo-1.jpg', 'img/malabo-2.jpg', 'img/malabo-3.jpg'], bedrooms: 2, bathrooms: 2, area: 92,
    price: 1200000, priceType: 'per_month', rating: 4.7, reviews: 31, category: 'Apartamentos', isNew: true,
    amenities: ['Aire acondicionado', 'Seguridad 24 h', 'Aparcamiento', 'Cocina equipada'],
    owner: 'Elena Nsue', ownerAvatar: 'img/owner-elena.jpg', legal: 'verified', folio: 'GQ-MLB-0412', verifiedOn: '12 sep 2026',
    description: 'Luminoso y tranquilo, con espacios amplios y acceso rápido a servicios esenciales de Malabo.',
  },
  {
    id: 'sipopo', title: 'Villa luminosa cerca de Sipopo', short: 'Villa en Sipopo', location: 'Sipopo · Bioko Norte', city: 'Sipopo',
    images: ['img/sipopo-1.jpg', 'img/sipopo-2.jpg'], bedrooms: 4, bathrooms: 3, area: 210,
    price: 280000000, priceType: 'sale', rating: 4.9, reviews: 18, category: 'Casas', isNew: true,
    amenities: ['Piscina', 'Jardín', 'Generador', 'Aparcamiento'],
    owner: 'Miguel Obiang', ownerAvatar: 'img/owner-miguel.jpg', legal: 'verified', folio: 'GQ-BN-0087', verifiedOn: '3 ago 2026',
    description: 'Villa familiar con jardín, terrazas y espacios preparados para una estancia cómoda cerca de Sipopo.',
  },
  {
    id: 'bata', title: 'Estudio céntrico y equipado', short: 'Estudio en Bata', location: 'Centro · Bata', city: 'Bata',
    images: ['img/bata-1.jpg'], bedrooms: 1, bathrooms: 1, area: 48,
    price: 480000, priceType: 'per_month', rating: 4.6, reviews: 12, category: 'Estudios', isNew: false,
    amenities: ['Amueblado', 'Wifi', 'Agua caliente'],
    owner: 'Ana Mangue', ownerAvatar: 'img/owner-ana.jpg', legal: 'pending', folio: 'GQ-BAT-1190', verifiedOn: null,
    description: 'Estudio en pleno centro de Bata, equipado para entrar a vivir.',
  },
];

const OWNER_REQUESTS = [
  { id: 'r1', name: 'Pedro Esono', property: 'Apartamento en Malabo II', when: 'Sáb 11 oct · 10:00', status: 'pending' },
  { id: 'r2', name: 'Lucía Ayingono', property: 'Apartamento en Malabo II', when: 'Dom 12 oct · 17:30', status: 'pending' },
  { id: 'r3', name: 'Samuel Ndong', property: 'Apartamento en Malabo II', when: 'Mié 8 oct · 12:00', status: 'confirmed' },
];

const VISIT_DAYS = [
  { id: 'd1', dow: 'Sáb', day: 11 }, { id: 'd2', dow: 'Dom', day: 12 }, { id: 'd3', dow: 'Lun', day: 13 }, { id: 'd4', dow: 'Mar', day: 14 },
];
const VISIT_TIMES = ['10:00', '12:00', '17:30'];

const fmtNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const priceSuffix = (t) => (t === 'per_month' ? '/ mes' : t === 'per_night' ? '/ noche' : 'venta');
const legalLabel = (l) => (l === 'verified' ? 'Verificada' : l === 'pending' ? 'En revisión' : 'Restringida');
const CATEGORIES = ['Todos', 'Apartamentos', 'Casas', 'Estudios'];
const byId = (id) => PROPERTIES.find((p) => p.id === id);

// One independent state machine per phone: tab + open detail + visit sheet.
function usePhoneState(initial) {
  const [tab, setTabRaw] = React.useState(initial.tab || 'explore');
  const [detail, setDetail] = React.useState(initial.detail || null);
  const [sheet, setSheet] = React.useState(Boolean(initial.sheet));
  const [category, setCategory] = React.useState('Todos');
  const [saved, setSaved] = React.useState(['sipopo']);
  const [visit, setVisitRaw] = React.useState({ day: 'd1', time: '10:00', sent: false });
  return {
    tab, detail, sheet, category, saved, visit,
    setTab: (t) => { setTabRaw(t); setDetail(null); setSheet(false); },
    open: (id) => setDetail(id),
    back: () => { setDetail(null); setSheet(false); },
    openSheet: () => { setSheet(true); setVisitRaw((v) => ({ ...v, sent: false })); },
    closeSheet: () => setSheet(false),
    setCategory,
    toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    setVisit: (patch) => setVisitRaw((v) => ({ ...v, ...patch })),
    list: () => PROPERTIES.filter((p) => category === 'Todos' || p.category === category),
  };
}

const PHONES = [
  { key: 'explore', label: '01 · Explorar', initial: { tab: 'explore' } },
  { key: 'detail', label: '02 · Detalle de propiedad', initial: { tab: 'explore', detail: 'malabo' } },
  { key: 'visit', label: '03 · Solicitar visita', initial: { tab: 'explore', detail: 'malabo', sheet: true } },
  { key: 'owner', label: '04 · Panel de propietario', initial: { tab: 'profile' } },
];

function Board({ title, subtitle, Phone, background, labelColor = '#475569' }) {
  return (
    <div style={{ minHeight: '100vh', background, padding: '36px 40px 56px', boxSizing: 'border-box' }}>
      <header style={{ maxWidth: 1800, margin: '0 auto 24px', display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', color: labelColor, fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <strong style={{ fontSize: 15 }}>{title}</strong>
        <span style={{ fontSize: 14 }}>{subtitle}</span>
      </header>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
        {PHONES.map((p) => (
          <div key={p.key} data-phone={p.key}>
            <div style={{ fontSize: 13, color: labelColor, marginBottom: 10, fontStyle: 'italic', fontFamily: '-apple-system, system-ui, sans-serif' }}>{p.label}</div>
            <Phone initial={p.initial} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Content area inside IosFrame is 393 × 764 (54 status bar, 34 home indicator).
const SCREEN_H = 764;

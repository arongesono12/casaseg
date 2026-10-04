// FONTS: https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap
// Direction C · Folio registral — "best designer": Pentagram, Michael Bierut's way of working
// (identity as a system, civic clarity, typography doing the work). Motif from the content:
// every home is a registry folio, and verification is a rubber stamp built around the keyhole mark.
// Color: paper is a low-chroma warm white (documents), ink is the brand blue pushed to near-navy,
// the stamp is the brand teal — official stamps in Equatorial Guinea are inked, not glowing.

const C = {
  display: '"Schibsted Grotesk", -apple-system, system-ui, sans-serif',
  serif: '"Source Serif 4", Georgia, serif',
  paper: '#F7F6F2', card: '#FFFFFF', ink: '#0B1F3A', body: '#3F4B5C', rule: '#D9D6CC', faint: '#ECEAE3',
  blue: '#2563EB', teal: '#0F766E', amber: '#8A5A00',
};

function CStamp({ p, size = 96, rotate = -9 }) {
  const ok = p.legal === 'verified';
  const color = ok ? C.teal : C.amber;
  const text = ok ? `VERIFICADA · CASASEG · ${p.verifiedOn.toUpperCase()} · ` : 'EN REVISIÓN · CASASEG · PENDIENTE · ';
  const id = 'st' + p.id + size;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0 }} aria-label={legalLabel(p.legal)}>
      <defs><path id={id} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" /></defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2.2" opacity=".9" />
      <circle cx="50" cy="50" r="28" fill="none" stroke={color} strokeWidth="1.2" opacity=".9" />
      <text fill={color} fontFamily={C.display} fontSize="8.6" fontWeight="700" letterSpacing="1.1"><textPath href={`#${id}`}>{text}</textPath></text>
      {ok
        ? <g transform="translate(24.5 27.5) scale(.37)" fill={color}>{LOGO_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        : <path d="M50 36v15l9 6" stroke={color} strokeWidth="3.4" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

function CFolio({ p, light }) {
  return <span style={{ fontFamily: C.display, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: light ? 'rgba(255,255,255,.85)' : C.body, fontVariantNumeric: 'tabular-nums' }}>FOLIO {p.folio}</span>;
}

function CExplore({ s }) {
  const list = s.list();
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, c === 'Todos' ? PROPERTIES.length : PROPERTIES.filter((p) => p.category === c).length]));
  return (
    <div style={{ background: C.paper, minHeight: '100%' }}>
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo size={22} /><b style={{ fontFamily: C.display, fontSize: 17, color: C.ink, fontWeight: 800 }}>CasaSeg</b></span>
        <button aria-label="Mapa" style={{ height: 44, display: 'flex', alignItems: 'center', gap: 6, fontFamily: C.display, fontSize: 14, fontWeight: 600, color: C.ink }}><Icon name="map" size={18} />Mapa</button>
      </div>
      <h1 style={{ margin: '18px 20px 0', fontFamily: C.display, fontSize: 34, lineHeight: '36px', fontWeight: 800, letterSpacing: -1.1, color: C.ink }}>Registro de<br />viviendas</h1>
      <div style={{ margin: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 10, height: 48, borderBottom: `2px solid ${C.ink}` }}>
        <Icon name="search" size={20} color={C.ink} />
        <span style={{ flex: 1, fontFamily: C.serif, fontSize: 17, color: C.body, fontStyle: 'italic' }}>Barrio, ciudad o folio</span>
        <Icon name="sliders" size={19} color={C.ink} />
      </div>
      <div style={{ display: 'flex', gap: 18, padding: '14px 20px 0', overflowX: 'auto' }}>
        {CATEGORIES.map((c) => {
          const on = s.category === c;
          return <button key={c} onClick={() => s.setCategory(c)} style={{ height: 40, fontFamily: C.display, fontSize: 15, fontWeight: on ? 700 : 500, color: on ? C.ink : C.body, borderBottom: `2px solid ${on ? C.blue : 'transparent'}`, whiteSpace: 'nowrap' }}>{c} <sup style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{counts[c]}</sup></button>;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', margin: '14px 20px 0', borderTop: `1px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}` }}>
        {[[list.length, 'viviendas'], [list.filter((p) => p.legal === 'verified').length, 'verificadas'], [list.filter((p) => p.legal === 'pending').length, 'en revisión']].map(([n, l], i) => (
          <div key={l} style={{ padding: '8px 0 8px ' + (i ? 12 : 0) + 'px', borderLeft: i ? `1px solid ${C.rule}` : 'none' }}>
            <div style={{ fontFamily: C.display, fontSize: 26, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums', lineHeight: '30px' }}>{n}</div>
            <div style={{ fontFamily: C.display, fontSize: 12, color: C.body, fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 20px 24px' }}>
        {list.map((p) => (
          <button key={p.id} onClick={() => s.open(p.id)} style={{ textAlign: 'left', width: '100%', padding: '16px 0', borderBottom: `1px solid ${C.rule}`, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><CFolio p={p} /><span style={{ fontFamily: C.display, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: p.legal === 'verified' ? C.teal : C.amber }}>{legalLabel(p.legal).toUpperCase()}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '118px 1fr', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <img src={p.images[0]} alt="" style={{ width: 118, height: 118, objectFit: 'cover', display: 'block' }} />
                <span role="button" aria-label="Guardar" onClick={(e) => { e.stopPropagation(); s.toggleSaved(p.id); }} style={{ position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, background: C.paper, display: 'grid', placeItems: 'center' }}><Icon name="heart" size={18} color={C.ink} fill={s.saved.includes(p.id) ? C.ink : 'none'} /></span>
              </div>
              <div style={{ minWidth: 0, display: 'grid', alignContent: 'start', gap: 4 }}>
                <div style={{ fontFamily: C.serif, fontSize: 18, lineHeight: '23px', fontWeight: 600, color: C.ink }}>{p.title}</div>
                <div style={{ fontFamily: C.display, fontSize: 14, color: C.body }}>{p.location}</div>
                <div style={{ fontFamily: C.display, fontSize: 14, color: C.body, fontVariantNumeric: 'tabular-nums' }}>{p.bedrooms} hab · {p.bathrooms} baños · {p.area} m²</div>
                <div style={{ fontFamily: C.display, fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 2 }}>{fmtNumber(p.price)} <span style={{ fontSize: 13, fontWeight: 600 }}>FCFA {priceSuffix(p.priceType)}</span></div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CDetail({ s }) {
  const p = byId(s.detail);
  const rows = [
    ['Régimen', p.priceType === 'sale' ? 'Venta' : 'Alquiler mensual'],
    ['Precio', `${fmtNumber(p.price)} FCFA`],
    ['Superficie', `${p.area} m²`],
    ['Habitaciones', p.bedrooms],
    ['Baños', p.bathrooms],
    ['Valoración', `${p.rating.toString().replace('.', ',')} / 5 · ${p.reviews} reseñas`],
  ];
  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 92 }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 4px' }}>
        <button onClick={s.back} style={{ height: 44, display: 'flex', alignItems: 'center', gap: 2, fontFamily: C.display, fontSize: 15, fontWeight: 600, color: C.ink, padding: '0 8px' }}><Icon name="left" size={22} />Registro</button>
        <button onClick={() => s.toggleSaved(p.id)} aria-label="Guardar" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}><Icon name="heart" size={21} color={C.ink} fill={s.saved.includes(p.id) ? C.ink : 'none'} /></button>
      </div>
      <figure style={{ margin: '0 20px' }}>
        <img src={p.images[0]} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
        <figcaption style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.display, fontSize: 12, color: C.body, marginTop: 6 }}><span>Fig. 1 — Salón y cocina</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>1 / {p.images.length}</span></figcaption>
      </figure>
      <div style={{ margin: '18px 20px 0', position: 'relative' }}>
        <CFolio p={p} />
        <h2 style={{ margin: '6px 0 0', fontFamily: C.serif, fontSize: 25, lineHeight: '30px', fontWeight: 600, color: C.ink, paddingRight: 96 }}>{p.title}</h2>
        <div style={{ fontFamily: C.display, fontSize: 15, color: C.body, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="pin" size={16} />{p.location}</div>
        <div style={{ position: 'absolute', right: -4, top: -6 }}><CStamp p={p} size={92} /></div>
      </div>
      <dl style={{ margin: '18px 20px 0', borderTop: `1px solid ${C.ink}` }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', minHeight: 40, alignItems: 'center', borderBottom: `1px solid ${C.rule}`, fontFamily: C.display, fontSize: 15 }}>
            <dt style={{ color: C.body }}>{k}</dt><dd style={{ margin: 0, color: C.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</dd>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', minHeight: 52, alignItems: 'center', borderBottom: `1px solid ${C.rule}`, fontFamily: C.display, fontSize: 15 }}>
          <dt style={{ color: C.body }}>Propietaria</dt>
          <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: C.ink, fontWeight: 600 }}><img src={p.ownerAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover' }} />{p.owner}<span style={{ fontSize: 12, color: C.teal, fontWeight: 700 }}>ID comprobada</span></dd>
        </div>
      </dl>
      <p style={{ margin: '16px 20px 0', fontFamily: C.serif, fontSize: 16, lineHeight: '25px', color: C.ink }}><span style={{ fontFamily: C.display, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: C.body, display: 'block', marginBottom: 4 }}>OBSERVACIONES</span>{p.description} Incluye {p.amenities.join(', ').toLowerCase()}.</p>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: C.paper, borderTop: `1px solid ${C.ink}`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', zIndex: 5 }}>
        <div style={{ flex: 1, fontFamily: C.display }}><div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{fmtNumber(p.price)} FCFA</div><div style={{ fontSize: 13, color: C.body }}>{priceSuffix(p.priceType)}</div></div>
        <button onClick={s.openSheet} style={{ height: 52, padding: '0 22px', background: C.blue, color: 'white', fontFamily: C.display, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>Solicitar visita<Icon name="right" size={18} color="white" stroke={2.2} /></button>
      </div>
    </div>
  );
}

function CVisitSheet({ s }) {
  const p = byId(s.detail);
  const day = VISIT_DAYS.find((d) => d.id === s.visit.day);
  const label = (n, t) => <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontFamily: C.display, margin: '18px 0 8px' }}><span style={{ fontSize: 13, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{n}</span><span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{t}</span></div>;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={s.closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(11,31,58,.5)' }} />
      <div style={{ position: 'relative', background: C.card, padding: '18px 20px 22px', borderTop: `3px solid ${C.ink}` }}>
        {s.visit.sent ? (
          <div style={{ display: 'grid', gap: 10, padding: '6px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={{ fontFamily: C.display, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: C.body }}>RESGUARDO Nº V-20261011-0412</div><div style={{ fontFamily: C.serif, fontSize: 24, fontWeight: 600, color: C.ink, marginTop: 6 }}>Solicitud registrada</div></div>
              <svg width="78" height="78" viewBox="0 0 100 100" style={{ transform: 'rotate(8deg)' }}><rect x="6" y="28" width="88" height="44" fill="none" stroke={C.blue} strokeWidth="3" /><text x="50" y="57" textAnchor="middle" fill={C.blue} fontFamily={C.display} fontSize="17" fontWeight="800" letterSpacing="2">RECIBIDA</text></svg>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 15, lineHeight: '22px', color: C.body }}>{p.owner} debe confirmar la visita del {day.dow.toLowerCase()} {day.day} de octubre a las {s.visit.time}. La dirección exacta llegará con la confirmación.</div>
            <button onClick={s.closeSheet} style={{ marginTop: 8, height: 50, background: C.ink, color: 'white', fontFamily: C.display, fontSize: 16, fontWeight: 700 }}>Volver al folio</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><CFolio p={p} /><div style={{ fontFamily: C.serif, fontSize: 24, fontWeight: 600, color: C.ink, marginTop: 4 }}>Solicitud de visita</div></div>
              <button onClick={s.closeSheet} aria-label="Cerrar" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', marginTop: -8, marginRight: -10 }}><Icon name="close" size={20} color={C.ink} /></button>
            </div>
            {label('01', 'Fecha')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${C.ink}` }}>
              {VISIT_DAYS.map((d, i) => {
                const on = s.visit.day === d.id;
                return <button key={d.id} onClick={() => s.setVisit({ day: d.id })} style={{ height: 62, borderLeft: i ? `1px solid ${C.ink}` : 'none', background: on ? C.ink : 'white', color: on ? 'white' : C.ink, fontFamily: C.display, display: 'grid', placeItems: 'center', alignContent: 'center' }}><span style={{ fontSize: 12, fontWeight: 600 }}>{d.dow.toUpperCase()}</span><span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{d.day}</span></button>;
              })}
            </div>
            {label('02', 'Hora')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: `1px solid ${C.ink}` }}>
              {VISIT_TIMES.map((t, i) => {
                const on = s.visit.time === t;
                return <button key={t} onClick={() => s.setVisit({ time: t })} style={{ height: 46, borderLeft: i ? `1px solid ${C.ink}` : 'none', background: on ? C.ink : 'white', color: on ? 'white' : C.ink, fontFamily: C.display, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{t}</button>;
              })}
            </div>
            {label('03', 'Condiciones')}
            <div style={{ fontFamily: C.serif, fontSize: 15, lineHeight: '22px', color: C.body }}>La dirección exacta se comparte al confirmar. Nunca pagues fuera de CasaSeg.</div>
            <button onClick={() => s.setVisit({ sent: true })} style={{ marginTop: 18, width: '100%', height: 52, background: C.blue, color: 'white', fontFamily: C.display, fontSize: 16, fontWeight: 700 }}>Enviar solicitud</button>
          </>
        )}
      </div>
    </div>
  );
}

function COwner() {
  const [requests, setRequests] = React.useState(OWNER_REQUESTS);
  const p = PROPERTIES[0];
  const pending = requests.filter((r) => r.status === 'pending').length;
  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 24 }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="img/owner-elena.jpg" alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover' }} />
        <div style={{ fontFamily: C.display }}><div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Elena Nsue</div><div style={{ fontSize: 13, color: C.teal, fontWeight: 600 }}>Propietaria · ID comprobada</div></div>
      </div>
      <h1 style={{ margin: '18px 20px 0', fontFamily: C.display, fontSize: 34, lineHeight: '36px', fontWeight: 800, letterSpacing: -1.1, color: C.ink }}>Libro de<br />solicitudes</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', margin: '16px 20px 0', borderTop: `1px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}` }}>
        {[[pending, 'pendientes'], [1, 'folio activo'], ['1,2 M', 'FCFA cobrados · oct']].map(([n, l], i) => (
          <div key={l} style={{ padding: '8px 0 8px ' + (i ? 12 : 0) + 'px', borderLeft: i ? `1px solid ${C.rule}` : 'none', fontFamily: C.display }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums', lineHeight: '32px' }}>{n}</div>
            <div style={{ fontSize: 12, color: C.body }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ margin: '16px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 104px', fontFamily: C.display, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.body, paddingBottom: 6, borderBottom: `1px solid ${C.ink}` }}><span>SOLICITANTE · FECHA</span><span style={{ textAlign: 'right' }}>ESTADO</span></div>
        {requests.map((r) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 104px', alignItems: 'center', minHeight: 64, borderBottom: `1px solid ${C.rule}`, fontFamily: C.display }}>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{r.name}</div><div style={{ fontSize: 14, color: C.body, fontVariantNumeric: 'tabular-nums' }}>{r.when}</div></div>
            {r.status === 'pending'
              ? <button onClick={() => setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'confirmed' } : x)))} style={{ height: 44, background: C.blue, color: 'white', fontSize: 14, fontWeight: 700 }}>Confirmar</button>
              : <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: C.teal }}>CONFIRMADA</span>}
          </div>
        ))}
      </div>
      <div style={{ margin: '20px 20px 0', background: C.card, border: `1px solid ${C.rule}`, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <img src={p.images[0]} alt="" style={{ width: 64, height: 64, objectFit: 'cover' }} />
        <div style={{ flex: 1, minWidth: 0 }}><CFolio p={p} /><div style={{ fontFamily: C.serif, fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 2 }}>{p.short}</div></div>
        <CStamp p={p} size={58} rotate={-12} />
      </div>
      <button style={{ margin: '14px 20px 0', width: 'calc(100% - 40px)', height: 50, border: `1.5px solid ${C.ink}`, fontFamily: C.display, fontSize: 15, fontWeight: 700, color: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="plus" size={18} />Abrir un folio nuevo</button>
    </div>
  );
}

function CTabBar({ s }) {
  const tabs = [['explore', 'Registro', 'search'], ['saved', 'Guardados', 'heart'], ['messages', 'Mensajes', 'chat'], ['profile', 'Mis folios', 'file']];
  return (
    <nav style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: C.paper, borderTop: `1px solid ${C.ink}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', zIndex: 4 }}>
      {tabs.map(([k, label, icon]) => {
        const on = s.tab === k;
        return <button key={k} onClick={() => s.setTab(k)} style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 3, color: on ? C.blue : C.body, fontFamily: C.display }}><Icon name={icon} size={22} stroke={on ? 2.2 : 1.7} /><span style={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{label}</span></button>;
      })}
    </nav>
  );
}

function CPhone({ initial }) {
  const s = usePhoneState(initial);
  let screen;
  if (s.detail) screen = <CDetail s={s} />;
  else if (s.tab === 'explore') screen = <CExplore s={s} />;
  else if (s.tab === 'profile') screen = <COwner />;
  else screen = (
    <div style={{ background: C.paper, minHeight: '100%', padding: '14px 20px' }}>
      <h1 style={{ margin: 0, fontFamily: C.display, fontSize: 34, fontWeight: 800, letterSpacing: -1.1, color: C.ink }}>{s.tab === 'saved' ? 'Guardados' : 'Mensajes'}</h1>
      <div style={{ borderTop: `1px solid ${C.ink}`, marginTop: 14 }}>
        {s.tab === 'saved'
          ? PROPERTIES.filter((p) => s.saved.includes(p.id)).map((p) => (
            <button key={p.id} onClick={() => s.open(p.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${C.rule}`, alignItems: 'center' }}>
              <img src={p.images[0]} alt="" style={{ width: 72, height: 72, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}><CFolio p={p} /><div style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 600, color: C.ink }}>{p.short}</div></div>
              <CStamp p={p} size={50} />
            </button>))
          : [['Elena Nsue', 'Perfecto, nos vemos el sábado a las 10:00.', '09:41', 'img/owner-elena.jpg'], ['Miguel Obiang', 'Le envío el contrato de arras por la app.', 'Ayer', 'img/owner-miguel.jpg']].map(([n, m, t, a]) => (
            <div key={n} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${C.rule}`, alignItems: 'center', fontFamily: C.display }}>
              <img src={a} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 16, color: C.ink }}>{n}</b><span style={{ fontSize: 13, color: C.body }}>{t}</span></div><div style={{ fontSize: 14, color: C.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</div></div>
            </div>))}
      </div>
    </div>
  );
  return (
    <IosFrame>
      <div style={{ position: 'relative', height: SCREEN_H, overflow: 'hidden', background: C.paper }}>
        <div style={{ height: s.detail ? SCREEN_H : SCREEN_H - 64, overflowY: 'auto' }}>{screen}</div>
        {!s.detail && <CTabBar s={s} />}
        {s.detail && s.sheet && <CVisitSheet s={s} />}
      </div>
    </IosFrame>
  );
}

const DIRECTION = {
  title: 'C · Folio registral',
  subtitle: 'Mejor diseñador: Pentagram (enfoque Michael Bierut) — cada vivienda es un folio; la verificación es un sello hecho con la cerradura del logo.',
  background: '#E7E4DB',
  labelColor: '#4A4636',
  Phone: CPhone,
};

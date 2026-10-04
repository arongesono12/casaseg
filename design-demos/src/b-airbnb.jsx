// FONTS: https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap
// Direction B · Foto primero — benchmark: Airbnb app, 2025 redesign (One Show Gold Pencil, UX/UI Mobile).
// Borrowed grammar: floating search pill, icon category tabs, full-bleed photo cards, overlapping
// rounded sheet on detail, centered trust block, underlined-price footer. Airbnb's laurels become
// the CasaSeg keyhole mark; Rausch becomes the CasaSeg action gradient. Airbnb's 3D icons are
// degraded to flat line icons (no image generation here).

const B = {
  font: 'Figtree, -apple-system, system-ui, sans-serif',
  ink: '#222222', body: '#6A6A6A', line: '#EBEBEB', soft: '#F7F7F7',
  blue: '#2563EB', action: 'linear-gradient(90deg, #2563EB 0%, #0E7490 100%)', teal: '#0F766E', tealSoft: '#E6F4F1',
};

const B_CATS = [['Todos', 'home'], ['Apartamentos', 'building'], ['Casas', 'key'], ['Estudios', 'bed']];

function BCarousel({ p, height, radius = 16, onHeart, saved, badge = true }) {
  const [i, setI] = React.useState(0);
  return (
    <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden' }}>
      <img src={p.images[i]} alt="" onClick={(e) => { e.stopPropagation(); setI((i + 1) % p.images.length); }} style={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />
      {!badge ? null : p.legal === 'verified'
        ? <span style={{ position: 'absolute', top: 12, left: 12, height: 30, padding: '0 11px', borderRadius: 15, background: 'white', color: B.ink, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}><Logo size={13} />Verificada</span>
        : <span style={{ position: 'absolute', top: 12, left: 12, height: 30, padding: '0 11px', borderRadius: 15, background: 'rgba(255,255,255,.92)', color: B.body, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={14} />En revisión</span>}
      {onHeart && (
        <span role="button" aria-label="Guardar" onClick={(e) => { e.stopPropagation(); onHeart(); }} style={{ position: 'absolute', top: 4, right: 4, width: 48, height: 48, display: 'grid', placeItems: 'center' }}>
          <Icon name="heart" size={25} color="white" stroke={2} fill={saved ? '#E11D48' : 'rgba(0,0,0,.35)'} />
        </span>
      )}
      {p.images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {p.images.map((_, k) => <span key={k} style={{ width: 6, height: 6, borderRadius: 3, background: 'white', opacity: k === i ? 1 : 0.55 }} />)}
        </div>
      )}
    </div>
  );
}

function BPriceLine({ p }) {
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}><b style={{ fontWeight: 700, color: B.ink }}>{fmtNumber(p.price)} FCFA</b> <span style={{ color: B.ink }}>{priceSuffix(p.priceType)}</span></span>;
}

function BExplore({ s }) {
  const list = s.list();
  return (
    <div style={{ background: 'white', minHeight: '100%' }}>
      <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 3, boxShadow: '0 1px 0 #EBEBEB, 0 6px 12px -10px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '8px 20px 0' }}>
          <button style={{ width: '100%', height: 58, borderRadius: 29, background: 'white', boxShadow: '0 3px 12px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Icon name="search" size={19} color={B.ink} stroke={2.2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: B.ink }}>¿Dónde quieres vivir?</span>
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 8px 0' }}>
          {B_CATS.map(([c, icon]) => {
            const on = s.category === c;
            return (
              <button key={c} onClick={() => s.setCategory(c)} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '4px 6px 10px', minWidth: 70, color: on ? B.ink : B.body, borderBottom: `2px solid ${on ? B.ink : 'transparent'}` }}>
                <Icon name={icon} size={24} stroke={on ? 2 : 1.6} />
                <span style={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '18px 20px 28px', display: 'grid', gap: 26 }}>
        {list.map((p) => (
          <button key={p.id} onClick={() => s.open(p.id)} style={{ textAlign: 'left', display: 'grid', gap: 10 }}>
            <BCarousel p={p} height={330} onHeart={() => s.toggleSaved(p.id)} saved={s.saved.includes(p.id)} />
            <div style={{ display: 'grid', gap: 2, fontSize: 15, lineHeight: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b style={{ fontWeight: 700, color: B.ink }}>{p.short}</b>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: B.ink }}><Icon name="star" size={13} color={B.ink} fill={B.ink} />{p.rating.toString().replace('.', ',')} ({p.reviews})</span>
              </div>
              <span style={{ color: B.body }}>{p.bedrooms} hab. · {p.bathrooms} baños · {p.area} m²</span>
              <span style={{ color: B.body }}>Propietario: {p.owner}</span>
              <span style={{ marginTop: 4 }}><BPriceLine p={p} /></span>
            </div>
          </button>
        ))}
      </div>
      <button style={{ position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)', height: 46, padding: '0 18px', borderRadius: 23, background: B.ink, color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(0,0,0,.25)', zIndex: 3 }}>Mapa<Icon name="map" size={17} color="white" /></button>
    </div>
  );
}

function BDetail({ s }) {
  const p = byId(s.detail);
  return (
    <div style={{ background: 'white', minHeight: '100%', paddingBottom: 92 }}>
      <div style={{ position: 'relative' }}>
        <BCarousel p={p} height={300} radius={0} badge={false} />
        <button onClick={s.back} aria-label="Volver" style={{ position: 'absolute', top: 10, left: 16, width: 40, height: 40, borderRadius: 20, background: 'white', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}><Icon name="left" size={20} color={B.ink} stroke={2.2} /></button>
        <button onClick={() => s.toggleSaved(p.id)} aria-label="Guardar" style={{ position: 'absolute', top: 10, right: 16, width: 40, height: 40, borderRadius: 20, background: 'white', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}><Icon name="heart" size={19} color={s.saved.includes(p.id) ? '#E11D48' : B.ink} fill={s.saved.includes(p.id) ? '#E11D48' : 'none'} stroke={2} /></button>
      </div>
      <div style={{ position: 'relative', marginTop: -24, background: 'white', borderRadius: '24px 24px 0 0', padding: '26px 24px 0' }}>
        <h2 style={{ margin: 0, textAlign: 'center', fontSize: 25, lineHeight: '31px', fontWeight: 700, color: B.ink, letterSpacing: -0.3 }}>{p.title}</h2>
        <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 15, color: B.body }}>{p.category === 'Casas' ? 'Casa entera' : 'Vivienda entera'} en {p.location}</p>
        <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 15, color: B.body }}>{p.bedrooms} habitaciones · {p.bathrooms} baños · {p.area} m²</p>
        <div style={{ margin: '20px 0 0', border: `1px solid ${B.line}`, borderRadius: 16, display: 'grid', gridTemplateColumns: '1.25fr 1px .8fr 1px .8fr', alignItems: 'center', padding: '14px 4px' }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
            <Logo size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: B.ink, textAlign: 'center', lineHeight: '16px' }}>Verificada por<br />CasaSeg</span>
          </div>
          <span style={{ height: 38, background: B.line }} />
          <div style={{ display: 'grid', justifyItems: 'center' }}><b style={{ fontSize: 18, color: B.ink }}>{p.rating.toString().replace('.', ',')}</b><span style={{ display: 'flex', gap: 1 }}>{[0, 1, 2, 3, 4].map((k) => <Icon key={k} name="star" size={10} color={B.ink} fill={B.ink} />)}</span></div>
          <span style={{ height: 38, background: B.line }} />
          <div style={{ display: 'grid', justifyItems: 'center' }}><b style={{ fontSize: 18, color: B.ink }}>{p.reviews}</b><span style={{ fontSize: 12, color: B.ink, textDecoration: 'underline' }}>reseñas</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 0', borderBottom: `1px solid ${B.line}` }}>
          <span style={{ position: 'relative' }}>
            <img src={p.ownerAvatar} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', display: 'block' }} />
            <span style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, background: B.teal, border: '2px solid white', display: 'grid', placeItems: 'center' }}><Icon name="check" size={12} color="white" stroke={3} /></span>
          </span>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: B.ink }}>Propietaria: {p.owner}</div><div style={{ fontSize: 14, color: B.body }}>Identidad comprobada</div></div>
        </div>
        {[['shield', 'Documentación revisada', `Folio ${p.folio}, revisado el ${p.verifiedOn}.`], ['key', 'Visita antes de firmar', 'Conoces la vivienda y a la propietaria en persona.'], ['wallet', 'Pagos con recibo', 'Cada pago queda registrado en la app.']].map(([icon, t, d]) => (
          <div key={t} style={{ display: 'flex', gap: 16, padding: '14px 0 0' }}>
            <Icon name={icon} size={24} color={B.ink} stroke={1.6} />
            <div><div style={{ fontSize: 16, fontWeight: 600, color: B.ink }}>{t}</div><div style={{ fontSize: 14, lineHeight: '20px', color: B.body }}>{d}</div></div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: 'white', borderTop: `1px solid ${B.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 5 }}>
        <div style={{ fontSize: 15, lineHeight: '20px' }}><span style={{ textDecoration: 'underline' }}><BPriceLine p={p} /></span><div style={{ fontSize: 13, color: B.body }}>Folio {p.folio}</div></div>
        <button onClick={s.openSheet} style={{ height: 50, padding: '0 24px', borderRadius: 10, background: B.action, color: 'white', fontSize: 16, fontWeight: 700 }}>Reservar visita</button>
      </div>
    </div>
  );
}

function BVisitSheet({ s }) {
  const p = byId(s.detail);
  const day = VISIT_DAYS.find((d) => d.id === s.visit.day);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', height: SCREEN_H - 30, background: 'white', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', fontFamily: B.font }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${B.line}` }}>
          <button onClick={s.closeSheet} aria-label="Cerrar" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}><Icon name="close" size={18} color={B.ink} stroke={2.2} /></button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, marginRight: 44 }}>Solicitar visita</span>
        </div>
        {s.visit.sent ? (
          <div style={{ flex: 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
            <span style={{ width: 64, height: 64, borderRadius: 32, background: B.tealSoft, display: 'grid', placeItems: 'center' }}><Icon name="check" size={30} color={B.teal} stroke={2.4} /></span>
            <div style={{ fontSize: 24, fontWeight: 700, color: B.ink }}>¡Solicitud enviada!</div>
            <div style={{ fontSize: 16, lineHeight: '23px', color: B.body }}>{p.owner} tiene tu propuesta para el {day.dow.toLowerCase()} {day.day} a las {s.visit.time}. Te escribiremos en cuanto la confirme.</div>
            <button onClick={s.closeSheet} style={{ marginTop: 10, height: 50, padding: '0 28px', borderRadius: 10, background: B.ink, color: 'white', fontSize: 16, fontWeight: 700 }}>Volver a la vivienda</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingBottom: 20, borderBottom: `1px solid ${B.line}` }}>
                <img src={p.images[0]} alt="" style={{ width: 96, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                <div><div style={{ fontSize: 16, fontWeight: 700 }}>{p.short}</div><div style={{ fontSize: 14, color: B.body, marginTop: 2 }}>Con {p.owner}</div></div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, margin: '22px 0 12px' }}>¿Qué día te viene bien?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {VISIT_DAYS.map((d) => {
                  const on = s.visit.day === d.id;
                  return <button key={d.id} onClick={() => s.setVisit({ day: d.id })} style={{ width: 70, height: 76, borderRadius: 14, border: on ? `2px solid ${B.ink}` : `1px solid ${B.line}`, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 2 }}><span style={{ fontSize: 13, color: B.body }}>{d.dow}</span><span style={{ fontSize: 22, fontWeight: 700 }}>{d.day}</span></button>;
                })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, margin: '24px 0 12px' }}>¿A qué hora?</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {VISIT_TIMES.map((t) => {
                  const on = s.visit.time === t;
                  return <button key={t} onClick={() => s.setVisit({ time: t })} style={{ height: 44, padding: '0 20px', borderRadius: 22, border: on ? `2px solid ${B.ink}` : `1px solid #B0B0B0`, fontSize: 15, fontWeight: 600, background: on ? B.soft : 'white' }}>{t}</button>;
                })}
              </div>
              <div style={{ fontSize: 14, lineHeight: '20px', color: B.body, marginTop: 22, display: 'flex', gap: 10 }}><Icon name="shield" size={20} color={B.teal} />Por tu seguridad, la dirección exacta se comparte cuando {p.owner.split(' ')[0]} confirma la visita.</div>
            </div>
            <div style={{ height: 84, borderTop: `1px solid ${B.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
              <button onClick={s.closeSheet} style={{ fontSize: 16, fontWeight: 600, textDecoration: 'underline', height: 44 }}>Cancelar</button>
              <button onClick={() => s.setVisit({ sent: true })} style={{ height: 50, padding: '0 24px', borderRadius: 10, background: B.action, color: 'white', fontSize: 16, fontWeight: 700 }}>Enviar solicitud</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BOwner() {
  const [requests, setRequests] = React.useState(OWNER_REQUESTS);
  const [view, setView] = React.useState('hoy');
  const pending = requests.filter((r) => r.status === 'pending');
  return (
    <div style={{ background: 'white', minHeight: '100%', padding: '10px 0 24px' }}>
      <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: B.body }}>Modo propietaria</span>
        <img src="img/owner-elena.jpg" alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover' }} />
      </div>
      <h1 style={{ margin: '14px 24px 0', fontSize: 30, lineHeight: '36px', fontWeight: 800, color: B.ink, letterSpacing: -0.6 }}>Bienvenida,<br />Elena</h1>
      <div style={{ display: 'flex', gap: 8, padding: '18px 24px 0' }}>
        {[['hoy', `Pendientes (${pending.length})`], ['prox', 'Confirmadas']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{ height: 40, padding: '0 16px', borderRadius: 20, border: `1px solid ${view === k ? B.ink : B.line}`, background: view === k ? B.ink : 'white', color: view === k ? 'white' : B.ink, fontSize: 14, fontWeight: 600 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '16px 24px 4px' }}>
        {(view === 'hoy' ? pending : requests.filter((r) => r.status === 'confirmed')).map((r) => (
          <div key={r.id} style={{ flex: '0 0 250px', border: `1px solid ${B.line}`, borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: r.status === 'pending' ? B.blue : B.teal }}>{r.status === 'pending' ? 'Solicitud de visita' : 'Visita confirmada'}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: B.ink, marginTop: 6 }}>{r.name}</div>
            <div style={{ fontSize: 14, color: B.body, marginTop: 2 }}>{r.when}</div>
            <div style={{ fontSize: 14, color: B.body }}>{r.property}</div>
            {r.status === 'pending' && <button onClick={() => setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'confirmed' } : x)))} style={{ marginTop: 14, width: '100%', height: 44, borderRadius: 10, border: `1px solid ${B.ink}`, fontSize: 15, fontWeight: 700 }}>Confirmar</button>}
          </div>
        ))}
      </div>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: B.ink, marginBottom: 14 }}>Tus viviendas</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src="img/malabo-1.jpg" alt="" style={{ width: 88, height: 88, borderRadius: 14, objectFit: 'cover' }} />
          <div style={{ display: 'grid', gap: 3 }}>
            <b style={{ fontSize: 16, color: B.ink }}>Apartamento en Malabo II</b>
            <span style={{ fontSize: 14, color: B.teal, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}><Icon name="shield" size={15} />Publicada · verificada</span>
            <span style={{ fontSize: 14, color: B.body }}>1.200.000 FCFA cobrados en octubre</span>
          </div>
        </div>
        <button style={{ marginTop: 20, width: '100%', height: 50, borderRadius: 10, border: `1px solid ${B.ink}`, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="plus" size={18} stroke={2.2} />Publicar una vivienda</button>
      </div>
    </div>
  );
}

function BTabBar({ s }) {
  const tabs = [['explore', 'Explorar', 'search'], ['saved', 'Guardados', 'heart'], ['messages', 'Mensajes', 'chat'], ['profile', 'Propietaria', 'user']];
  return (
    <nav style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: 'white', borderTop: `1px solid ${B.line}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', zIndex: 4 }}>
      {tabs.map(([k, label, icon]) => {
        const on = s.tab === k;
        return <button key={k} onClick={() => s.setTab(k)} style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 3, color: on ? B.blue : B.body }}><Icon name={icon} size={23} stroke={on ? 2.2 : 1.7} /><span style={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{label}</span></button>;
      })}
    </nav>
  );
}

function BPhone({ initial }) {
  const s = usePhoneState(initial);
  let screen;
  if (s.detail) screen = <BDetail s={s} />;
  else if (s.tab === 'explore') screen = <BExplore s={s} />;
  else if (s.tab === 'profile') screen = <BOwner />;
  else if (s.tab === 'saved') screen = (
    <div style={{ padding: '10px 24px' }}>
      <h1 style={{ margin: '4px 0 18px', fontSize: 30, fontWeight: 800, color: B.ink }}>Guardados</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {PROPERTIES.filter((p) => s.saved.includes(p.id)).map((p) => (
          <button key={p.id} onClick={() => s.open(p.id)} style={{ textAlign: 'left' }}><img src={p.images[0]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 14 }} /><div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{p.short}</div><div style={{ fontSize: 13, color: B.body }}>{legalLabel(p.legal)}</div></button>
        ))}
      </div>
    </div>
  );
  else screen = (
    <div style={{ padding: '10px 24px' }}>
      <h1 style={{ margin: '4px 0 12px', fontSize: 30, fontWeight: 800, color: B.ink }}>Mensajes</h1>
      {[['Elena Nsue', 'Perfecto, nos vemos el sábado a las 10:00.', '09:41', 'img/owner-elena.jpg'], ['Miguel Obiang', 'Le envío el contrato de arras por la app.', 'Ayer', 'img/owner-miguel.jpg']].map(([n, m, t, a]) => (
        <div key={n} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: `1px solid ${B.line}`, alignItems: 'center' }}>
          <img src={a} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 16 }}>{n}</b><span style={{ fontSize: 13, color: B.body }}>{t}</span></div><div style={{ fontSize: 14, color: B.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</div></div>
        </div>
      ))}
    </div>
  );
  return (
    <IosFrame>
      <div style={{ position: 'relative', height: SCREEN_H, fontFamily: B.font, color: B.ink, overflow: 'hidden', background: 'white' }}>
        <div style={{ height: s.detail ? SCREEN_H : SCREEN_H - 64, overflowY: 'auto' }}>{screen}</div>
        {!s.detail && <BTabBar s={s} />}
        {s.detail && s.sheet && <BVisitSheet s={s} />}
      </div>
    </IosFrame>
  );
}

const DIRECTION = {
  title: 'B · Foto primero',
  subtitle: 'Referente real: app de Airbnb 2025 (Gold Pencil, The One Show · UX/UI móvil) — la foto manda; los laureles se vuelven la cerradura de CasaSeg.',
  background: '#F2F2F2',
  labelColor: '#5E5E5E',
  Phone: BPhone,
};

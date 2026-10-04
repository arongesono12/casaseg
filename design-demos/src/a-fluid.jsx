// FONTS: https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap
// Direction A · Franja fluida — roulette #14 "Angled Fluid Gradient" (Stripe DNA).
// Color: the fluid band is the logo's own gradient (#1D65A2 → #14B3AA) widened with the action
// blue; everything under the angle is a rational, hairline-ruled grid on white.

const A = {
  font: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
  ink: '#0A2540', body: '#425466', line: '#E3E8EE', canvas: '#F6F9FC', white: '#FFFFFF',
  blue: '#2563EB', blueDeep: '#1D65A2', teal: '#0F766E', tealSoft: '#E6F4F1', amberInk: '#92400E', amberSoft: '#FEF3C7',
  band: 'radial-gradient(120% 90% at 100% 0%, rgba(125,211,252,.55) 0%, rgba(125,211,252,0) 55%), radial-gradient(90% 80% at 0% 100%, rgba(20,179,170,.85) 0%, rgba(20,179,170,0) 60%), linear-gradient(120deg, #123E6B 0%, #1D65A2 38%, #2563EB 70%, #14B3AA 120%)',
};

function AChip({ legal }) {
  const ok = legal === 'verified';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 9px', borderRadius: 6, background: ok ? A.tealSoft : A.amberSoft, color: ok ? A.teal : A.amberInk, fontSize: 12, fontWeight: 700 }}>
      <Icon name={ok ? 'shield' : 'clock'} size={14} stroke={2} />{legalLabel(legal)}
    </span>
  );
}

function AFacts({ p, boxed }) {
  const cells = [['Hab.', p.bedrooms], ['Baños', p.bathrooms], ['Superficie', `${p.area} m²`]];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: boxed ? `1px solid ${A.line}` : 'none', borderTop: `1px solid ${A.line}`, borderBottom: `1px solid ${A.line}`, borderRadius: boxed ? 10 : 0 }}>
      {cells.map(([k, v], i) => (
        <div key={k} style={{ padding: boxed ? '12px 14px' : '10px 0 10px ' + (i ? 12 : 0) + 'px', borderLeft: i ? `1px solid ${A.line}` : 'none' }}>
          <div style={{ fontSize: 12, color: A.body, fontWeight: 500 }}>{k}</div>
          <div style={{ fontSize: 16, color: A.ink, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function APrice({ p, size = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: size, fontWeight: 800, color: A.ink, letterSpacing: -0.2 }}>{fmtNumber(p.price)} FCFA</span>
      <span style={{ fontSize: 14, color: A.body }}>{priceSuffix(p.priceType)}</span>
    </div>
  );
}

function ABand({ height, children }) {
  return (
    <div style={{ position: 'relative', height, background: A.band, clipPath: 'polygon(0 0, 100% 0, 100% 78%, 0 100%)', color: 'white' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px)' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function AExplore({ s }) {
  const list = s.list();
  return (
    <div style={{ background: A.white, minHeight: '100%' }}>
      <ABand height={236}>
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo size={22} mono="#FFFFFF" /><span style={{ fontWeight: 700, fontSize: 17 }}>CasaSeg</span></div>
          <button aria-label="Notificaciones" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}><Icon name="bell" size={21} color="white" /></button>
        </div>
        <h1 style={{ margin: '14px 20px 0', fontSize: 28, lineHeight: '33px', fontWeight: 800, letterSpacing: -0.6 }}>Viviendas verificadas<br />en Guinea Ecuatorial</h1>
        <p style={{ margin: '8px 20px 0', fontSize: 15, lineHeight: '21px', color: 'rgba(255,255,255,.92)' }}>Cada folio revisado antes de publicarse.</p>
      </ABand>
      <div style={{ margin: '-46px 16px 0', position: 'relative', height: 54, background: 'white', borderRadius: 12, boxShadow: '0 13px 27px -5px rgba(50,50,93,.25), 0 8px 16px -8px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 0 16px' }}>
        <Icon name="search" size={19} color={A.body} />
        <span style={{ flex: 1, fontSize: 15, color: A.body }}>¿Dónde quieres vivir?</span>
        <button aria-label="Filtros" style={{ width: 42, height: 42, borderRadius: 9, background: A.canvas, display: 'grid', placeItems: 'center' }}><Icon name="sliders" size={18} color={A.ink} /></button>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '18px 16px 0', overflowX: 'auto' }}>
        {CATEGORIES.map((c) => {
          const on = s.category === c;
          return <button key={c} onClick={() => s.setCategory(c)} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${on ? A.ink : A.line}`, background: on ? A.ink : 'white', color: on ? 'white' : A.ink, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</button>;
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 10px' }}>
        <span style={{ fontSize: 14, color: A.body }}><b style={{ color: A.ink, fontVariantNumeric: 'tabular-nums' }}>{list.length}</b> propiedades · {list.filter((p) => p.legal === 'verified').length} verificadas</span>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, color: A.blue, fontSize: 14, fontWeight: 700 }}><Icon name="map" size={17} />Mapa</button>
      </div>
      <div style={{ padding: '0 16px 24px', display: 'grid', gap: 22 }}>
        {list.map((p) => (
          <button key={p.id} onClick={() => s.open(p.id)} style={{ textAlign: 'left', display: 'grid', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <img src={p.images[0]} alt="" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <span style={{ position: 'absolute', top: 10, left: 10 }}><AChip legal={p.legal} /></span>
              <span role="button" aria-label="Guardar" onClick={(e) => { e.stopPropagation(); s.toggleSaved(p.id); }} style={{ position: 'absolute', top: 6, right: 6, width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
                <span style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center' }}><Icon name="heart" size={17} color={s.saved.includes(p.id) ? '#E11D48' : A.ink} fill={s.saved.includes(p.id) ? '#E11D48' : 'none'} /></span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, lineHeight: '23px', fontWeight: 700, color: A.ink }}>{p.title}</div>
                <div style={{ fontSize: 14, color: A.body, marginTop: 2 }}>{p.location}</div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: A.ink, fontWeight: 600, height: 23 }}><Icon name="star" size={14} color={A.ink} fill={A.ink} />{p.rating.toString().replace('.', ',')}</span>
            </div>
            <AFacts p={p} />
            <APrice p={p} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ADetail({ s }) {
  const p = byId(s.detail);
  return (
    <div style={{ background: 'white', minHeight: '100%', paddingBottom: 96 }}>
      <div style={{ position: 'relative' }}>
        <img src={p.images[0]} alt="" style={{ width: '100%', height: 290, objectFit: 'cover', display: 'block', clipPath: 'polygon(0 0, 100% 0, 100% 86%, 0 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 44, background: A.band, clipPath: 'polygon(0 86%, 100% 0, 100% 14%, 0 100%)', opacity: 0.95 }} />
        <button onClick={s.back} aria-label="Volver" style={{ position: 'absolute', top: 8, left: 12, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center' }}><Icon name="left" size={22} color={A.ink} /></button>
        <button onClick={() => s.toggleSaved(p.id)} aria-label="Guardar" style={{ position: 'absolute', top: 8, right: 12, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center' }}><Icon name="heart" size={20} color={s.saved.includes(p.id) ? '#E11D48' : A.ink} fill={s.saved.includes(p.id) ? '#E11D48' : 'none'} /></button>
        <span style={{ position: 'absolute', right: 16, bottom: 52, background: 'rgba(10,37,64,.72)', color: 'white', fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6 }}>1 / {p.images.length}</span>
      </div>
      <div style={{ padding: '6px 20px 0', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AChip legal={p.legal} /><span style={{ fontSize: 14, color: A.body }}><b style={{ color: A.ink }}>{p.rating.toString().replace('.', ',')}</b> · {p.reviews} reseñas</span></div>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: '30px', fontWeight: 800, color: A.ink, letterSpacing: -0.4 }}>{p.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 15, color: A.body }}><Icon name="pin" size={16} />{p.location}</div>
        </div>
        <AFacts p={p} boxed />
        <section>
          <div style={{ fontSize: 13, fontWeight: 700, color: A.blueDeep, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Expediente</div>
          {[
            ['Estado legal', <span style={{ color: A.teal, fontWeight: 700 }}>Verificada · {p.verifiedOn}</span>],
            ['Folio', <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.folio}</span>],
            ['Propietario', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><img src={p.ownerAvatar} alt="" style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover' }} />{p.owner}<Icon name="shield" size={15} color={A.teal} /></span>],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, borderTop: `1px solid ${A.line}`, fontSize: 15 }}>
              <span style={{ color: A.body }}>{k}</span><span style={{ color: A.ink, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </section>
        <section>
          <div style={{ fontSize: 13, fontWeight: 700, color: A.blueDeep, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Incluye</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            {p.amenities.map((a) => <span key={a} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, color: A.ink }}><Icon name="check" size={16} color={A.teal} stroke={2.2} />{a}</span>)}
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 15, lineHeight: '22px', color: A.body }}>{p.description}</p>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: '#FFFFFF', borderTop: `1px solid ${A.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 20px', gap: 12, zIndex: 5 }}>
        <div><APrice p={p} size={17} /><div style={{ fontSize: 12, color: A.body, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>Folio {p.folio}</div></div>
        <button onClick={s.openSheet} style={{ height: 48, padding: '0 20px', borderRadius: 10, background: A.blue, color: 'white', fontSize: 16, fontWeight: 700, boxShadow: '0 6px 14px -4px rgba(37,99,235,.55)' }}>Reservar visita</button>
      </div>
    </div>
  );
}

function AVisitSheet({ s }) {
  const p = byId(s.detail);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={s.closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(10,37,64,.45)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: '10px 20px 24px', fontFamily: A.font }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: A.line, margin: '0 auto 14px' }} />
        {s.visit.sent ? (
          <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 10, padding: '18px 0 6px' }}>
            <span style={{ width: 56, height: 56, borderRadius: 28, background: A.tealSoft, display: 'grid', placeItems: 'center' }}><Icon name="check" size={28} color={A.teal} stroke={2.4} /></span>
            <div style={{ fontSize: 20, fontWeight: 800, color: A.ink }}>Solicitud enviada</div>
            <div style={{ fontSize: 15, lineHeight: '22px', color: A.body, maxWidth: 280 }}>{p.owner} recibirá tu propuesta para el {VISIT_DAYS.find((d) => d.id === s.visit.day).dow.toLowerCase()} {VISIT_DAYS.find((d) => d.id === s.visit.day).day} a las {s.visit.time}. Te avisaremos al confirmar.</div>
            <button onClick={s.closeSheet} style={{ marginTop: 8, height: 48, width: '100%', borderRadius: 10, background: A.ink, color: 'white', fontSize: 16, fontWeight: 700 }}>Hecho</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 20, lineHeight: '26px', fontWeight: 800, color: A.ink }}>Solicitar visita</div>
            <div style={{ fontSize: 14, color: A.body, marginTop: 2 }}>{p.short} · con {p.owner}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: A.ink, margin: '18px 0 8px' }}>Día</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {VISIT_DAYS.map((d) => {
                const on = s.visit.day === d.id;
                return <button key={d.id} onClick={() => s.setVisit({ day: d.id })} style={{ height: 64, borderRadius: 10, border: `1.5px solid ${on ? A.blue : A.line}`, background: on ? '#EFF6FF' : 'white', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 2 }}><span style={{ fontSize: 12, color: on ? A.blue : A.body, fontWeight: 600 }}>{d.dow}</span><span style={{ fontSize: 20, fontWeight: 800, color: on ? A.blue : A.ink, fontVariantNumeric: 'tabular-nums' }}>{d.day}</span></button>;
              })}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: A.ink, margin: '16px 0 8px' }}>Hora</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {VISIT_TIMES.map((t) => {
                const on = s.visit.time === t;
                return <button key={t} onClick={() => s.setVisit({ time: t })} style={{ flex: 1, height: 44, borderRadius: 10, border: `1.5px solid ${on ? A.blue : A.line}`, background: on ? '#EFF6FF' : 'white', color: on ? A.blue : A.ink, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{t}</button>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, padding: 12, borderRadius: 10, background: A.canvas, fontSize: 14, lineHeight: '20px', color: A.body }}>
              <Icon name="shield" size={18} color={A.teal} style={{ marginTop: 1 }} />La dirección exacta se comparte cuando {p.owner.split(' ')[0]} confirma. No pagues nada fuera de CasaSeg.
            </div>
            <button onClick={() => s.setVisit({ sent: true })} style={{ marginTop: 16, height: 52, width: '100%', borderRadius: 10, background: A.blue, color: 'white', fontSize: 16, fontWeight: 700 }}>Enviar solicitud</button>
          </>
        )}
      </div>
    </div>
  );
}

function AOwner({ s }) {
  const [requests, setRequests] = React.useState(OWNER_REQUESTS);
  const pending = requests.filter((r) => r.status === 'pending').length;
  return (
    <div style={{ background: A.canvas, minHeight: '100%', paddingBottom: 24 }}>
      <ABand height={196}>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="img/owner-elena.jpg" alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover', border: '2px solid rgba(255,255,255,.8)' }} />
          <div><div style={{ fontSize: 14, color: 'rgba(255,255,255,.9)' }}>Panel de propietario</div><div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Hola, Elena</div></div>
        </div>
      </ABand>
      <div style={{ margin: '-78px 16px 0', position: 'relative', background: 'white', borderRadius: 12, boxShadow: '0 13px 27px -5px rgba(50,50,93,.2), 0 8px 16px -8px rgba(0,0,0,.2)', display: 'grid', gridTemplateColumns: '1fr 1fr 1.35fr' }}>
        {[['Visitas', pending, 'pendientes'], ['Publicada', 1, 'verificada'], ['Cobrado', '1,2 M', 'FCFA · oct']].map(([k, v, d], i) => (
          <div key={k} style={{ padding: '14px 12px', borderLeft: i ? `1px solid ${A.line}` : 'none' }}>
            <div style={{ fontSize: 12, color: A.body, fontWeight: 600 }}>{k}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: A.ink, fontVariantNumeric: 'tabular-nums', lineHeight: '30px' }}>{v}</div>
            <div style={{ fontSize: 12, color: A.body }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: A.ink }}>Solicitudes de visita</span>
          <span style={{ fontSize: 14, color: A.blue, fontWeight: 700 }}>Ver todas</span>
        </div>
        <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${A.line}` }}>
          {requests.map((r, i) => (
            <div key={r.id} style={{ padding: '14px 14px', borderTop: i ? `1px solid ${A.line}` : 'none', display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div><div style={{ fontSize: 16, fontWeight: 700, color: A.ink }}>{r.name}</div><div style={{ fontSize: 14, color: A.body, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{r.when}</div></div>
                {r.status === 'confirmed' && <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: A.teal, background: A.tealSoft, borderRadius: 6, padding: '5px 8px' }}>Confirmada</span>}
              </div>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'confirmed' } : x)))} style={{ flex: 1, height: 44, borderRadius: 9, background: A.blue, color: 'white', fontSize: 15, fontWeight: 700 }}>Confirmar</button>
                  <button style={{ flex: 1, height: 44, borderRadius: 9, border: `1px solid ${A.line}`, color: A.ink, fontSize: 15, fontWeight: 600 }}>Otra hora</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button style={{ marginTop: 16, width: '100%', height: 52, borderRadius: 10, border: `1.5px dashed #B8C4D2`, color: A.ink, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'white' }}><Icon name="plus" size={18} />Publicar otra propiedad</button>
      </div>
    </div>
  );
}

function ASimpleList({ title, rows }) {
  return (
    <div style={{ background: 'white', minHeight: '100%' }}>
      <div style={{ padding: '14px 20px 10px', fontSize: 28, fontWeight: 800, color: A.ink, letterSpacing: -0.5 }}>{title}</div>
      {rows}
    </div>
  );
}

function ATabBar({ s }) {
  const tabs = [['explore', 'Explorar', 'search'], ['saved', 'Guardados', 'heart'], ['messages', 'Mensajes', 'chat'], ['profile', 'Panel', 'building']];
  return (
    <nav style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: 'rgba(255,255,255,.97)', borderTop: `1px solid ${A.line}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', zIndex: 4 }}>
      {tabs.map(([k, label, icon]) => {
        const on = s.tab === k;
        return <button key={k} onClick={() => s.setTab(k)} style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 3, color: on ? A.blue : A.body }}><Icon name={icon} size={22} stroke={on ? 2.2 : 1.8} /><span style={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{label}</span></button>;
      })}
    </nav>
  );
}

function APhone({ initial }) {
  const s = usePhoneState(initial);
  let screen;
  if (s.detail) screen = <ADetail s={s} />;
  else if (s.tab === 'explore') screen = <AExplore s={s} />;
  else if (s.tab === 'profile') screen = <AOwner s={s} />;
  else if (s.tab === 'saved') screen = <ASimpleList title="Guardados" rows={PROPERTIES.filter((p) => s.saved.includes(p.id)).map((p) => (
    <button key={p.id} onClick={() => s.open(p.id)} style={{ display: 'flex', gap: 12, padding: '12px 20px', width: '100%', textAlign: 'left', borderTop: `1px solid ${A.line}` }}>
      <img src={p.images[0]} alt="" style={{ width: 84, height: 64, borderRadius: 8, objectFit: 'cover' }} />
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: A.ink }}>{p.short}</div><div style={{ margin: '4px 0' }}><AChip legal={p.legal} /></div><APrice p={p} size={15} /></div>
    </button>))} />;
  else screen = <ASimpleList title="Mensajes" rows={[['Elena Nsue', 'Perfecto, nos vemos el sábado a las 10:00.', '09:41', 'img/owner-elena.jpg'], ['Miguel Obiang', 'Le envío el contrato de arras por la app.', 'Ayer', 'img/owner-miguel.jpg']].map(([n, m, t, a]) => (
    <div key={n} style={{ display: 'flex', gap: 12, padding: '12px 20px', borderTop: `1px solid ${A.line}`, alignItems: 'center' }}>
      <img src={a} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover' }} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 16, color: A.ink }}>{n}</b><span style={{ fontSize: 13, color: A.body }}>{t}</span></div><div style={{ fontSize: 14, color: A.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</div></div>
    </div>))} />;
  return (
    <IosFrame darkMode={false}>
      <div style={{ position: 'relative', height: SCREEN_H, fontFamily: A.font, overflow: 'hidden', background: 'white' }}>
        <div style={{ height: s.detail ? SCREEN_H : SCREEN_H - 64, overflowY: 'auto' }}>{screen}</div>
        {!s.detail && <ATabBar s={s} />}
        {s.detail && s.sheet && <AVisitSheet s={s} />}
      </div>
    </IosFrame>
  );
}

const DIRECTION = {
  title: 'A · Franja fluida',
  subtitle: 'Ruleta #14 «Angled Fluid Gradient» (ADN Stripe) — el degradado del logo como franja inclinada; debajo, retícula racional con filetes.',
  background: '#E9EEF4',
  Phone: APhone,
};

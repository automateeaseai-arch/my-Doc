// Find the person: a real map (OpenStreetMap) with their live position, the safe zone,
// the path they walked, where you are, and a walking route to them. "Navigate" opens
// turn-by-turn directions in Google Maps. Made for people with dementia who wander.
import { useEffect, useRef, useState } from 'react';
import { s, A, I, toast } from '../ui.jsx';
import { updatePerson } from '../live.js';
import { ago, clock } from '../health.js';
import { distance, direction, metres, walkMinutes, walkingRoute, navigateUrl } from '../geo.js';

const RADII = [50, 100, 200, 500];

function useMyPosition() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!navigator.geolocation) { setErr('This phone cannot share its location'); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => { setErr(''); setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }); },
      (e) => setErr(e.code === 1 ? 'Allow location to see the route from you' : 'Finding your location…'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return [me, err];
}

function MapView({ p, me, route, fitKey, sheetH }) {
  const box = useRef(null), map = useRef(null), layers = useRef({}), L = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    import('../map.js').then(({ default: Leaflet }) => {
      if (!live || map.current) return;
      L.current = Leaflet;
      const m = Leaflet.map(box.current, { zoomControl: false, attributionControl: true }).setView([p.loc.lat, p.loc.lng], 16);
      Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      Leaflet.control.zoom({ position: 'topright' }).addTo(m);
      map.current = m;
      setReady(true);
    });
    return () => { live = false; if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  // draw / move everything when data changes
  useEffect(() => {
    if (!ready) return;
    const Lf = L.current, m = map.current, ly = layers.current, out = p.wander && p.wander.active;
    const put = (key, make, update) => { if (ly[key]) update(ly[key]); else ly[key] = make().addTo(m); };
    const drop = (key) => { if (ly[key]) { ly[key].remove(); delete ly[key]; } };
    if (p.zone && p.zone.on !== false) {
      const style = { color: out ? '#D62839' : '#0B7A75', weight: 2, fillColor: out ? '#D62839' : '#2BB5B0', fillOpacity: 0.12, dashArray: out ? '6 6' : null };
      put('zone', () => Lf.circle([p.zone.lat, p.zone.lng], { radius: p.zone.r, ...style }), (c) => { c.setLatLng([p.zone.lat, p.zone.lng]); c.setRadius(p.zone.r); c.setStyle(style); });
      put('home', () => Lf.marker([p.zone.lat, p.zone.lng], { icon: Lf.divIcon({ className: '', html: '<div class="md-map-home" title="Home">⌂</div>', iconSize: [26, 26], iconAnchor: [13, 13] }), keyboard: false, interactive: false }), (mk) => mk.setLatLng([p.zone.lat, p.zone.lng]));
    } else { drop('zone'); drop('home'); }
    const trail = (p.trail || []).filter((t) => t.at > Date.now() - 6 * 3600000).map((t) => [t.lat, t.lng]);
    if (trail.length > 1) put('trail', () => Lf.polyline(trail, { color: '#8A5300', weight: 4, opacity: 0.6, dashArray: '2 8', lineCap: 'round' }), (l) => l.setLatLngs(trail)); else drop('trail');
    if (route && route.points.length > 1) put('route', () => Lf.polyline(route.points.map((x) => [x.lat, x.lng]), { color: '#2F6FE0', weight: 5, opacity: 0.8 }), (l) => l.setLatLngs(route.points.map((x) => [x.lat, x.lng]))); else drop('route');
    if (me) {
      put('meAcc', () => Lf.circle([me.lat, me.lng], { radius: Math.min(me.acc || 30, 150), color: '#2F6FE0', weight: 1, fillOpacity: 0.1 }), (c) => { c.setLatLng([me.lat, me.lng]); c.setRadius(Math.min(me.acc || 30, 150)); });
      put('me', () => Lf.marker([me.lat, me.lng], { icon: Lf.divIcon({ className: '', html: '<div class="md-map-me" title="You"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false }), (mk) => mk.setLatLng([me.lat, me.lng]));
    }
    const html = `<div class="md-map-pin${out ? ' out' : ''}"><span style="background:${p.bg};color:${p.fg}">${p.ini}</span></div>`;
    put('person', () => Lf.marker([p.loc.lat, p.loc.lng], { icon: Lf.divIcon({ className: '', html, iconSize: [44, 52], iconAnchor: [22, 50] }), title: p.name, zIndexOffset: 1000 }), (mk) => { mk.setLatLng([p.loc.lat, p.loc.lng]); mk.setIcon(Lf.divIcon({ className: '', html, iconSize: [44, 52], iconAnchor: [22, 50] })); });
    // keep the person in view as they move
    m.panInside([p.loc.lat, p.loc.lng], { paddingTopLeft: [50, 90], paddingBottomRight: [70, sheetH + 30] });
  }, [ready, p.loc && p.loc.lat, p.loc && p.loc.lng, p.zone && JSON.stringify(p.zone), p.wander && p.wander.active, (p.trail || []).length, me && me.lat, me && me.lng, route]);

  // "show everything": the person, you and the safe zone
  useEffect(() => {
    if (!ready || !fitKey) return;
    const pts = [[p.loc.lat, p.loc.lng]];
    if (me) pts.push([me.lat, me.lng]);
    if (p.zone) pts.push([p.zone.lat, p.zone.lng]);
    const pad = { paddingTopLeft: [50, 90], paddingBottomRight: [70, sheetH + 30], maxZoom: 17 };
    map.current.fitBounds(pts.length > 1 ? pts : [pts[0], pts[0]], pad);
  }, [ready, fitKey]);

  return <div ref={box} role="application" aria-label={`Map showing ${p.name}`} style={s('position: absolute; inset: 0; background: #E8ECEF')} />;
}

export function Locate({ p }) {
  const contact = p.contacts[0];
  const hasLoc = !!(p.loc && p.loc.lat);
  const [me, meErr] = useMyPosition();
  const [route, setRoute] = useState(null);
  const [fit, setFit] = useState(0);
  const [showZone, setShowZone] = useState(false);
  const sheet = useRef(null);
  const [sheetH, setSheetH] = useState(300);
  useEffect(() => {
    if (!sheet.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSheetH(sheet.current.offsetHeight));
    ro.observe(sheet.current);
    return () => ro.disconnect();
  }, []);
  const lastRoute = useRef({ at: 0, from: null, to: null });
  const out = !!(p.wander && p.wander.active);

  // fit the map once both positions are known
  useEffect(() => { if (hasLoc) setFit((n) => n + 1); }, [hasLoc, !!me]);
  // walking route from you to them, refreshed as either moves
  useEffect(() => {
    if (!me || !hasLoc) return;
    const to = { lat: p.loc.lat, lng: p.loc.lng }, lr = lastRoute.current;
    if (lr.from && distance(lr.from, me) < 25 && distance(lr.to, to) < 25) return;
    if (Date.now() - lr.at < 12000) return;
    lastRoute.current = { at: Date.now(), from: me, to };
    walkingRoute(me, to).then((r) => r && setRoute(r));
  }, [me && me.lat, me && me.lng, hasLoc && p.loc.lat, hasLoc && p.loc.lng]);

  const shareText = `${p.name} is at ${p.address}${hasLoc ? ` (map: https://maps.google.com/?q=${p.loc.lat},${p.loc.lng})` : ''}. Sent from myDoc.`;
  const share = async () => {
    try { await navigator.share({ title: 'Location of ' + p.name, text: shareText }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(shareText); toast('Location copied'); } catch { toast(shareText); }
  };
  const setZone = async (patch) => {
    const z = { ...(p.zone || { lat: p.loc.lat, lng: p.loc.lng, r: 100, on: true, label: 'Home' }), ...patch, at: Date.now() };
    try { await updatePerson(p.id, { zone: z }); } catch { toast('Could not save the safe zone. Check your connection.'); }
  };

  const fromMe = me && hasLoc ? distance(me, p.loc) : null;
  const fromHome = p.zone && hasLoc ? Math.round(distance(p.zone, p.loc)) : null;
  const chip = 'padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap';
  const btnO = 'display: flex; height: 48px; align-items: center; justify-content: center; gap: 6px; border: 1.5px solid #0B7A75; color: #0B7A75; background: #FFFFFF; border-radius: 14px; font-size: 14px; font-weight: 600; font-family: inherit; text-decoration: none; cursor: pointer';

  return (
    <main style={s('height: 100dvh; box-sizing: border-box; background: #E8ECEF; position: relative; overflow: hidden')}>
      {hasLoc ? <MapView p={p} me={me} route={route} fitKey={fit} sheetH={sheetH} /> : <div style={s('position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; color: #5B6672')}>The map appears once {p.her} watch sends its location.</div>}
      <div style={s('position: absolute; z-index: 1000; left: 0; right: 0; top: 0; padding: 12px 16px; display: flex; align-items: center; gap: 8px')}>
        <A to={'/p/' + p.id + '/vitals'} aria-label="Back" style="display: flex; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; color: #0B7A75; background: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,32,43,0.12)"><I.back /></A>
        <div style={s('flex-grow: 1; min-width: 0; height: 44px; background: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,32,43,0.12); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>Where is {p.self ? 'my watch' : p.name}?</div>
        <span style={s('width: 44px; flex-shrink: 0')} />
      </div>
      {hasLoc && <div style={{ ...s('position: absolute; z-index: 1000; right: 12px; display: flex; flex-direction: column; gap: 10px'), bottom: sheetH + 12 }}>
        <button type="button" onClick={() => setFit((n) => n + 1)} aria-label="Show everyone on the map" style={s('width: 48px; height: 48px; border-radius: 24px; border: 0; background: #FFFFFF; color: #0B7A75; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(20,32,43,0.2)')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg></button>
        <button type="button" onClick={share} aria-label="Share location" style={s('width: 48px; height: 48px; border-radius: 24px; border: 0; background: #14202B; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(20,32,43,0.3)')}><I.share /></button>
      </div>}
      <div ref={sheet} className="md-sheet" style={s('position: absolute; z-index: 1000; left: 0; right: 0; bottom: 0; max-height: min(58dvh, 470px); overflow-y: auto; background: #FFFFFF; border-radius: 28px 28px 0 0; padding: 12px 20px max(24px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; box-shadow: 0 -10px 40px rgba(20,32,43,0.14); box-sizing: border-box')}>
        <div style={s('align-self: center; width: 40px; height: 5px; flex-shrink: 0; border-radius: 3px; background: #D5DBE0')} />
        {hasLoc && p.zone && p.zone.on !== false && (out
          ? <div role="status" className="md-wave" style={s('display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 16px; background: #D62839; color: #FFFFFF')}><span style={s('font-size: 20px')} aria-hidden="true">!</span><span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 15px; font-weight: 700')}>Outside the safe zone</span><span style={s('font-size: 12px')}>Left at {clock(new Date(p.wander.since))} · {metres(fromHome)} from home · updated {ago(p.loc.at)}</span></span></div>
          : <div style={s('display: flex; gap: 8px; align-items: center; flex-wrap: wrap')}><span style={s(chip + '; background: #E3F5F3; color: #075955')}>Inside the safe zone</span><span style={s('font-size: 12px; color: #5B6672')}>{p.zone.r} m around home</span></div>)}
        <div style={s('display: flex; gap: 12px; align-items: center')}>
          <span style={s('width: 44px; height: 44px; flex-shrink: 0; border-radius: 14px; background: #FDECEE; color: #D62839; display: flex; align-items: center; justify-content: center')}><I.pin size={22} /></span>
          <span style={s('display: flex; flex-direction: column; min-width: 0')}><span style={s('font-size: 16px; font-weight: 600')}>{p.address}</span><span style={s('font-size: 12px; color: #5B6672')}>{hasLoc ? `From ${p.her} watch's GPS · ${ago(p.loc.at)}` : `Appears once ${p.her} watch is linked`}</span></span>
        </div>
        {hasLoc && <div style={s('font-size: 14px; line-height: 1.5; color: #14202B')}>{fromMe != null ? <><b>{metres(route ? route.metres : fromMe)}</b> {direction(me, p.loc)} of you · about <b>{route ? Math.max(1, route.minutes) : walkMinutes(fromMe * 1.3)} min</b> on foot</> : <span style={s('color: #5B6672')}>{meErr || 'Finding your location…'}</span>}</div>}
        {hasLoc && <a href={navigateUrl(p.loc, fromMe != null && fromMe > 3000 ? 'driving' : 'walking')} target="_blank" rel="noopener" style={s('display: flex; height: 56px; flex-shrink: 0; align-items: center; justify-content: center; gap: 8px; background: #0B7A75; color: #FFFFFF; border-radius: 16px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(11,122,117,0.28)')}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3L3 10.5l7.5 2.9L13.4 21z" /></svg>Navigate to {p.self ? 'my watch' : p.name}</a>}
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; flex-shrink: 0')}>
          <A to={'/p/' + p.id + '/call'} style={btnO}><I.phone size={18} />Call</A>
          {contact && hasLoc ? <a href={'sms:' + contact.phone.replace(/[^\d+]/g, '') + '?body=' + encodeURIComponent(shareText)} style={s(btnO)}>Text {contact.name.split(' ')[0]}</a> : <button type="button" onClick={share} disabled={!hasLoc} style={s(btnO)}>Share location</button>}
        </div>
        <A to={'/p/' + p.id + '/sent'} style="display: flex; height: 48px; flex-shrink: 0; align-items: center; justify-content: center; border: 1.5px solid #D62839; color: #D62839; border-radius: 14px; font-size: 15px; font-weight: 600; text-decoration: none">Get emergency help</A>
        {hasLoc && <div style={s('display: flex; flex-direction: column; gap: 10px; padding-top: 4px; border-top: 1px solid #E4E8EC')}>
          <button type="button" aria-expanded={showZone} onClick={() => setShowZone(!showZone)} style={s('display: flex; justify-content: space-between; align-items: center; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; font-weight: 700; color: #14202B; cursor: pointer')}><span>Safe zone{p.zone ? (p.zone.on === false ? ' · off' : ` · ${p.zone.r} m`) : ''}</span><span style={s('color: #0B7A75; font-size: 13px')}>{showZone ? 'Done' : 'Change'}</span></button>
          {showZone && <>
            <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>If {p.self ? 'you leave' : p.she === 'they' ? 'they leave' : p.she + ' leaves'} this circle around home, caregivers get an urgent alert and the watch reports {p.her} position every 30 seconds.</span>
            <div style={s('display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px')}>
              {RADII.map((r) => <button key={r} type="button" aria-pressed={p.zone && p.zone.on !== false && p.zone.r === r} onClick={() => setZone({ r, on: true })} style={s('height: 40px; border-radius: 12px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; ' + (p.zone && p.zone.on !== false && p.zone.r === r ? 'background: #0B7A75; color: #FFFFFF; border: 0' : 'background: #F5F7F8; color: #14202B; border: 0'))}>{r} m</button>)}
              <button type="button" aria-pressed={!!(p.zone && p.zone.on === false)} onClick={() => setZone({ on: false })} style={s('height: 40px; border-radius: 12px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: 0; ' + (p.zone && p.zone.on === false ? 'background: #5B6672; color: #FFFFFF' : 'background: #F5F7F8; color: #14202B'))}>Off</button>
            </div>
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
              <button type="button" onClick={() => { setZone({ lat: p.loc.lat, lng: p.loc.lng, on: true }); toast('Home set to where ' + (p.self ? 'you are' : p.she + ' is') + ' now'); }} style={s(btnO + '; font-size: 13px')}>Home = {p.self ? 'my' : p.her} location</button>
              <button type="button" disabled={!me} onClick={() => { setZone({ lat: me.lat, lng: me.lng, on: true }); toast('Home set to your location'); }} style={s(btnO + '; font-size: 13px')}>Home = my location</button>
            </div>
          </>}
        </div>}
      </div>
    </main>
  );
}

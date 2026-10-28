// The caregiver's watch (designs WCPeople … WSettings): the same people, readings,
// medicine and alerts as the caregiver's phone, on a 198 × 242 face.
import { useEffect, useRef, useState } from 'react';
import { s } from '../ui.jsx';
import { useLive, markAlertsRead, sendToWatch, requestLink, readCode, METRICS, statusOf } from '../live.js';
import { ORDER, dayKey, ago } from '../health.js';
import { setOption, resetWatch, startCarerLink } from './sim.js';

// Extra colours the caregiver screens use, per watch theme (from the design files).
const extra = (dark) => (dark
  ? { circle: '#1C2329', border: '1px solid #2E3A45', key: '#1C2329', off: '#2E3A45', offInk: '#A9B4BE', map: '#1B1F22', road: '#2E3A45', hw: '#5C4A1E', park: '#1E2B1C', label: '#7A8691', chip: '#F2F4F5', chipInk: '#14202B', fab: '#2BB5B0', card: '#1C2329', bar: 'none', seg: '#1C2329', okBg: '#0E2E2C', okInk: '#5FD3CD', redTint: '#3A1418', redInk: '#FF8A92', amberTint: '#3A2A10', amberInk: '#F2B33D', dotOff: '#55606B', addBg: '#1C2329', addFg: '#2BB5B0', bellBg: '#3A1418', band: '#0E2E2C', unread: '#1A0E10', soft: '#2E3A45', btnLine: '#55606B' }
  : { circle: '#FFFFFF', border: '1px solid #EEF0F2', key: '#F5F7F8', off: '#E4E8EC', offInk: '#5B6672', map: '#EFEBE3', road: '#FFFFFF', hw: '#F6D58B', park: '#D7E8CF', label: '#7A6E5A', chip: '#14202B', chipInk: '#FFFFFF', fab: '#14202B', card: '#FFFFFF', bar: '0 3px 10px rgba(20,32,43,0.10)', seg: '#F5F7F8', okBg: '#E3F5F3', okInk: '#075955', redTint: '#FDECEE', redInk: '#A81C2B', amberTint: '#FFF1DB', amberInk: '#8A5300', dotOff: '#D5DBE0', addBg: '#F5F7F8', addFg: '#0B7A75', bellBg: '#FDECEE', band: '#E3F5F3', unread: '#FDF6F6', soft: '#E4E8EC', btnLine: '#5B6672' });

const WATCH_AV = [['#F7C9CE', '#7A1420'], ['#BFE8E4', '#064A46'], ['#FCE1B0', '#6B4100'], ['#D3DBF2', '#24396B']];
const tel = (n) => 'tel:' + String(n).replace(/[^\d+]/g, '');

const Logo = ({ t, size = 'sm' }) => <span style={{ ...s("display: flex; align-items: baseline; gap: 1px; font-family: 'Kaushan Script', cursive; line-height: 1; text-shadow: 0 2px 4px rgba(214,40,57,0.2)"), color: t.logo }}><span style={{ fontSize: size === 'lg' ? 13 : 11 }}>my</span><span style={{ fontSize: size === 'lg' ? 26 : 20 }}>DOC</span></span>;
const Back = ({ t, onClick }) => <button type="button" aria-label="Back" onClick={onClick} style={{ ...s('display: flex; width: 32px; height: 32px; align-items: center; border: 0; background: transparent; padding: 0; cursor: pointer'), color: t.teal }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6" /></svg></button>;
const Tick = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#14202B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const Bell = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
const Gear = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
const Chev = ({ left }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>;
const Phone = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" /></svg>;
const PillIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="M9.5 9.5l5 5" /></svg>;
const Pin = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>;
const Share = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D62839" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>;
const Close = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;

const base = (t, extraCss = '') => ({ ...s('width: 198px; height: 242px; box-sizing: border-box; font-family: Poppins, system-ui, sans-serif; display: flex; flex-direction: column; ' + extraCss), background: t.bg, color: t.fg });
const btn = 'display: flex; align-items: center; justify-content: center; border: 0; cursor: pointer; font-family: inherit; text-decoration: none; box-sizing: border-box';
const title = 'font-family: Marcellus, serif; letter-spacing: 0.3px';

// Alerts raised after the watch was opened pop up full screen (older ones stay in the list).
function useNewAlerts(people, onNew) {
  const since = useRef(Date.now());
  const seen = useRef(new Set());
  useEffect(() => {
    for (const p of people) for (const a of p.alerts) {
      const k = p.id + a.id;
      if (a.read || a.at < since.current || seen.current.has(k)) continue;
      seen.current.add(k);
      onNew({ ...a, p });
    }
  });
}

export default function CarerFace({ st, tBase }) {
  const t = { ...tBase, ...extra(st.theme === 'dark') };
  const live = useLive();
  const [nav, setNav] = useState(st.linked && !st.seenLinked ? { s: 'linked' } : { s: 'people' });
  const [i, setI] = useState(0);
  const [sent, setSent] = useState({});
  const [toggles, setToggles] = useState({ r: true, d: true, s: true });
  const go = (screen, extra) => setNav({ s: screen, ...extra });
  const people = live.people;
  const n = people.length;

  useNewAlerts(people, (a) => {
    if ((a.type === 'reading' && !toggles.r) || (a.type === 'dose' && !toggles.d)) return;
    if (navigator.vibrate) navigator.vibrate(a.type === 'sos' ? [400, 150, 400, 150, 400] : [200, 100, 200]);
    go(a.type === 'dose' ? 'missed' : 'alert', { a, pid: a.p.id });
  });
  useEffect(() => {
    const key = 'mydoc.watch.summary';
    if (!toggles.s || new Date().getHours() < 20 || !n) return;
    try { if (localStorage.getItem(key) === dayKey()) return; localStorage.setItem(key, dayKey()); } catch { return; }
    go('summary');
  }, [n > 0]);

  const P = (pid) => people.find((x) => x.id === pid);
  const av = (p, k) => WATCH_AV[(p.color ?? k) % WATCH_AV.length];
  const remind = async (p, msg, key) => { if (!p.watch) return; await sendToWatch(p, msg); setSent({ ...sent, [key]: true }); };

  if (!live.ready) return <div style={base(t, 'align-items: center; justify-content: center; gap: 10px')}><Logo t={t} size="lg" /><span style={{ fontSize: 10, color: t.muted }}>Syncing with your phone…</span></div>;

  // ---- linked (WPairedC) ----
  if (nav.s === 'linked') return (
    <div style={base(t, 'padding: 8px 14px 12px; align-items: center; gap: 6px; text-align: center')}>
      <Logo t={t} />
      <span className="md-pop" style={s('width: 44px; height: 44px; margin-top: 8px; border-radius: 22px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><Tick /></span>
      <span style={s(title + '; font-size: 22px')}>LINKED</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>Synced with your phone. You are looking after {n === 1 ? '1 person' : n + ' people'}.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => { setOption({ seenLinked: true }); go('people'); }} style={s(btn + '; width: 100%; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>CONTINUE</button>
    </div>
  );

  // ---- add a person: type the code from their watch (WCAddCode); they accept on their watch ----
  if (nav.s === 'addcode') return <AddCode t={t} onBack={() => go('people')} onAccepted={(pid) => { const k = people.findIndex((x) => x.id === pid); setI(k < 0 ? 0 : k); go('people'); }} />;

  // ---- full-screen alert (WCAlert) ----
  if (nav.s === 'alert' && P(nav.pid)) {
    const p = P(nav.pid), a = nav.a, k = a.k, r = k && p.vitals[k];
    return (
      <div style={base(t, 'padding: 6px 12px 8px; align-items: center; gap: 3px; text-align: center')}>
        <Logo t={t} />
        <span className="md-wave" style={s('width: 56px; height: 56px; margin-top: 6px; border-radius: 28px; background: #D62839; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ' + (a.type === 'sos' ? '15px' : '26px') + '; font-weight: 900')}>{a.type === 'sos' ? 'SOS' : '!'}</span>
        <span style={s(title + '; font-size: 12px; margin-top: 4px')}>{p.name.toUpperCase()} · {new Date(a.at).toTimeString().slice(0, 5)}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.red }}>{a.title.replace(' from ' + p.name, '')}</span>
        {r ? <span style={s('font-size: 24px; font-weight: 800; line-height: 1')}>{r.show}{k === 'o2' ? '%' : ''} <span style={s('font-size: 10px; font-weight: 800')}>{k === 'o2' ? 'SpO2' : METRICS[k].unit}</span></span> : <span style={{ fontSize: 11, color: t.muted }}>{p.shortAddress}</span>}
        <div style={s('flex-grow: 1')} />
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; width: 100%')}>
          <button type="button" onClick={() => go('call', { pid: p.id, from: 'people' })} style={s(btn + '; height: 36px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>Call</button>
          <button type="button" onClick={() => go('locate', { pid: p.id })} style={{ ...s(btn + '; height: 36px; border-radius: 12px; background: transparent; font-size: 12px; font-weight: 800'), border: '1.5px solid ' + t.btnLine, color: t.fg }}>locate</button>
        </div>
        <button type="button" onClick={() => go('people')} style={{ ...s('border: 0; background: transparent; font-size: 11px; font-weight: 600; padding: 4px 0; font-family: inherit; cursor: pointer'), color: t.muted }}>Dismiss</button>
      </div>
    );
  }

  // ---- missed dose (WCMissed) ----
  if (nav.s === 'missed' && P(nav.pid)) {
    const p = P(nav.pid), key = 'missed' + nav.a.id;
    return (
      <div style={base(t, 'padding: 6px 12px 8px; align-items: center; gap: 3px; text-align: center')}>
        <Logo t={t} />
        <span className="md-wave" style={{ ...s('width: 48px; height: 48px; margin-top: 6px; border-radius: 24px; display: flex; align-items: center; justify-content: center'), background: t.amberTint, color: t.amberInk }}><PillIcon /></span>
        <span style={s(title + '; font-size: 12px; letter-spacing: 0.4px; margin-top: 4px')}>DOSE NOT TAKEN YET</span>
        <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{nav.a.sub}</span>
        <span style={{ ...s('padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 700'), background: t.amberTint, color: t.amberInk }}>{ago(nav.a.at)}</span>
        <div style={s('flex-grow: 1')} />
        <button type="button" onClick={() => remind(p, { kind: 'dose', text: 'Please take your medicine.' }, key)} style={{ ...s(btn + '; width: 100%; height: 36px; border-radius: 12px; font-size: 12px; font-weight: 800'), background: sent[key] ? t.okBg : '#2BB5B0', color: sent[key] ? t.okInk : '#14202B' }}>{sent[key] ? 'REMINDER SENT' : 'REMIND ' + p.him.toUpperCase()}</button>
        <button type="button" onClick={() => go('call', { pid: p.id, from: 'people' })} style={{ ...s(btn + '; width: 100%; height: 30px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 700'), border: '1.5px solid ' + t.btnLine, color: t.fg }}>CALL {p.him.toUpperCase()}</button>
      </div>
    );
  }

  // ---- alerts list (WCAlerts) ----
  if (nav.s === 'alerts') {
    const all = people.flatMap((p) => p.alerts.map((a) => ({ ...a, p }))).sort((a, b) => b.at - a.at).slice(0, 12);
    const unread = all.filter((a) => !a.read).length;
    return (
      <div style={{ ...base(t, 'padding: 4px 10px 10px; gap: 6px; overflow-y: auto'), scrollbarWidth: 'none' }}>
        <div style={s('display: flex; align-items: center; justify-content: space-between')}>
          <Back t={t} onClick={() => go('people')} />
          <span style={s(title + '; font-size: 14px')}>ALERTS</span>
          <span style={{ ...s('padding: 1px 8px; border-radius: 999px; font-size: 9px; font-weight: 800'), background: unread ? '#D62839' : t.okBg, color: unread ? '#FFFFFF' : t.okInk }}>{unread ? unread + ' new' : 'read'}</span>
        </div>
        <div style={s('display: flex; flex-direction: column')}>
          {all.map((a, k) => {
            const u = !a.read;
            return (
              <button key={a.p.id + a.id} type="button" onClick={() => (a.type === 'sos' ? go('locate', { pid: a.p.id }) : a.type === 'dose' ? go('meds', { pid: a.p.id }) : a.k ? go('reading', { pid: a.p.id, k: a.k }) : go('vitals', { pid: a.p.id }))}
                style={{ ...s('display: flex; align-items: center; gap: 8px; padding: 7px 4px; border-radius: 10px; border: 0; text-align: left; font-family: inherit; cursor: pointer; flex-shrink: 0'), background: u ? t.unread : 'transparent', color: t.fg, borderBottom: k < all.length - 1 ? '1px solid ' + t.soft : 0 }}>
                <span className={u ? 'md-wave' : ''} style={{ ...s('width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; font-size: ' + (a.type === 'sos' ? '7px' : '13px') + '; font-weight: 900; display: flex; align-items: center; justify-content: center'), background: a.kind === 'danger' ? '#D62839' : t.amberTint, color: a.kind === 'danger' ? '#FFFFFF' : t.amberInk }}>{a.type === 'sos' ? 'SOS' : '!'}</span>
                <span style={s('display: flex; flex-direction: column; flex-grow: 1; min-width: 0')}><span style={s('font-size: 11px; font-weight: 700; line-height: 1.2')}>{a.title}</span><span style={{ fontSize: 9, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</span></span>
                <span style={{ fontSize: 9, color: t.muted }}>{dayKey(new Date(a.at)) === dayKey() ? new Date(a.at).toTimeString().slice(0, 5) : new Date(a.at).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              </button>
            );
          })}
          {!all.length && <span style={{ fontSize: 11, color: t.muted, padding: '20px 4px', textAlign: 'center' }}>No alerts.</span>}
        </div>
        <div style={s('flex-grow: 1')} />
        <button type="button" disabled={!unread} onClick={() => markAlertsRead(people)} style={{ ...s(btn + '; flex-shrink: 0; height: 32px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800'), border: '1.5px solid ' + t.btnLine, color: t.fg, opacity: unread ? 1 : 0.5 }}>MARK ALL AS READ</button>
      </div>
    );
  }

  // ---- a person's readings (WCVitals) ----
  if (nav.s === 'vitals' && P(nav.pid)) {
    const p = P(nav.pid), [bg, fg] = av(p, 0);
    const keys = ORDER.filter((k) => p.vitals[k]);
    const icon = { sugar: '💧', bp: '', hr: '♥', o2: 'O₂' };
    return (
      <div style={base(t, 'padding: 4px 0 6px; align-items: center')}>
        <div style={s('display: flex; width: 100%; box-sizing: border-box; padding: 0 6px; align-items: center; justify-content: space-between')}>
          <Back t={t} onClick={() => go('people')} />
          <Logo t={t} size="lg" />
          <span style={{ ...s('width: 28px; height: 28px; border-radius: 14px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center'), background: bg, color: fg }}>{p.ini}</span>
        </div>
        <span style={s(title + '; font-size: 14px; margin-top: 2px')}>HEALTH PARAMETERS</span>
        {keys.length ? (
          <div className="md-scroll" style={s('display: flex; gap: 6px; width: 198px; box-sizing: border-box; overflow-x: auto; padding: 8px 10px; scroll-snap-type: x mandatory; scrollbar-width: none')}>
            {keys.map((k) => {
              const v = p.vitals[k], warn = statusOf(k, v.now) !== 'Normal', m = METRICS[k];
              return (
                <button key={k} type="button" className={warn ? 'md-wave' : ''} onClick={() => go('reading', { pid: p.id, k })} style={{ ...s('flex-shrink: 0; width: 96px; height: 96px; border-radius: 48px; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; padding: 0'), background: warn ? '#D62839' : t.circle, color: warn ? '#FFFFFF' : t.fg, border: warn ? 0 : t.border, boxShadow: warn ? 'none' : t.shadow }}>
                  <span style={s('font-size: 13px; font-weight: 800; line-height: 18px')}>{k === 'bp' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 16a8 8 0 1 1 16 0" /><path d="M12 16l4-5" /></svg> : icon[k]}</span>
                  <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: 0.2, marginTop: 2, color: warn ? '#FFFFFF' : t.red }}>{(m.label || m.title).toUpperCase()}</span>
                  <span style={s('font-size: 16px; font-weight: 800; line-height: 1.1')}>{v.show}{k === 'o2' ? '%' : ''}</span>
                  <span style={s('font-size: 9px; font-weight: 800')}>{k === 'o2' ? 'SpO2' : m.unit}</span>
                </button>
              );
            })}
          </div>
        ) : <span style={{ fontSize: 11, color: t.muted, padding: '24px 16px', textAlign: 'center' }}>{p.watch ? 'Waiting for the first reading.' : 'No watch paired yet.'}</span>}
        <div style={s('flex-grow: 1')} />
        <div style={s('display: flex; width: 100%; box-sizing: border-box; padding: 0 16px; justify-content: space-between')}>
          {[['Call', <Phone key="c" />, () => go('call', { pid: p.id, from: 'vitals' })], ['Meds', <PillIcon key="m" />, () => go('meds', { pid: p.id })], ['locate', <Pin key="l" />, () => go('locate', { pid: p.id })]].map(([l, ic, f]) => (
            <button key={l} type="button" onClick={f} style={{ ...s('display: flex; flex-direction: column; align-items: center; min-width: 44px; border: 0; background: transparent; font-size: 11px; font-weight: 800; line-height: 1.1; font-family: inherit; cursor: pointer; padding: 0'), color: t.red }}>{ic}{l}</button>
          ))}
        </div>
      </div>
    );
  }

  // ---- reading detail (WReading) ----
  if (nav.s === 'reading' && P(nav.pid) && P(nav.pid).vitals[nav.k]) {
    const p = P(nav.pid), k = nav.k, m = METRICS[k], v = p.vitals[k], high = statusOf(k, v.now) !== 'Normal';
    const span = m.max - m.min, pct = (x) => (Math.max(0, Math.min(1, (x - m.min) / span)) * 100).toFixed(1) + '%', px = (x) => Math.max(4, Math.min(64, Math.round((x - m.min) / span * 64)));
    const key = 'r' + p.id + k, check = k === 'hr' || k === 'o2';
    return (
      <div style={base(t, 'padding: 4px 12px 8px; gap: 4px')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => go('vitals', { pid: p.id })} /><span style={s(title + '; font-size: 12px')}>{m.title.toUpperCase()}</span><span style={s('width: 32px')} /></div>
        <div style={s('display: flex; align-items: baseline; gap: 4px')}><span style={{ ...s('font-size: 28px; font-weight: 800; line-height: 1'), color: high ? t.redInk : t.fg }}>{v.show}{k === 'o2' ? '%' : ''}</span><span style={{ fontSize: 10, fontWeight: 700, color: t.muted }}>{k === 'o2' ? 'SpO2' : m.unit}</span><span style={s('flex-grow: 1')} /><span className={high ? 'md-wave' : ''} style={{ ...s('padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 800'), background: high ? '#D62839' : t.okBg, color: high ? '#FFFFFF' : t.okInk }}>{statusOf(k, v.now)}</span></div>
        <div style={s('position: relative; display: flex; height: 6px; gap: 2px; margin-top: 4px')}>
          <div style={{ ...s('border-radius: 3px 0 0 3px; background: #F2B33D'), width: pct(m.lo) }} />
          <div style={{ ...s('background: #2BB5B0'), width: ((Math.min(m.hi, m.max) - m.lo) / span * 100).toFixed(1) + '%', ...(m.noHigh ? s('flex-grow: 1; border-radius: 0 3px 3px 0') : {}) }} />
          {!m.noHigh && <div style={s('flex-grow: 1; border-radius: 0 3px 3px 0; background: #D62839')} />}
          <div style={{ ...s('position: absolute; top: -4px; width: 14px; height: 14px; margin-left: -7px; border-radius: 7px; background: #FFFFFF; border: 3px solid #14202B; box-sizing: border-box'), left: pct(v.now) }} />
        </div>
        <span style={{ fontSize: 9, color: t.muted }}>{m.normText} · {ago(v.at)}</span>
        <div style={s('position: relative; height: 64px; display: flex; align-items: flex-end; gap: 6px; margin-top: 2px')}>
          <div style={{ ...s('position: absolute; left: 0; right: 0; border-radius: 4px'), bottom: px(m.lo), height: px(Math.min(m.hi, m.max)) - px(m.lo), background: t.band }} />
          {v.vals.map((x, j) => <div key={j} style={{ ...s('flex-grow: 1; flex-basis: 0; position: relative; border-radius: 4px'), height: x == null ? 0 : px(x), background: x != null && (x > m.hi || x < m.lo) ? '#D62839' : '#2BB5B0' }} />)}
        </div>
        <div style={s('display: flex; gap: 6px')}>{v.labels.map((d, j) => <span key={j} style={{ flexGrow: 1, flexBasis: 0, textAlign: 'center', fontSize: 8, color: t.muted }}>{d[0]}</span>)}</div>
        <div style={s('flex-grow: 1')} />
        <button type="button" onClick={() => remind(p, check ? { kind: 'check', text: 'Are you OK? Your readings look unusual.' } : { kind: 'dose', text: 'Please take your medicine.' }, key)} style={{ ...s(btn + '; height: 34px; border-radius: 12px; font-size: 10px; font-weight: 800'), background: sent[key] ? t.okBg : '#2BB5B0', color: sent[key] ? t.okInk : '#14202B' }}>{sent[key] ? (check ? 'CHECK-IN SENT' : 'REMINDER SENT') : check ? 'SEND A CHECK-IN' : 'REMIND ' + p.him.toUpperCase() + ' TO TAKE MEDICINE'}</button>
      </div>
    );
  }

  // ---- medicine (WCMeds) ----
  if (nav.s === 'meds' && P(nav.pid)) {
    const p = P(nav.pid), [bg, fg] = av(p, 0);
    const sched = p.today.filter((d) => d.st !== 'need'), due = p.today.find((d) => d.st === 'due') || p.today.find((d) => d.st === 'missed');
    const C = { taken: [t.okBg, t.okInk], due: [t.amberTint, t.amberInk], later: [t.seg, t.muted], need: [t.seg, t.muted], missed: [t.redTint, t.redInk] };
    const key = 'm' + p.id;
    return (
      <div style={{ ...base(t, 'padding: 4px 10px 10px; gap: 6px; overflow-y: auto'), scrollbarWidth: 'none' }}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; flex-shrink: 0')}><Back t={t} onClick={() => go('vitals', { pid: p.id })} /><Logo t={t} /><span style={{ ...s('width: 28px; height: 28px; border-radius: 10px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center'), background: bg, color: fg }}>{p.ini}</span></div>
        <div style={s('display: flex; flex-direction: column; align-items: center; flex-shrink: 0')}><span style={s(title + '; font-size: 13px')}>MEDICATION</span><span style={{ fontSize: 10, color: t.muted }}>Today · {sched.filter((d) => d.st === 'taken').length} of {sched.length} taken</span></div>
        {due && (
          <div style={s('flex-shrink: 0; background: #2BB5B0; color: #14202B; border-radius: 18px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px')}>
            <span style={s('display: flex; justify-content: space-between; font-size: 9px; font-weight: 800; letter-spacing: 0.5px')}><span>NEXT DOSE</span><span>{due.label}</span></span>
            <span style={s('font-size: 14px; font-weight: 800; line-height: 1.15')}>{due.name}</span>
            <span style={s('font-size: 10px; font-weight: 600')}>{due.how} · {due.time}</span>
            <button type="button" onClick={() => remind(p, { kind: 'dose', text: 'Time for ' + due.name + '.' }, key)} style={s(btn + '; height: 30px; border-radius: 10px; background: #FFFFFF; color: #075955; font-size: 11px; font-weight: 800; margin-top: 2px')}>{sent[key] ? 'REMINDER SENT' : 'REMIND ' + p.him.toUpperCase()}</button>
          </div>
        )}
        <div style={s('display: flex; flex-direction: column; flex-shrink: 0')}>
          {p.today.map((d, k) => (
            <div key={d.id} style={{ ...s('display: flex; align-items: center; gap: 6px; padding: 6px 0'), borderBottom: k < p.today.length - 1 ? '1px solid ' + t.soft : 0 }}>
              <span style={s('width: 36px; font-size: 11px; font-weight: 800')}>{d.time}</span>
              <span style={s('flex-grow: 1; font-size: 11px; font-weight: 600; line-height: 1.2')}>{d.name}</span>
              <span style={{ ...s('flex-shrink: 0; padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 700'), background: C[d.st][0], color: C[d.st][1] }}>{d.st === 'taken' ? d.label.replace('Taken ', '') : d.label}</span>
            </div>
          ))}
          {!p.today.length && <span style={{ fontSize: 10, color: t.muted, textAlign: 'center', padding: '10px 0' }}>No medicine yet. Add it on your phone.</span>}
        </div>
        {p.missed && <span style={{ ...s('flex-shrink: 0; padding: 5px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; line-height: 1.3'), background: t.redTint, color: t.redInk }}>{p.note}</span>}
      </div>
    );
  }

  // ---- call (WCCall) ----
  if (nav.s === 'call' && P(nav.pid)) {
    const p = P(nav.pid), c = p.contacts[0], map = nav.over === 'map';
    const back = () => (map ? go('locate', { pid: p.id }) : nav.from === 'people' ? go('people') : go('vitals', { pid: p.id }));
    const card = { ...s('display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 18px; text-decoration: none; cursor: pointer; font-family: inherit; box-sizing: border-box'), background: t.card, boxShadow: t.shadow, border: t.border };
    return (
      <div style={{ ...base(t), position: 'relative', overflow: 'hidden' }}>
        {map && <MapBg t={t} faded />}
        <div style={{ ...s('position: absolute; left: 0; right: 0; top: 0; height: 40px; display: flex; align-items: center; justify-content: center'), background: t.bg, boxShadow: t.bar }}><Logo t={t} size="lg" /></div>
        <button type="button" aria-label="Close" onClick={back} style={s('position: absolute; right: 18px; top: 46px; display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 0; background: transparent; cursor: pointer')}><span style={s('width: 24px; height: 24px; border-radius: 12px; background: #D62839; color: #FFFFFF; display: flex; align-items: center; justify-content: center')}><Close /></span></button>
        <div style={{ ...s('position: absolute; left: 16px; top: 80px; display: flex; flex-direction: column; gap: 10px'), right: map ? 58 : 16 }}>
          {c ? <a href={tel(c.phone)} style={{ ...card, height: 54 }}><span style={{ fontSize: 15, fontWeight: 800, color: t.red }}>{c.name}</span><span style={{ fontSize: 9, color: t.muted }}>Emergency contact</span></a>
            : p.phone ? <a href={tel(p.phone)} style={{ ...card, height: 54 }}><span style={{ fontSize: 15, fontWeight: 800, color: t.red }}>{p.name}</span><span style={{ fontSize: 9, color: t.muted }}>{p.phone}</span></a>
            : <span style={{ ...card, height: 54, fontSize: 10, color: t.muted, padding: '0 10px', textAlign: 'center' }}>No contact saved. Add one on your phone.</span>}
          <button type="button" onClick={() => go('sos112', { pid: p.id })} style={{ ...card, height: 66, fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: t.red, textAlign: 'center' }}>Emergency<br />services</button>
        </div>
      </div>
    );
  }

  // ---- emergency services: confirm, then the watch dials 112 ----
  if (nav.s === 'sos112' && P(nav.pid)) {
    const p = P(nav.pid);
    return (
      <div style={base(t, 'padding: 8px 12px 10px; align-items: center; gap: 4px; text-align: center')}>
        <Logo t={t} />
        <span style={s('width: 48px; height: 48px; margin-top: 4px; border-radius: 24px; background: #D62839; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900')}>112</span>
        <span style={s(title + '; font-size: 14px')}>CALL 112?</span>
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>For {p.name} at {p.shortAddress}. Read them the address.</span>
        <div style={s('flex-grow: 1')} />
        <a href="tel:112" style={s(btn + '; width: 100%; height: 36px; border-radius: 12px; background: #D62839; color: #FFFFFF; font-size: 12px; font-weight: 800')}>YES, CALL 112</a>
        <button type="button" onClick={() => go('vitals', { pid: p.id })} style={{ ...s(btn + '; width: 100%; height: 30px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 700'), border: '1.5px solid ' + t.btnLine, color: t.fg }}>NO</button>
      </div>
    );
  }

  // ---- locate (WCLocate) ----
  if (nav.s === 'locate' && P(nav.pid)) {
    const p = P(nav.pid), has = p.loc && p.loc.lat;
    return (
      <div style={{ ...base({ ...t, bg: t.map }), position: 'relative', overflow: 'hidden' }}>
        <MapBg t={t} street={has ? p.address.split(',')[0].replace(/^\d+\s*/, '') : ''} area={has ? (p.address.split(',')[1] || '').trim() : ''} />
        <div style={{ ...s('position: absolute; left: 0; right: 0; top: 0; height: 40px; display: flex; align-items: center; justify-content: center'), background: t.bg, boxShadow: t.bar }}>
          <span style={s('position: absolute; left: 6px; top: 4px')}><Back t={t} onClick={() => go('vitals', { pid: p.id })} /></span>
          <Logo t={t} size="lg" />
        </div>
        {has ? (
          <div style={s('position: absolute; left: 0; right: 0; top: 92px; display: flex; flex-direction: column; align-items: center; gap: 4px')}>
            <span className="md-pin" style={s('display: flex; color: #D62839')}><Pin size={30} /></span>
            <span style={{ ...s('padding: 1px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; white-space: nowrap'), background: t.chip, color: t.chipInk }}>{p.name} · {ago(p.loc.at)}</span>
          </div>
        ) : <span style={{ ...s('position: absolute; left: 16px; right: 16px; top: 100px; text-align: center; font-size: 11px'), color: t.fg }}>No location yet.</span>}
        <button type="button" aria-label={'Share ' + p.her + ' location'} onClick={() => go('call', { pid: p.id, over: 'map' })} style={{ ...s('position: absolute; right: 10px; bottom: 10px; display: flex; width: 44px; height: 44px; border-radius: 22px; align-items: center; justify-content: center; border: 0; cursor: pointer; box-shadow: 0 6px 14px rgba(0,0,0,0.3)'), background: t.fab }}><Share /></button>
      </div>
    );
  }

  // ---- daily summary (WCSummary) ----
  if (nav.s === 'summary') {
    const per = people.map((p) => ({ p, w: p.alerts.filter((a) => dayKey(new Date(a.at)) === dayKey()).length, sched: p.today.filter((d) => d.st !== 'need') }));
    const taken = per.reduce((a, x) => a + x.sched.filter((d) => d.st === 'taken').length, 0), total = per.reduce((a, x) => a + x.sched.length, 0), warn = per.reduce((a, x) => a + x.w, 0);
    return (
      <div style={base(t, 'padding: 6px 12px 10px; gap: 6px')}>
        <div style={s('display: flex; justify-content: center')}><Logo t={t} /></div>
        <div style={s('display: flex; flex-direction: column; align-items: center')}><span style={s(title + '; font-size: 13px; letter-spacing: 0.4px')}>DAILY SUMMARY</span><span style={{ fontSize: 10, color: t.muted }}>Today · 20:00</span></div>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px')}>
          <div style={{ ...s('padding: 6px 8px; border-radius: 12px; display: flex; flex-direction: column'), background: t.tealTint, color: t.tealInk }}><span style={s('font-size: 16px; font-weight: 800')}>{taken}/{total}</span><span style={s('font-size: 10px; font-weight: 600')}>doses taken</span></div>
          <div style={{ ...s('padding: 6px 8px; border-radius: 12px; display: flex; flex-direction: column'), background: t.redTint, color: t.redInk }}><span style={s('font-size: 16px; font-weight: 800')}>{warn}</span><span style={s('font-size: 10px; font-weight: 600')}>warnings</span></div>
        </div>
        <div style={s('display: flex; flex-direction: column; gap: 3px')}>
          {per.slice(0, 4).map(({ p, w }) => <div key={p.id} style={s('display: flex; align-items: center; gap: 6px; font-size: 11px')}><span className={w ? 'md-wave' : ''} style={{ ...s('width: 8px; height: 8px; border-radius: 4px'), background: w ? '#D62839' : '#2BB5B0' }} /><b style={s('flex-grow: 1')}>{p.self ? 'Me' : p.name}</b><span style={{ fontWeight: 700, color: w ? t.redInk : t.tealInk }}>{w ? w + ' warning' + (w > 1 ? 's' : '') : 'All normal'}</span></div>)}
        </div>
        <div style={s('flex-grow: 1')} />
        <button type="button" onClick={() => go('people')} style={s(btn + '; height: 32px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>GOT IT</button>
      </div>
    );
  }

  // ---- settings (WSettings) ----
  if (nav.s === 'settings') {
    const tab = (on) => ({ ...s(btn + '; height: 26px; border-radius: 9px; font-size: 11px; font-weight: 700'), background: on ? '#2BB5B0' : 'transparent', color: on ? '#14202B' : t.fg });
    const label = { fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: t.muted };
    return (
      <div style={{ ...base(t, 'padding: 4px 10px 10px; gap: 6px; overflow-y: auto'), scrollbarWidth: 'none' }}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; flex-shrink: 0')}><Back t={t} onClick={() => go('people')} /><span style={s(title + '; font-size: 14px')}>SETTINGS</span><span style={s('width: 32px')} /></div>
        <span style={label}>THEME</span>
        <div style={{ ...s('flex-shrink: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; padding: 3px; border-radius: 12px'), background: t.seg }}>
          <button type="button" onClick={() => setOption({ theme: 'light' })} style={tab(st.theme !== 'dark')}>Light</button>
          <button type="button" onClick={() => setOption({ theme: 'dark' })} style={tab(st.theme === 'dark')}>Dark</button>
        </div>
        <span style={label}>LINKED DEVICES</span>
        <div style={{ ...s('flex-shrink: 0; display: flex; flex-direction: column; border-radius: 12px; padding: 0 8px'), border: '1px solid ' + t.soft }}>
          <div style={{ ...s('display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 10px') }}><b>{(st.carer && st.carer.name) || 'Your'}'s phone</b><span style={{ color: t.teal, fontWeight: 700 }}>● connected</span></div>
          {people.filter((p) => p.watch).map((p) => <div key={p.id} style={{ ...s('display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 10px'), borderTop: '1px solid ' + t.soft }}><b>{p.self ? 'Your' : p.name + "'s"} watch</b><span style={{ color: t.teal, fontWeight: 700 }}>● {p.battery ?? '–'}%</span></div>)}
        </div>
        <div style={s('flex-shrink: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px')}>
          <button type="button" onClick={() => go('addcode')} style={{ ...s(btn + '; height: 30px; border-radius: 10px; background: transparent; font-size: 10px; font-weight: 800'), border: '1.5px dashed ' + t.teal, color: t.teal }}>+ PERSON</button>
          <button type="button" onClick={resetWatch} style={{ ...s(btn + '; height: 30px; border-radius: 10px; background: transparent; font-size: 10px; font-weight: 800'), border: '1.5px dashed ' + t.teal, color: t.teal }}>RE-LINK PHONE</button>
        </div>
        <span style={label}>ALERTS</span>
        {[['r', 'Readings out of range'], ['d', 'Missed doses'], ['s', 'Daily summary 20:00']].map(([k, l]) => (
          <button key={k} type="button" role="switch" aria-checked={toggles[k]} onClick={() => setToggles({ ...toggles, [k]: !toggles[k] })} style={{ ...s('flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; min-height: 26px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 11px; cursor: pointer'), color: t.fg }}>
            <span>{l}</span><span style={{ ...s('flex-shrink: 0; width: 30px; height: 18px; border-radius: 9px; padding: 2px; box-sizing: border-box; display: flex'), background: toggles[k] ? '#2BB5B0' : t.off, justifyContent: toggles[k] ? 'flex-end' : 'flex-start' }}><span style={s('width: 14px; height: 14px; border-radius: 7px; background: #FFFFFF')} /></span>
          </button>
        ))}
        <button type="button" onClick={() => go('summary')} style={{ ...s('flex-shrink: 0; display: flex; justify-content: space-between; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 11px; cursor: pointer'), color: t.teal }}>Today's summary</button>
        <div style={s('flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; font-size: 11px')}><span>Emergency number</span><b style={{ color: t.red }}>112</b></div>
        <button type="button" onClick={resetWatch} style={{ ...s(btn + '; flex-shrink: 0; height: 28px; border-radius: 10px; background: transparent; font-size: 11px; font-weight: 800'), color: t.red }}>SIGN OUT</button>
      </div>
    );
  }

  // ---- people you care for (WCPeople, "INTEREST") ----
  const cards = [...people, { add: true, id: 'add', name: 'Add a person', ini: '+' }];
  const m = cards.length, idx = Math.min(i, m - 1), at = (k) => cards[(k + m) % m];
  const look = (q, k) => (q.add ? [t.addBg, t.addFg] : av(q, k));
  const unread = people.reduce((a, p) => a + p.unread, 0);
  const cur = at(idx), warnCur = !cur.add && (Object.entries(cur.vitals).some(([k, v]) => statusOf(k, v.now) !== 'Normal') || cur.sosActive);
  const open = (q) => (q.add ? go('addcode') : go('vitals', { pid: q.id }));
  const side = (q, k) => ({ ...s('position: absolute; top: 14px; width: 66px; height: 80px; border-radius: 22px; border: 0; cursor: pointer; font-family: inherit; font-size: 20px; font-weight: 700; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box'), background: look(q, k)[0], color: look(q, k)[1] });
  return (
    <div style={base(t, 'padding: 4px 0 6px; align-items: center; gap: 2px; overflow: hidden')}>
      <div style={s('display: flex; width: 100%; box-sizing: border-box; padding: 0 6px; align-items: center; justify-content: space-between')}>
        <button type="button" onClick={() => go('alerts')} aria-label={unread ? `Alerts, ${unread} new` : 'Alerts'} style={s('display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 0; background: transparent; padding: 0; cursor: pointer')}><span className={unread ? 'md-wave' : ''} style={{ ...s('width: 24px; height: 24px; border-radius: 12px; color: #D62839; display: flex; align-items: center; justify-content: center'), background: t.bellBg }}><Bell /></span></button>
        <Logo t={t} size="lg" />
        <button type="button" onClick={() => go('settings')} aria-label="Settings" style={{ ...s('display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 0; background: transparent; padding: 0; cursor: pointer'), color: t.teal }}><Gear /></button>
      </div>
      <span style={s(title + '; font-size: 15px; letter-spacing: 0.5px')}>INTEREST</span>
      <div style={s('position: relative; width: 198px; height: 108px')}>
        {m > 1 && <button type="button" onClick={() => setI((idx - 1 + m) % m)} aria-label={'Previous: ' + at(idx - 1).name} style={{ ...side(at(idx - 1), idx - 1), left: -30, justifyContent: 'flex-end' }}>{at(idx - 1).ini}</button>}
        {m > 2 && <button type="button" onClick={() => setI((idx + 1) % m)} aria-label={'Next: ' + at(idx + 1).name} style={{ ...side(at(idx + 1), idx + 1), right: -30, justifyContent: 'flex-start' }}>{at(idx + 1).ini}</button>}
        <button type="button" key={cur.id} className="md-pop-in" onClick={() => open(cur)} aria-label={cur.add ? 'Add a person' : 'Open ' + cur.name} style={{ ...s('position: absolute; left: 47px; top: 2px; width: 104px; height: 104px; border-radius: 32px; border: 0; cursor: pointer; font-family: inherit; font-size: 34px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(20,32,43,0.18)'), background: look(cur, idx)[0], color: look(cur, idx)[1], outline: warnCur ? '3px solid #D62839' : 'none', outlineOffset: 2 }}>{cur.ini}</button>
      </div>
      <span style={s('display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; margin-top: 2px')}><span className={warnCur ? 'md-wave' : ''} style={{ ...s('width: 8px; height: 8px; border-radius: 4px'), background: warnCur ? '#D62839' : cur.add ? 'transparent' : '#2BB5B0' }} />{cur.name}</span>
      <div style={s('display: flex; width: 100%; box-sizing: border-box; padding: 0 8px; align-items: center; justify-content: space-between')}>
        <button type="button" onClick={() => setI((idx - 1 + m) % m)} aria-label="Previous person" style={{ ...s('width: 32px; height: 32px; border: 0; background: transparent; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center'), color: t.teal }}><Chev left /></button>
        <div style={s('display: flex; align-items: center; gap: 4px')}>{cards.map((q, k) => <span key={q.id} style={{ borderRadius: 6, width: k === idx ? 12 : 7, height: k === idx ? 12 : 7, background: k === idx ? '#D62839' : t.dotOff }} />)}</div>
        <button type="button" onClick={() => setI((idx + 1) % m)} aria-label="Next person" style={{ ...s('width: 32px; height: 32px; border: 0; background: transparent; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center'), color: t.teal }}><Chev /></button>
      </div>
    </div>
  );
}

function MapBg({ t, faded, street = 'Allen Ave', area = 'Ikeja' }) {
  return (
    <div aria-hidden="true" style={{ ...s('position: absolute; left: 0; right: 0; top: 40px; bottom: 0'), background: t.map, opacity: faded ? 0.45 : 1 }}>
      <div style={{ ...s('position: absolute; left: 12px; top: 20px; width: 56px; height: 44px; border-radius: 10px'), background: t.park }} />
      <div style={{ ...s('position: absolute; left: -10px; right: -10px; top: 80px; height: 8px; transform: rotate(-8deg)'), background: t.road }} />
      <div style={{ ...s('position: absolute; left: 112px; top: -10px; bottom: 30px; width: 10px; transform: rotate(6deg)'), background: t.hw }} />
      <div style={{ ...s('position: absolute; left: 50px; top: 0; height: 200px; width: 6px'), background: t.road }} />
      {!faded && <span style={{ ...s('position: absolute; left: 132px; top: 12px; font-size: 10px; font-weight: 600'), color: t.label }}>{area}</span>}
      {!faded && <span style={{ ...s('position: absolute; left: 8px; top: 96px; font-size: 9px'), color: t.label }}>{street}</span>}
    </div>
  );
}

// ---- add a person from the watch ----------------------------------------------------

function AddCode({ t, onBack, onAccepted }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(null);
  const ready = code.length === 6;
  useEffect(() => () => waiting && waiting.stop && waiting.stop(), [waiting]);
  const next = async () => {
    if (!ready || busy) return;
    setBusy(true); setErr('');
    try {
      const c = await readCode(code);
      if (c.role === 'carer') throw Object.assign(new Error(), { code: 'carer' });
      const w = { name: c.name || 'them' };
      w.stop = await requestLink(code, c, (r) => { if (r === 'accepted') onAccepted(c.pid); else { setWaiting(null); setErr(w.name + ' said no'); } });
      setWaiting(w);
    } catch (x) { setErr(x.code === 'expired' ? 'Code expired' : x.code === 'carer' ? "That's a caregiver watch" : 'No watch shows that code'); } finally { setBusy(false); }
  };
  if (waiting) return (
    <div style={base(t, 'padding: 8px 14px 12px; align-items: center; gap: 6px; text-align: center')}>
      <Logo t={t} />
      <span style={s(title + '; font-size: 13px; margin-top: 10px')}>ASK SENT</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>Waiting for {waiting.name} to accept on their watch.</span>
      <div style={s('flex-grow: 1')} />
      <span style={{ ...s('display: flex; align-items: center; gap: 6px; font-size: 10px'), color: t.muted }}>Waiting <span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
      <button type="button" onClick={() => { waiting.stop && waiting.stop(); setWaiting(null); onBack(); }} style={{ ...s('border: 0; background: transparent; font-size: 11px; font-weight: 700; font-family: inherit; cursor: pointer'), color: t.muted }}>Cancel</button>
    </div>
  );
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
  return (
    <div style={base(t, 'padding: 2px 12px 8px; gap: 4px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between')}><Back t={t} onClick={onBack} /><span style={s(title + '; font-size: 12px')}>ADD A PERSON</span><span style={s('width: 28px')} /></div>
      <span style={{ fontSize: 9, textAlign: 'center', color: err ? '#D62839' : t.muted, marginTop: -2, fontWeight: err ? 700 : 400 }}>{err || 'Type the code shown on their watch'}</span>
      <div style={s('display: flex; justify-content: center; gap: 3px')}>
        {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} style={{ ...s('width: 22px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800'), background: t.box, border: '1.5px solid ' + (k === code.length ? '#2BB5B0' : t.boxLine), marginRight: k === 2 ? 5 : 0 }}>{code[k] || ''}</span>)}
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px')}>
        {keys.map((l) => <button key={l} type="button" aria-label={l === '⌫' ? 'Delete' : l === 'OK' ? 'Done' : l} onClick={() => { setErr(''); if (l === '⌫') setCode(code.slice(0, -1)); else if (l === 'OK') next(); else if (code.length < 6) setCode(code + l); }} style={{ ...s('height: 24px; border: 0; border-radius: 8px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer'), background: l === 'OK' ? '#2BB5B0' : t.key, color: l === 'OK' ? '#14202B' : t.fg }}>{l}</button>)}
      </div>
      <button type="button" disabled={!ready} onClick={next} style={{ ...s(btn + '; height: 28px; border-radius: 10px; font-size: 11px; font-weight: 800; margin-top: 2px'), background: ready ? '#2BB5B0' : t.off, color: ready ? '#14202B' : t.offInk }}>{busy ? 'CHECKING…' : 'NEXT'}</button>
    </div>
  );
}

// A caregiver watch that isn't linked to the caregiver's phone yet: link it from Settings.
export function CarerUnlinked({ st, t: tBase }) {
  const t = { ...tBase, ...extra(st.theme === 'dark') };
  const [screen, setScreen] = useState('home');
  if (screen === 'code') {
    const code = st.code || '······';
    return (
      <div style={base(t, 'padding: 4px 14px 12px; align-items: center; gap: 6px; text-align: center')} aria-label={'Linking code ' + code}>
        <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setScreen('settings')} /><Logo t={t} /><span style={s('width: 32px')} /></div>
        <span style={s(title + '; font-size: 14px')}>LINK TO YOUR PHONE</span>
        <span style={s('display: flex; gap: 4px; margin-top: 2px')}>
          {code.split('').map((n, k) => <span key={k} style={{ ...s('width: 24px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800'), background: t.box, border: '1px solid ' + t.boxLine, marginRight: k === 2 ? 6 : 0 }}>{n}</span>)}
        </span>
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted, marginTop: 2 }}>On your phone open myDoc › Profile › Pair a watch and type this code.</span>
        <div style={s('flex-grow: 1')} />
        <span style={{ ...s('display: flex; align-items: center; gap: 6px; font-size: 10px'), color: t.muted }}>Waiting <span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
      </div>
    );
  }
  if (screen === 'settings') return (
    <div style={base(t, 'padding: 4px 10px 10px; gap: 6px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setScreen('home')} /><span style={s(title + '; font-size: 14px')}>SETTINGS</span><span style={s('width: 32px')} /></div>
      <button type="button" onClick={() => { startCarerLink(); setScreen('code'); }} style={s(btn + '; height: 40px; border-radius: 14px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>LINK TO MY PHONE</button>
      <div style={{ ...s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; padding: 3px; border-radius: 12px'), background: t.seg }}>
        {['light', 'dark'].map((k) => <button key={k} type="button" onClick={() => setOption({ theme: k })} style={{ ...s(btn + '; height: 26px; border-radius: 9px; font-size: 11px; font-weight: 700'), background: (st.theme || 'light') === k ? '#2BB5B0' : 'transparent', color: (st.theme || 'light') === k ? '#14202B' : t.fg }}>{k === 'light' ? 'Light' : 'Dark'}</button>)}
      </div>
    </div>
  );
  return (
    <div style={base(t, 'padding: 4px 12px 12px; align-items: center; gap: 6px; text-align: center')}>
      <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><span style={s('width: 32px')} /><Logo t={t} size="lg" /><button type="button" onClick={() => setScreen('settings')} aria-label="Settings" style={{ ...s('display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 0; background: transparent; padding: 0; cursor: pointer'), color: t.teal }}><Gear /></button></div>
      <span style={s(title + '; font-size: 15px; letter-spacing: 0.5px; margin-top: 6px')}>INTEREST</span>
      <span style={{ fontSize: 11, lineHeight: 1.45, color: t.muted }}>Link this watch to your phone to see the people you look after.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => setScreen('settings')} style={s(btn + '; width: 100%; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>OPEN SETTINGS</button>
    </div>
  );
}

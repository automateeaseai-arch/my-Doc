import { useEffect, useRef, useState } from 'react';
import { s, Toggle } from '../ui.jsx';
import { online } from '../backend/index.js';
import { METRICS, statusOf, showValue, doseStatus, clock, ago } from '../health.js';
import { getSim, onSim, setOption, sendNormal, runScenario, setPlace, setBattery, unlink, takeDose, sendSOS, clearPing, onDoseDue, finishSetup, finishCarerSetup, resetWatch, PROFILES, PLACES, SCENARIOS } from './sim.js';
import { CONDITIONS } from '../health.js';
import CarerFace from './Carer.jsx';

const THEMES = {
  light: { bg: '#FFFFFF', fg: '#14202B', muted: '#5B6672', raised: '#FFFFFF', line: '#EEF0F2', logo: '#D62839', teal: '#0B7A75', red: '#D62839', tealTint: '#E3F5F3', tealInk: '#075955', shadow: '0 4px 12px rgba(20,32,43,0.10)', box: '#F5F7F8', boxLine: '#E4E8EC', ring: '#FDECEE' },
  dark: { bg: '#000000', fg: '#F2F4F5', muted: '#A9B4BE', raised: '#1C2329', line: '#2E3A45', logo: '#FF4D5A', teal: '#2BB5B0', red: '#FF5A65', tealTint: '#0E2E2C', tealInk: '#5FD3CD', shadow: 'none', box: '#1C2329', boxLine: '#2E3A45', ring: '#3A1418' }
};

const useSim = () => { const [st, set] = useState(getSim()); useEffect(() => onSim(set), []); return st; };
const useClock = () => { const [t, set] = useState(clock()); useEffect(() => { const i = setInterval(() => set(clock()), 5000); return () => clearInterval(i); }, []); return t; };

function WLogo({ t, big }) {
  return <span style={{ ...s("display: flex; align-items: baseline; gap: 1px; font-family: 'Kaushan Script', cursive; line-height: 1"), color: t.logo }}><span style={{ fontSize: big ? 22 : 11 }}>my</span><span style={{ fontSize: big ? 52 : 20 }}>DOC</span></span>;
}
const Tick = ({ size = 20, color = '#14202B' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const Pill = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="M9.5 9.5l5 5" /></svg>;
const Back = ({ t, onClick }) => <button type="button" aria-label="Back" onClick={onClick} style={{ ...s('display: flex; width: 32px; height: 32px; align-items: center; border: 0; background: transparent; padding: 0; cursor: pointer'), color: t.teal }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6" /></svg></button>;

const face = (t, extra = '') => ({ ...s('width: 198px; height: 242px; box-sizing: border-box; font-family: Poppins, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; text-align: center; ' + extra), background: t.bg, color: t.fg });
const wbtn = 'display: flex; width: 100%; align-items: center; justify-content: center; gap: 6px; border: 0; cursor: pointer; font-family: inherit; text-decoration: none; box-sizing: border-box';

// ---- first-time setup (designs: WLoading → WRole → WSetup) ---------------------------

function Setup({ t }) {
  const [step, setStep] = useState('splash');
  const [conds, setConds] = useState({});
  const [note, setNote] = useState('');
  const any = Object.values(conds).some(Boolean);
  if (step === 'splash') return (
    <button type="button" aria-label="myDoc. Tap to start" onClick={() => setStep('role')} style={{ ...face(t, 'justify-content: center; gap: 18px; border: 0; cursor: pointer; padding: 0'), font: 'inherit' }}>
      <span className="md-pop" style={{ ...s("display: flex; align-items: baseline; gap: 2px; font-family: 'Kaushan Script', cursive; line-height: 1; text-shadow: 0 3px 6px rgba(214,40,57,0.22)"), color: t.logo }}><span style={{ fontSize: 22 }}>my</span><span style={{ fontSize: 52 }}>DOC</span></span>
      <span style={{ fontSize: 10, color: t.muted }}>Tap to start</span>
    </button>
  );
  if (step === 'role') return (
    <div style={face(t, 'padding: 8px 14px 12px; gap: 8px; align-items: stretch; text-align: left')}>
      <div style={s('display: flex; justify-content: center')}><WLogo t={t} /></div>
      <span style={s('font-family: Marcellus, serif; font-size: 14px; text-align: center; letter-spacing: 0.3px')}>WHO WEARS THIS WATCH?</span>
      <button type="button" onClick={() => setStep('setup')} style={s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: #2BB5B0; color: #14202B; border: 0; text-align: left; font-family: inherit; cursor: pointer')}><span style={s('font-size: 14px; font-weight: 800')}>I'M THE PATIENT</span><span style={s('font-size: 10px; font-weight: 600')}>Track my health and medicine</span></button>
      <button type="button" onClick={finishCarerSetup} style={{ ...s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: transparent; text-align: left; font-family: inherit; cursor: pointer; box-sizing: border-box'), border: '1.5px solid ' + t.line, color: t.fg }}><span style={s('font-size: 14px; font-weight: 800')}>I'M A CAREGIVER</span><span style={{ fontSize: 10, color: t.muted }}>Look after other people</span></button>
    </div>
  );
  return (
    <div style={{ ...face(t, 'padding: 8px 14px 10px; gap: 4px; align-items: stretch; text-align: left; overflow-y: auto'), scrollbarWidth: 'none' }}>
      <div style={s('display: flex; justify-content: center')}><WLogo t={t} /></div>
      <div style={s('display: flex; align-items: center; justify-content: space-between; min-height: 28px')}><span style={s('font-size: 14px; font-weight: 800; letter-spacing: 0.3px')}>MYSELF</span><span aria-label="Myself, selected" style={{ ...s('width: 22px; height: 22px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center'), background: t.fg, color: t.bg }}><Tick size={14} color={t.bg} /></span></div>
      <button type="button" onClick={() => setNote('Photos come in a later version.')} style={{ ...s('display: flex; align-items: center; min-height: 24px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; font-weight: 800; letter-spacing: 0.3px; cursor: pointer'), color: t.teal }}>IMPORT PICTURE</button>
      {note && <span style={{ fontSize: 9, color: t.muted }}>{note}</span>}
      <span style={s('font-size: 14px; font-weight: 800; letter-spacing: 0.3px; margin-top: 2px')}>CHOOSE CONDITION</span>
      <div style={s('display: flex; flex-direction: column; gap: 5px')}>
        {CONDITIONS.map((c) => {
          const on = !!conds[c];
          return <button key={c} type="button" aria-pressed={on} onClick={() => setConds({ ...conds, [c]: !on })} style={{ ...s('flex-shrink: 0; height: 24px; border-radius: 9px; font-size: 10px; font-weight: 700; font-family: inherit; letter-spacing: 0.2px; cursor: pointer'), background: on ? '#2BB5B0' : 'transparent', color: on ? '#14202B' : t.fg, border: '1.5px solid ' + (on ? '#2BB5B0' : t.line) }}>{c.toUpperCase().replace(' / ', '/')}</button>;
        })}
      </div>
      <button type="button" disabled={!any} onClick={() => finishSetup(CONDITIONS.filter((c) => conds[c]))} style={{ ...s('flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 34px; margin-top: 6px; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; border: 0; background: transparent; font-family: inherit; cursor: pointer'), color: any ? t.teal : t.muted }}>DONE ...</button>
    </div>
  );
}

// ---- the watch face --------------------------------------------------------------

function Face({ st, t }) {
  const [screen, setScreen] = useState('home');
  const [dose, setDose] = useState(null);
  const [hold, setHold] = useState(0);
  const holdRef = useRef(null);
  const time = useClock();
  const p = st.patient;
  useEffect(() => { onDoseDue((d) => { setDose(d); setScreen('dose'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }); }, []);
  useEffect(() => { if (st.attention && screen === 'home') setScreen('high'); }, [st.attention]);
  useEffect(() => { if (p && p.ping && screen !== 'msg') { setScreen('msg'); if (navigator.vibrate) navigator.vibrate(150); } }, [p && p.ping && p.ping.at]);

  if (!st.ready) return <div style={face(t, 'justify-content: center; gap: 18px')}><WLogo t={t} big /><span style={{ fontSize: 10, color: t.muted }}>Starting…</span></div>;

  if (st.lost) return (
    <div style={face(t, 'padding: 12px 14px; gap: 8px')}>
      <WLogo t={t} />
      <span style={s('font-family: Marcellus, serif; font-size: 15px; margin-top: 10px')}>NOT LINKED</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>This watch was removed from the caregiver's phone.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={unlink} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>GET A NEW CODE</button>
    </div>
  );

  if (!st.pid && !st.carer && !(st.setup && st.setup.done)) return <Setup t={t} />;
  if (st.carer) return <CarerFace st={st} tBase={t} />;
  const carerCode = st.setup && st.setup.role === 'carer';

  if (!st.pid || !p) {
    const code = st.code || '······';
    return (
      <div style={face(t, 'padding: 8px 14px 12px; gap: 6px')} aria-label={'Linking code ' + code}>
        <WLogo t={t} />
        <span style={s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.3px')}>{carerCode ? 'LINK TO YOUR PHONE' : 'LINK THIS WATCH'}</span>
        <span style={s('display: flex; gap: 4px; margin-top: 4px')}>
          {code.split('').map((n, i) => <span key={i} style={{ ...s('width: 24px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800'), background: t.box, border: '1px solid ' + t.boxLine, marginRight: i === 2 ? 6 : 0 }}>{n}</span>)}
        </span>
        <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted, marginTop: 4 }}>{carerCode ? 'On your phone open myDoc › Profile › Pair a watch and type this code.' : "Type this code on your caregiver's phone or watch so they can look after you."}</span>
        <div style={s('flex-grow: 1')} />
        <span style={{ ...s('display: flex; align-items: center; gap: 6px; font-size: 10px'), color: t.muted }}>Waiting <span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
      </div>
    );
  }

  const carer = Object.values(p.carerNames || {})[0] || 'your caregiver';
  const today = doseStatus(p.doses, st.today);
  const next = today.find((d) => d.st === 'due') || today.find((d) => d.st === 'missed');
  const latest = (k) => p.recent && p.recent[k] && p.recent[k][0];
  const bad = ['sugar', 'bp', 'hr', 'o2'].find((k) => latest(k) && statusOf(k, latest(k).v) !== 'Normal');

  if (screen === 'linked' || (st.linked && screen === 'home' && !st.seenLinked)) return (
    <div style={face(t, 'padding: 8px 14px 12px; gap: 6px')}>
      <WLogo t={t} />
      <span className="md-pop" style={s('width: 44px; height: 44px; margin-top: 8px; border-radius: 22px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><Tick /></span>
      <span style={s('font-family: Marcellus, serif; font-size: 22px')}>LINKED</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>Linked to {carer}'s phone. They can now see your readings and medicine.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => { setOption({ seenLinked: true }); setScreen('home'); }} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>CONTINUE</button>
    </div>
  );

  if (screen === 'high' && bad) {
    const r = latest(bad), m = METRICS[bad], st2 = statusOf(bad, r.v);
    return (
      <div style={face({ ...t, bg: '#D62839', fg: '#FFFFFF' }, 'padding: 10px 12px; gap: 3px')}>
        <span className="md-wave-light" style={s('width: 52px; height: 52px; border-radius: 26px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800')}>!</span>
        <span style={s('font-family: Marcellus, serif; font-size: 12px; letter-spacing: 0.5px; margin-top: 4px')}>YOUR {(m.label || m.title).toUpperCase()} IS {st2.toUpperCase()}</span>
        <span style={s('font-size: 32px; font-weight: 800; line-height: 1')}>{showValue(bad, r)}</span>
        <span style={s('font-size: 11px; font-weight: 700')}>{(bad === 'o2' ? '%' : m.unit).toUpperCase()} · {clock(new Date(r.at))}</span>
        <div style={s('flex-grow: 1')} />
        {next ? <button type="button" onClick={() => { setDose(next); setScreen('dose'); }} style={s(wbtn + '; height: 36px; border-radius: 14px; background: #FFFFFF; color: #A81C2B; font-size: 12px; font-weight: 800')}>TAKE MEDICINE</button>
          : <button type="button" onClick={() => { setOption({ attention: null }); setScreen('home'); }} style={s(wbtn + '; height: 36px; border-radius: 14px; background: #FFFFFF; color: #A81C2B; font-size: 12px; font-weight: 800')}>OK</button>}
        <button type="button" onClick={() => { setOption({ attention: null }); setScreen('home'); }} style={s(wbtn + '; height: 30px; border-radius: 12px; border: 1.5px solid #FFFFFF; background: transparent; color: #FFFFFF; font-size: 11px; font-weight: 700')}>{next ? 'LATER' : 'BACK'}</button>
      </div>
    );
  }

  if (screen === 'dose' && dose) return (
    <div style={face(t, 'padding: 8px 12px 10px; gap: 3px')}>
      <WLogo t={t} />
      <span style={s('width: 38px; height: 38px; margin-top: 4px; border-radius: 19px; background: #2BB5B0; color: #14202B; display: flex; align-items: center; justify-content: center')}><Pill /></span>
      <span style={s('font-family: Marcellus, serif; font-size: 12px; letter-spacing: 0.5px')}>TIME FOR YOUR MEDICINE</span>
      <span style={s('font-size: 15px; font-weight: 800; line-height: 1.2')}>{dose.name}</span>
      <span style={{ fontSize: 11, color: t.muted }}>{dose.how} · {dose.time}</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={async () => { await takeDose(dose); setOption({ attention: null }); setScreen('taken'); }} style={s(wbtn + '; height: 38px; border-radius: 14px; background: #2BB5B0; color: #14202B; font-size: 14px; font-weight: 800')}><Tick size={16} />TAKEN</button>
      <button type="button" onClick={() => { setScreen('home'); setTimeout(() => { setDose(dose); setScreen('dose'); }, 10 * 60 * 1000); }} style={{ ...s(wbtn + '; height: 32px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 700'), border: '1.5px solid ' + t.line, color: t.fg }}>REMIND ME IN 10 MIN</button>
    </div>
  );

  if (screen === 'taken') {
    const after = doseStatus(p.doses, st.today).find((d) => d.st === 'due' || d.st === 'later');
    return (
      <div style={face(t, 'padding: 8px 12px 10px; gap: 6px')}>
        <WLogo t={t} />
        <span className="md-pop" style={s('width: 60px; height: 60px; margin-top: 6px; border-radius: 30px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><Tick size={30} /></span>
        <span style={s('font-family: Marcellus, serif; font-size: 20px')}>WELL DONE</span>
        <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{carer} can see you took your {dose && dose.time} dose.</span>
        <div style={s('flex-grow: 1')} />
        <button type="button" onClick={() => setScreen('home')} style={{ ...s(wbtn + '; height: 32px; border-radius: 12px; font-size: 12px; font-weight: 600'), background: t.tealTint, color: t.tealInk }}>{after ? 'Next dose ' + after.time : 'DONE'}</button>
      </div>
    );
  }

  if (screen === 'msg' && p.ping) return (
    <div style={face(t, 'padding: 8px 12px 10px; gap: 6px')}>
      <WLogo t={t} />
      <span style={s('font-family: Marcellus, serif; font-size: 12px; letter-spacing: 0.5px; margin-top: 8px')}>MESSAGE FROM {String(p.ping.from).toUpperCase()}</span>
      <span style={s('font-size: 15px; font-weight: 700; line-height: 1.3')}>{p.ping.text}</span>
      <div style={s('flex-grow: 1')} />
      {p.ping.kind === 'dose' && next && <button type="button" onClick={() => { clearPing(); setDose(next); setScreen('dose'); }} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>TAKE NOW</button>}
      <button type="button" onClick={() => { clearPing(); setScreen('home'); }} style={{ ...s(wbtn + '; height: 32px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 700'), border: '1.5px solid ' + t.line, color: t.fg }}>{p.ping.kind === 'dose' && next ? 'LATER' : "I'M OK"}</button>
    </div>
  );

  if (screen === 'sos') {
    const start = () => {
      const t0 = Date.now();
      holdRef.current = setInterval(() => {
        const f = Math.min(1, (Date.now() - t0) / 3000);
        setHold(f);
        if (f >= 1) { clearInterval(holdRef.current); setHold(0); if (navigator.vibrate) navigator.vibrate([300, 100, 300]); sendSOS(); setScreen('sent'); }
      }, 50);
    };
    const end = () => { clearInterval(holdRef.current); setHold(0); };
    return (
      <div style={face(t, 'padding: 6px 10px 10px; gap: 6px')}>
        <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setScreen('home')} /><WLogo t={t} /><span style={s('width: 32px')} /></div>
        <span style={s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.5px')}>NEED HELP?</span>
        <button type="button" aria-label="SOS, press and hold for 3 seconds" onPointerDown={start} onPointerUp={end} onPointerLeave={end} onContextMenu={(e) => e.preventDefault()}
          className={hold ? '' : 'md-wave'} style={{ ...s('position: relative; display: flex; flex-direction: column; width: 100px; height: 100px; border-radius: 50px; background: #D62839; color: #FFFFFF; align-items: center; justify-content: center; cursor: pointer; touch-action: none; user-select: none; font-family: inherit; padding: 0'), border: '5px solid ' + t.ring, backgroundImage: hold ? `conic-gradient(rgba(255,255,255,0.35) ${hold * 360}deg, transparent 0)` : 'none' }}>
          <span style={s('font-size: 26px; font-weight: 800; line-height: 1')}>SOS</span><span style={s('font-size: 10px; font-weight: 600')}>{hold ? 'keep holding' : 'hold 3 s'}</span>
        </button>
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>Shares your location and tells {carer}</span>
      </div>
    );
  }

  if (screen === 'sent') return (
    <div style={face(t)}>
      <div style={{ ...s('width: 100%; height: 40px; display: flex; align-items: center; justify-content: center') }}><WLogo t={t} /></div>
      <button type="button" onClick={() => setScreen('home')} style={s('display: flex; flex-direction: column; align-items: center; justify-content: center; width: 156px; height: 116px; margin-top: 34px; border-radius: 26px; background: #D62839; border: 0; position: relative; box-shadow: 0 10px 22px rgba(214,40,57,0.3); padding-top: 14px; box-sizing: border-box; cursor: pointer; font-family: inherit')}>
        <span className="md-pop" style={{ ...s('position: absolute; top: -20px; width: 40px; height: 40px; border-radius: 20px; background: #2BB5B0; display: flex; align-items: center; justify-content: center'), border: '3px solid ' + t.bg }}><Tick /></span>
        <span style={s('font-family: Marcellus, serif; font-size: 30px; color: #14202B; line-height: 1')}>SENT</span>
        <span style={s('font-family: Marcellus, serif; font-size: 10px; color: #FFFFFF; line-height: 1.3; margin-top: 6px; padding: 0 10px')}>{carer} has been told and can see where you are</span>
      </button>
      <span style={{ fontSize: 10, color: t.muted, marginTop: 10 }}>Tap the card to close</span>
    </div>
  );

  if (screen === 'vitals') {
    const ks = ['sugar', 'bp', 'hr', 'o2'].filter((k) => latest(k));
    return (
      <div style={face(t, 'padding: 6px 10px 10px; gap: 5px')}>
        <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setScreen('home')} /><span style={s('font-family: Marcellus, serif; font-size: 13px')}>MY READINGS</span><span style={s('width: 32px')} /></div>
        {ks.map((k) => {
          const r = latest(k), warn = statusOf(k, r.v) !== 'Normal';
          return <div key={k} style={{ ...s('display: flex; width: 100%; justify-content: space-between; align-items: center; padding: 5px 10px; border-radius: 12px; box-sizing: border-box'), background: warn ? '#D62839' : t.box, color: warn ? '#FFFFFF' : t.fg }}><span style={s('font-size: 10px; font-weight: 700')}>{METRICS[k].short}</span><span style={s('font-size: 15px; font-weight: 800')}>{showValue(k, r)}{k === 'o2' ? '%' : ''}</span></div>;
        })}
        <span style={{ fontSize: 9, color: t.muted }}>Updated {ago(Math.max(...ks.map((k) => latest(k).at)))}</span>
      </div>
    );
  }

  // home
  const tiles = ['bp', 'hr', 'o2'].filter((k) => latest(k) && k !== bad).slice(0, 2);
  const top = bad || (latest('sugar') ? 'sugar' : null);
  return (
    <div style={face(t, 'padding: 8px 12px 10px; gap: 6px; align-items: stretch; text-align: left')}>
      <div style={s('display: flex; justify-content: space-between; align-items: center')}><span style={s('font-size: 15px; font-weight: 700')}>{time}</span><WLogo t={t} /></div>
      {top && (() => {
        const r = latest(top), w = statusOf(top, r.v) !== 'Normal', m = METRICS[top];
        return (
          <button type="button" onClick={() => setScreen(w ? 'high' : 'vitals')} className={w ? 'md-wave' : ''} style={{ ...s('display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 12px; border-radius: 23px; border: 0; cursor: pointer; font-family: inherit; text-align: left'), background: w ? '#D62839' : t.tealTint, color: w ? '#FFFFFF' : t.tealInk }}>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1; line-height: 1.1')}><span style={s('font-size: 9px; font-weight: 700')}>{(m.label || m.title).toUpperCase()} · {statusOf(top, r.v).toUpperCase()}</span><span style={s('font-size: 18px; font-weight: 800')}>{showValue(top, r)} <span style={s('font-size: 10px')}>{top === 'o2' ? '%' : m.unit}</span></span></span>
          </button>
        );
      })()}
      {tiles.length > 0 && (
        <button type="button" onClick={() => setScreen('vitals')} aria-label="My health readings" style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit')}>
          {tiles.map((k) => <div key={k} style={{ ...s('display: flex; flex-direction: column; align-items: center; padding: 6px 4px; border-radius: 16px'), background: t.raised, boxShadow: t.shadow, border: '1px solid ' + t.line, color: t.fg }}><span style={{ fontSize: 8, fontWeight: 700, color: t.red }}>{(METRICS[k].label || METRICS[k].title).toUpperCase()}</span><span style={s('font-size: 14px; font-weight: 800')}>{showValue(k, latest(k))}{k === 'o2' ? '%' : ''}</span></div>)}
        </button>
      )}
      {!top && !tiles.length && <div style={{ fontSize: 11, color: t.muted, padding: '18px 4px' }}>Measuring… first readings appear in a moment.</div>}
      <button type="button" onClick={() => { if (next) { setDose(next); setScreen('dose'); } }} style={{ ...s('display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 12px; border: 0; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer'), background: next && next.st === 'missed' ? '#FFF1DB' : t.tealTint, color: next && next.st === 'missed' ? '#8A5300' : t.tealInk }}>
        {next ? (next.st === 'missed' ? 'Missed: ' + next.name.split(' ')[0] + ' ' + next.time : 'Next dose ' + next.time) : (p.doses || []).length ? 'All doses taken today' : 'No medicine set'}
      </button>
      <button type="button" onClick={() => setScreen('sos')} style={{ ...s('display: flex; align-items: center; justify-content: center; height: 30px; border-radius: 12px; background: transparent; font-size: 12px; font-weight: 800; letter-spacing: 1px; font-family: inherit; cursor: pointer'), border: '1.5px solid ' + t.red, color: t.red }}>SOS</button>
    </div>
  );
}

// ---- the page: watch on top, test controls below -----------------------------------

export default function WatchPage() {
  const st = useSim();
  const t = THEMES[st.theme || 'light'];
  const p = st.patient;
  const [busy, setBusy] = useState('');
  const run = async (label, f) => { setBusy(label); try { await f(); } finally { setTimeout(() => setBusy(''), 600); } };
  const btn = 'height: 40px; padding: 0 12px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1.5px solid #D5DBE0; background: #FFFFFF; color: #14202B';
  const label = 'font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: #5B6672';
  return (
    <div style={s('min-height: 100dvh; background: #E9EDF0; font-family: Poppins, system-ui, sans-serif; color: #14202B; display: flex; flex-direction: column; align-items: center; padding: 20px 16px 32px; box-sizing: border-box; gap: 20px')}>
      <div style={s('display: flex; flex-direction: column; align-items: center')} aria-label="Simulated watch">
        <div style={s('width: 120px; height: 46px; background: #2E3A45; border-radius: 16px 16px 0 0')} />
        <div style={s('padding: 14px; border-radius: 64px; background: #14202B; box-shadow: 0 20px 50px rgba(20,32,43,0.35)')}>
          <div style={s('width: 277px; height: 339px; border-radius: 48px; overflow: hidden; background: #000000')}>
            <div style={{ transform: 'scale(1.4)', transformOrigin: '0 0', width: 198, height: 242 }}><Face st={st} t={t} /></div>
          </div>
        </div>
        <div style={s('width: 120px; height: 46px; background: #2E3A45; border-radius: 0 0 16px 16px')} />
      </div>

      <section style={s('width: 100%; max-width: 440px; background: #FFFFFF; border-radius: 24px; padding: 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <h1 style={s('margin: 0; font-size: 20px; font-weight: 700')}>Watch simulator</h1>
          <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>Stands in for the patient's smartwatch while there is no hardware. It sends the same data a real watch would.</span>
        </div>
        <div style={s('padding: 10px 12px; border-radius: 14px; font-size: 13px; line-height: 1.5; ' + (online ? 'background: #E3F5F3; color: #075955' : 'background: #FFF1DB; color: #8A5300'))}>
          {online ? 'Online: works with the myDoc app on any phone.' : 'This phone only: open the myDoc app in another tab of this browser to see the readings.'}
        </div>
        <div style={s('display: flex; justify-content: space-between; gap: 12px; font-size: 14px')}>
          <span style={s('color: #5B6672')}>Status</span>
          <span style={s('font-weight: 600; text-align: right')}>{!st.ready ? 'Starting…' : st.carer ? `Caregiver watch of ${st.carer.name}` : p ? `Linked to ${p.name}` : st.lost ? 'Unlinked' : !(st.setup && st.setup.done) ? 'Setting up the watch' : 'Waiting for the code to be typed'}</span>
        </div>

        {st.carer ? (
          <div style={s('font-size: 13px; line-height: 1.5; color: #5B6672')}>This is the caregiver's own watch. To make readings and alerts appear on it, open another watch simulator as a patient (another tab or phone) and use its test buttons.</div>
        ) : <>
        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <span style={s(label)}>Health profile</span>
          <select id="sim-profile" value={st.profile} onChange={(e) => setOption({ profile: e.target.value })} style={s('height: 44px; border: 1.5px solid #D5DBE0; border-radius: 12px; padding: 0 10px; font-size: 15px; font-family: inherit; background: #FFFFFF; color: #14202B')}>
            {Object.entries(PROFILES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <button type="button" role="switch" aria-checked={!!st.auto} onClick={() => setOption({ auto: !st.auto })} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; text-align: left; cursor: pointer')}><span>Send normal readings every minute (while this page is open)</span><Toggle on={!!st.auto} /></button>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <span style={s(label)}>Send a reading now</span>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            <button type="button" disabled={!p} onClick={() => run('normal', sendNormal)} style={s(btn + '; border-color: #0B7A75; color: #0B7A75')}>{busy === 'normal' ? 'Sent ✓' : 'All normal'}</button>
            {Object.entries(SCENARIOS).map(([id, sc]) => <button key={id} type="button" disabled={!p} onClick={() => run(id, () => runScenario(id))} style={s(btn + '; border-color: #F2B8BE; color: #A81C2B')}>{busy === id ? 'Sent ✓' : sc.label}</button>)}
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <label htmlFor="sim-place" style={s(label)}>Where the patient is</label>
          <select id="sim-place" value={st.place || 0} onChange={(e) => setPlace(Number(e.target.value))} style={s('height: 44px; border: 1.5px solid #D5DBE0; border-radius: 12px; padding: 0 10px; font-size: 15px; font-family: inherit; background: #FFFFFF; color: #14202B')}>
            {PLACES.map((pl, i) => <option key={i} value={i}>{pl.short}</option>)}
          </select>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <label htmlFor="sim-battery" style={s(label)}>Battery {st.battery}%</label>
          <input id="sim-battery" type="range" min="5" max="100" step="1" value={st.battery || 80} onChange={(e) => setOption({ battery: Number(e.target.value) })} onPointerUp={(e) => setBattery(Number(e.target.value))} onKeyUp={(e) => setBattery(Number(e.target.value))} />
        </div>

        </>}
        <div style={s('display: flex; gap: 8px; flex-wrap: wrap')}>
          <button type="button" onClick={() => setOption({ theme: st.theme === 'dark' ? 'light' : 'dark' })} style={s(btn)}>{st.theme === 'dark' ? 'Light watch face' : 'Dark watch face'}</button>
          {p && <button type="button" onClick={unlink} style={s(btn + '; color: #A81C2B')}>Unlink this watch</button>}
          <button type="button" onClick={resetWatch} style={s(btn)}>Start setup again</button>
        </div>
        <a href="./" style={s('font-size: 14px; font-weight: 600; color: #0B7A75')}>Open the myDoc phone app</a>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { s, Toggle } from '../ui.jsx';
import { online } from '../backend/index.js';
import { METRICS, statusOf, showValue, doseStatus, clock, ago } from '../health.js';
import { getSim, onSim, setOption, sendNormal, runScenario, setPlace, setBattery, takeDose, sendSOS, clearPing, onDoseDue, finishSetup, finishCarerSetup, startReplace, resetWatch, makeRecovery, recoverWithCode, deleteMyData, showCode, cleanCode, demoStory, startPairing, stopPairing, answerRequest, removeCarer, PROFILES, PLACES, SCENARIOS } from './sim.js';
import { CONDITIONS, initials } from '../health.js';
import CarerFace, { CarerUnlinked } from './Carer.jsx';

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
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [contact, setContact] = useState(null);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const any = Object.values(conds).some(Boolean) && name.trim();
  const input = { ...s('flex-shrink: 0; height: 28px; border-radius: 9px; padding: 0 8px; font-size: 12px; font-family: inherit; box-sizing: border-box; outline: none; width: 100%'), background: t.box, border: '1.5px solid ' + t.boxLine, color: t.fg };
  if (step === 'splash') return (
    <button type="button" aria-label="myDoc. Tap to start" onClick={() => setStep('role')} style={{ ...face(t, 'justify-content: center; gap: 18px; border: 0; cursor: pointer; padding: 0'), font: 'inherit' }}>
      <span className="md-pop" style={{ ...s("display: flex; align-items: baseline; gap: 2px; font-family: 'Kaushan Script', cursive; line-height: 1; text-shadow: 0 3px 6px rgba(214,40,57,0.22)"), color: t.logo }}><span style={{ fontSize: 22 }}>my</span><span style={{ fontSize: 52 }}>DOC</span></span>
      <span style={{ fontSize: 10, color: t.muted }}>Tap to start</span>
    </button>
  );
  if (step === 'newold') return (
    <div style={face(t, 'padding: 4px 14px 12px; gap: 8px; align-items: stretch; text-align: left')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setStep('role')} /><WLogo t={t} /><span style={s('width: 32px')} /></div>
      <button type="button" onClick={() => setStep('setup')} style={s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: #2BB5B0; color: #14202B; border: 0; text-align: left; font-family: inherit; cursor: pointer')}><span style={s('font-size: 14px; font-weight: 800')}>NEW TO MYDOC</span><span style={s('font-size: 10px; font-weight: 600')}>Set up my profile</span></button>
      <button type="button" onClick={() => { startReplace(); setStep('replace'); }} style={{ ...s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: transparent; text-align: left; font-family: inherit; cursor: pointer; box-sizing: border-box'), border: '1.5px solid ' + t.line, color: t.fg }}><span style={s('font-size: 14px; font-weight: 800')}>REPLACING MY WATCH</span><span style={{ fontSize: 10, color: t.muted }}>Keep my history and caregivers</span></button>
    </div>
  );
  if (step === 'replace') return <ReplaceCode t={t} onBack={() => setStep('newold')} onRecover={() => setStep('recover')} />;
  if (step === 'recover') return <Recover t={t} input={input} onBack={() => { startReplace(); setStep('replace'); }} />;
  if (step === 'role') return (
    <div style={face(t, 'padding: 8px 14px 12px; gap: 8px; align-items: stretch; text-align: left')}>
      <div style={s('display: flex; justify-content: center')}><WLogo t={t} /></div>
      <span style={s('font-family: Marcellus, serif; font-size: 14px; text-align: center; letter-spacing: 0.3px')}>WHO WEARS THIS WATCH?</span>
      <button type="button" onClick={() => setStep('newold')} style={s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: #2BB5B0; color: #14202B; border: 0; text-align: left; font-family: inherit; cursor: pointer')}><span style={s('font-size: 14px; font-weight: 800')}>I'M THE PATIENT</span><span style={s('font-size: 10px; font-weight: 600')}>Track my health and medicine</span></button>
      <button type="button" onClick={finishCarerSetup} style={{ ...s('display: flex; flex-direction: column; justify-content: center; gap: 1px; height: 62px; padding: 0 14px; border-radius: 18px; background: transparent; text-align: left; font-family: inherit; cursor: pointer; box-sizing: border-box'), border: '1.5px solid ' + t.line, color: t.fg }}><span style={s('font-size: 14px; font-weight: 800')}>I'M A CAREGIVER</span><span style={{ fontSize: 10, color: t.muted }}>Look after other people</span></button>
    </div>
  );
  if (step === 'contact') return (
    <div style={{ ...face(t, 'padding: 6px 12px 8px; gap: 5px; align-items: stretch; text-align: left; overflow-y: auto'), scrollbarWidth: 'none' }}>
      <div style={s('display: flex; justify-content: center')}><WLogo t={t} /></div>
      <span style={s('font-size: 13px; font-weight: 800; letter-spacing: 0.3px')}>EMERGENCY CONTACT</span>
      {contact && (
        <div style={{ ...s('flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 6px 4px 6px 8px; border-radius: 14px'), border: '1.5px solid ' + t.line }}>
          <span style={s('width: 28px; height: 28px; flex-shrink: 0; border-radius: 10px; background: #FCE1B0; color: #6B4100; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center')}>{contact.ini}</span>
          <span style={s('display: flex; flex-direction: column; flex-grow: 1; min-width: 0')}><span style={{ fontSize: 13, fontWeight: 800, color: t.red }}>{contact.name}</span><span style={{ fontSize: 9, color: t.muted }}>{contact.phone}</span></span>
          <button type="button" aria-label={'Remove ' + contact.name} onClick={() => setContact(null)} style={{ ...s('width: 28px; height: 28px; border: 0; background: transparent; cursor: pointer; font-size: 14px; font-family: inherit'), color: t.muted }}>✕</button>
        </div>
      )}
      {adding ? <>
        <input aria-label="Contact name" placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} style={input} />
        <input aria-label="Contact phone" placeholder="Phone" type="tel" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} style={input} />
        <button type="button" disabled={!nc.name.trim() || !nc.phone.trim()} onClick={() => { setContact({ name: nc.name.trim(), ini: initials(nc.name), rel: 'Emergency contact', phone: nc.phone.trim() }); setAdding(false); }} style={s(wbtn + '; flex-shrink: 0; height: 28px; border-radius: 10px; background: #2BB5B0; color: #14202B; font-size: 11px; font-weight: 800')}>ADD</button>
      </> : !contact && <button type="button" onClick={() => setAdding(true)} style={{ ...s('flex-shrink: 0; height: 30px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800; font-family: inherit; cursor: pointer'), border: '1.5px dashed ' + t.teal, color: t.teal }}>+ ADD CONTACT</button>}
      <span style={{ fontSize: 9, color: t.muted, lineHeight: 1.4 }}>Called if you press SOS. You can skip this.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); await finishSetup({ name: name.trim(), conds: CONDITIONS.filter((c) => conds[c]), contacts: contact ? [contact] : [] }); }} style={{ ...s('flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 30px; font-size: 22px; font-weight: 800; border: 0; background: transparent; font-family: inherit; cursor: pointer'), color: t.teal }}>{busy ? 'SAVING…' : 'DONE ...'}</button>
    </div>
  );
  return (
    <div style={{ ...face(t, 'padding: 8px 14px 10px; gap: 4px; align-items: stretch; text-align: left; overflow-y: auto'), scrollbarWidth: 'none' }}>
      <div style={s('display: flex; justify-content: center')}><WLogo t={t} /></div>
      <label htmlFor="w-myname" style={s('font-size: 14px; font-weight: 800; letter-spacing: 0.3px')}>YOUR NAME</label>
      <input id="w-myname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mama Nkechi" style={input} />
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
      <button type="button" disabled={!any} onClick={() => setStep('contact')} style={{ ...s('flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 34px; margin-top: 6px; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; border: 0; background: transparent; font-family: inherit; cursor: pointer'), color: any ? t.teal : t.muted }}>DONE ...</button>
    </div>
  );
}

// New watch, no caregiver: type the recovery code written down at setup.
function Recover({ t, input, onBack }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setErr(await recoverWithCode(code)); setBusy(false); };
  return (
    <div style={face(t, 'padding: 4px 14px 12px; gap: 6px; align-items: stretch')}>
      <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={onBack} /><WLogo t={t} /><span style={s('width: 32px')} /></div>
      <label htmlFor="w-recover" style={s('font-family: Marcellus, serif; font-size: 13px; letter-spacing: 0.3px')}>RECOVERY CODE</label>
      <input id="w-recover" value={code} autoCapitalize="characters" autoComplete="off" maxLength={9} placeholder="ABCD-1234" onChange={(e) => { setErr(''); const c = cleanCode(e.target.value).slice(0, 8); setCode(c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4) : c); }} style={{ ...input, height: 34, fontSize: 16, fontWeight: 800, letterSpacing: 2, textAlign: 'center' }} />
      <span role={err ? 'alert' : undefined} style={{ fontSize: 10, lineHeight: 1.4, color: err ? t.red : t.muted }}>{err || 'The code you wrote down when you first set up myDoc.'}</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" disabled={busy || cleanCode(code).length !== 8} onClick={go} style={{ ...s(wbtn + '; height: 34px; border-radius: 12px; font-size: 12px; font-weight: 800'), background: cleanCode(code).length === 8 ? '#2BB5B0' : t.box, color: '#14202B' }}>{busy ? 'CHECKING…' : 'MOVE ME TO THIS WATCH'}</button>
    </div>
  );
}

function ReplaceCode({ t, onBack, onRecover }) {
  const st = useSim();
  const code = st.code || '······';
  return (
    <div style={face(t, 'padding: 4px 14px 12px; gap: 6px')} aria-label={'Linking code ' + code}>
      <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={onBack} /><WLogo t={t} /><span style={s('width: 32px')} /></div>
      <span style={s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.3px')}>REPLACING MY WATCH</span>
      <span style={s('display: flex; gap: 4px; margin-top: 2px')}>
        {code.split('').map((n, i) => <span key={i} style={{ ...s('width: 24px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800'), background: t.box, border: '1px solid ' + t.boxLine, marginRight: i === 2 ? 6 : 0 }}>{n}</span>)}
      </span>
      <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted, marginTop: 2 }}>Ask your caregiver to type this code in myDoc on their phone: Add a person.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={onRecover} style={{ ...s('border: 0; background: transparent; padding: 2px; font-size: 10px; font-weight: 800; font-family: inherit; cursor: pointer; text-decoration: underline'), color: t.teal }}>NO CAREGIVER? USE RECOVERY CODE</button>
      <span style={{ ...s('display: flex; align-items: center; gap: 6px; font-size: 10px'), color: t.muted }}>Waiting <span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
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

  if (!st.pid && !st.carer && !(st.setup && st.setup.done)) return <Setup t={t} />;
  if (st.carer) return <CarerFace st={st} tBase={t} />;
  if (st.setup && st.setup.role === 'carer') return <CarerUnlinked st={st} t={t} />;

  if (st.lost) return (
    <div style={face(t, 'padding: 12px 14px; gap: 8px')}>
      <WLogo t={t} />
      <span style={s('font-family: Marcellus, serif; font-size: 15px; margin-top: 10px')}>{st.replaced ? 'REPLACED' : 'NOT SET UP'}</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{st.replaced ? 'Your profile has moved to your new watch. This one no longer sends your readings.' : "This watch's profile can't be found. Set it up again."}</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={resetWatch} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>SET UP AGAIN</button>
    </div>
  );
  if (!p) return <div style={face(t, 'justify-content: center; gap: 18px')}><WLogo t={t} big /><span style={{ fontSize: 10, color: t.muted }}>Loading…</span></div>;

  const names = Object.values(p.carerNames || {});
  const carer = names.length ? names.join(' and ') : 'nobody yet';
  const today = doseStatus(p.doses, st.today);
  const next = today.find((d) => d.st === 'due') || today.find((d) => d.st === 'missed');
  const latest = (k) => p.recent && p.recent[k] && p.recent[k][0];
  const bad = ['sugar', 'bp', 'hr', 'o2'].find((k) => latest(k) && statusOf(k, latest(k).v) !== 'Normal');

  if (st.showRecovery && st.recovery) return (
    <div style={face(t, 'padding: 8px 12px 10px; gap: 5px')}>
      <WLogo t={t} />
      <span style={s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.3px; margin-top: 4px')}>YOUR RECOVERY CODE</span>
      <span aria-label={'Recovery code ' + st.recovery.split('').join(' ')} style={{ ...s('padding: 6px 10px; border-radius: 10px; font-size: 20px; font-weight: 800; letter-spacing: 2px'), background: t.box, border: '1px solid ' + t.boxLine }}>{showCode(st.recovery)}</span>
      <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>Write it down and keep it safe. If you lose this watch, it moves your record to a new one, even with no caregiver.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => setOption({ showRecovery: false })} style={s(wbtn + '; height: 32px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 11px; font-weight: 800')}>I'VE WRITTEN IT DOWN</button>
    </div>
  );

  if (screen === 'delete') return (
    <div style={face(t, 'padding: 8px 12px 10px; gap: 5px')}>
      <WLogo t={t} />
      <span style={{ ...s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.3px; margin-top: 4px'), color: t.red }}>DELETE ALL YOUR DATA?</span>
      <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>Your readings, medicine, alerts and location are erased for good, and your caregivers lose access. This can't be undone.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={async () => { setScreen('deleting'); await deleteMyData(); setScreen('home'); }} style={{ ...s(wbtn + '; height: 32px; border-radius: 12px; color: #FFFFFF; font-size: 11px; font-weight: 800'), background: t.red }}>YES, DELETE EVERYTHING</button>
      <button type="button" onClick={() => setScreen('settings')} style={{ ...s(wbtn + '; height: 28px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800'), color: t.fg }}>NO, KEEP IT</button>
    </div>
  );
  if (screen === 'deleting') return <div style={face(t, 'justify-content: center; gap: 6px')}><WLogo t={t} /><span style={{ fontSize: 11, color: t.muted }}>Deleting…</span></div>;

  if (st.welcomeBack != null && st.welcomeBack !== '' ) return (
    <div style={face(t, 'padding: 8px 14px 12px; gap: 6px')}>
      <WLogo t={t} />
      <span className="md-pop" style={s('width: 44px; height: 44px; margin-top: 8px; border-radius: 22px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><Tick /></span>
      <span style={s('font-family: Marcellus, serif; font-size: 16px')}>WELCOME BACK</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{p.name}, your history, medicine and caregivers are on this watch now.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => setOption({ welcomeBack: '' })} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>CONTINUE</button>
    </div>
  );

  // Settings (patient): pair with a caregiver, my caregivers, theme.
  if (screen === 'settings') return (
    <div style={{ ...face(t, 'padding: 4px 10px 10px; gap: 6px; align-items: stretch; text-align: left; overflow-y: auto'), scrollbarWidth: 'none' }}>
      <div style={s('display: flex; flex-shrink: 0; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => setScreen('home')} /><span style={s('font-family: Marcellus, serif; font-size: 14px')}>SETTINGS</span><span style={s('width: 32px')} /></div>
      <button type="button" onClick={() => { startPairing(); setScreen('pair'); }} style={s(wbtn + '; flex-shrink: 0; height: 40px; border-radius: 14px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>PAIR WITH A CAREGIVER</button>
      <button type="button" onClick={() => setScreen('carers')} style={{ ...s(wbtn + '; flex-shrink: 0; height: 36px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800; justify-content: space-between; padding: 0 12px'), border: '1.5px solid ' + t.line, color: t.fg }}><span>MY CAREGIVERS</span><span style={{ color: t.teal }}>{names.length}</span></button>
      <div style={{ ...s('display: grid; flex-shrink: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; padding: 3px; border-radius: 12px'), background: t.box }}>
        {['light', 'dark'].map((k) => <button key={k} type="button" onClick={() => setOption({ theme: k })} style={{ ...s(wbtn + '; height: 26px; border-radius: 9px; font-size: 11px; font-weight: 700'), background: (st.theme || 'light') === k ? '#2BB5B0' : 'transparent', color: (st.theme || 'light') === k ? '#14202B' : t.fg }}>{k === 'light' ? 'Light' : 'Dark'}</button>)}
      </div>
      <div style={s('display: flex; align-items: center; justify-content: space-between; font-size: 11px')}><span>Emergency number</span><b style={{ color: t.red }}>112</b></div>
      <button type="button" onClick={() => (st.recovery ? setOption({ showRecovery: true }) : makeRecovery())} style={{ ...s(wbtn + '; flex-shrink: 0; height: 30px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800'), border: '1.5px solid ' + t.line, color: t.fg }}>{st.recovery ? 'RECOVERY CODE' : 'MAKE A RECOVERY CODE'}</button>
      <button type="button" onClick={() => setScreen('delete')} style={{ ...s(wbtn + '; flex-shrink: 0; height: 26px; border-radius: 12px; background: transparent; font-size: 10px; font-weight: 800'), color: t.red }}>DELETE MY DATA</button>
      <a href="./privacy.html" target="_blank" rel="noopener" style={{ ...s('flex-shrink: 0; text-align: center; font-size: 10px; font-weight: 700'), color: t.muted }}>Privacy</a>
    </div>
  );

  if (screen === 'carers') return (
    <div style={{ ...face(t, 'padding: 4px 10px 10px; gap: 6px; align-items: stretch; text-align: left; overflow-y: auto'), scrollbarWidth: 'none' }}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; flex-shrink: 0')}><Back t={t} onClick={() => setScreen('settings')} /><span style={s('font-family: Marcellus, serif; font-size: 13px')}>MY CAREGIVERS</span><span style={s('width: 32px')} /></div>
      {Object.entries(p.carerNames || {}).map(([uid, nm]) => (
        <div key={uid} style={{ ...s('flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 12px'), border: '1px solid ' + t.line }}>
          <span style={s('flex-grow: 1; font-size: 12px; font-weight: 700')}>{nm}</span>
          <button type="button" onClick={() => (screen === 'carers' && st.confirmRemove === uid ? (removeCarer(uid), setOption({ confirmRemove: null })) : setOption({ confirmRemove: uid }))} style={{ ...s('border: 0; background: transparent; font-size: 10px; font-weight: 800; font-family: inherit; cursor: pointer'), color: t.red }}>{st.confirmRemove === uid ? 'SURE?' : 'REMOVE'}</button>
        </div>
      ))}
      {!names.length && <span style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>Nobody is looking after you yet. Use Pair with a caregiver.</span>}
    </div>
  );

  if (screen === 'pair') {
    const r = st.request;
    if (r) return (
      <div style={face(t, 'padding: 8px 12px 10px; gap: 5px')}>
        <WLogo t={t} />
        <span style={s('font-family: Marcellus, serif; font-size: 13px; letter-spacing: 0.3px; margin-top: 6px')}>ALLOW {String(r.carerName).toUpperCase()} TO SEE YOUR HEALTH?</span>
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>They'll see your readings, medicine and location, and get your alerts.</span>
        <div style={s('flex-grow: 1')} />
        <button type="button" onClick={async () => { await answerRequest(true); setScreen('accepted'); }} style={s(wbtn + '; height: 36px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 13px; font-weight: 800')}>YES</button>
        <button type="button" onClick={async () => { await answerRequest(false); setScreen('home'); }} style={{ ...s(wbtn + '; height: 30px; border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800'), border: '1.5px solid ' + t.line, color: t.fg }}>NO</button>
      </div>
    );
    const code = st.code || '······';
    return (
      <div style={face(t, 'padding: 4px 14px 12px; gap: 6px')} aria-label={'Linking code ' + code}>
        <div style={s('display: flex; width: 100%; align-items: center; justify-content: space-between')}><Back t={t} onClick={() => { stopPairing(); setScreen('settings'); }} /><WLogo t={t} /><span style={s('width: 32px')} /></div>
        <span style={s('font-family: Marcellus, serif; font-size: 14px; letter-spacing: 0.3px')}>PAIR WITH A CAREGIVER</span>
        <span style={s('display: flex; gap: 4px; margin-top: 2px')}>
          {code.split('').map((n, i) => <span key={i} style={{ ...s('width: 24px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800'), background: t.box, border: '1px solid ' + t.boxLine, marginRight: i === 2 ? 6 : 0 }}>{n}</span>)}
        </span>
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted, marginTop: 2 }}>Your caregiver types this code in myDoc on their phone or watch.</span>
        <div style={s('flex-grow: 1')} />
        <span style={{ ...s('display: flex; align-items: center; gap: 6px; font-size: 10px'), color: t.muted }}>Waiting <span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
      </div>
    );
  }

  if (screen === 'accepted') return (
    <div style={face(t, 'padding: 8px 14px 12px; gap: 6px')}>
      <WLogo t={t} />
      <span className="md-pop" style={s('width: 44px; height: 44px; margin-top: 8px; border-radius: 22px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><Tick /></span>
      <span style={s('font-family: Marcellus, serif; font-size: 22px')}>LINKED</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{names[names.length - 1] || 'Your caregiver'} can now see your readings and medicine.</span>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={() => setScreen('home')} style={s(wbtn + '; height: 34px; border-radius: 12px; background: #2BB5B0; color: #14202B; font-size: 12px; font-weight: 800')}>CONTINUE</button>
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
        <span style={{ fontSize: 11, lineHeight: 1.4, color: t.muted }}>{names.length ? carer + ' can see' : 'Saved:'} you took your {dose && dose.time} dose.</span>
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
        <span style={{ fontSize: 10, lineHeight: 1.4, color: t.muted }}>{names.length ? 'Shares your location and tells ' + carer : 'Shares your location with your emergency contact'}</span>
      </div>
    );
  }

  if (screen === 'sent') return (
    <div style={face(t)}>
      <div style={{ ...s('width: 100%; height: 40px; display: flex; align-items: center; justify-content: center') }}><WLogo t={t} /></div>
      <button type="button" onClick={() => setScreen('home')} style={s('display: flex; flex-direction: column; align-items: center; justify-content: center; width: 156px; height: 116px; margin-top: 34px; border-radius: 26px; background: #D62839; border: 0; position: relative; box-shadow: 0 10px 22px rgba(214,40,57,0.3); padding-top: 14px; box-sizing: border-box; cursor: pointer; font-family: inherit')}>
        <span className="md-pop" style={{ ...s('position: absolute; top: -20px; width: 40px; height: 40px; border-radius: 20px; background: #2BB5B0; display: flex; align-items: center; justify-content: center'), border: '3px solid ' + t.bg }}><Tick /></span>
        <span style={s('font-family: Marcellus, serif; font-size: 30px; color: #14202B; line-height: 1')}>SENT</span>
        <span style={s('font-family: Marcellus, serif; font-size: 10px; color: #FFFFFF; line-height: 1.3; margin-top: 6px; padding: 0 10px')}>{names.length ? carer + ' can see where you are' : 'Help has been asked for'}</span>
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
      <div style={s('display: flex; justify-content: space-between; align-items: center')}><span style={s('font-size: 15px; font-weight: 700')}>{time}</span><span style={s('display: flex; align-items: center; gap: 4px')}><WLogo t={t} /><button type="button" aria-label="Settings" onClick={() => setScreen('settings')} style={{ ...s('display: flex; width: 24px; height: 24px; align-items: center; justify-content: center; border: 0; background: transparent; padding: 0; cursor: pointer; font-size: 15px'), color: t.teal }}>⚙</button></span></div>
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
          <span style={s('font-weight: 600; text-align: right')}>{!st.ready ? 'Starting…' : st.carer ? `Caregiver watch of ${st.carer.name}` : st.setup && st.setup.role === 'carer' ? 'Caregiver watch, not linked yet' : p ? `${p.name}'s watch · ${Object.keys(p.carerNames || {}).length} caregiver(s)` : !(st.setup && st.setup.done) ? 'Setting up the watch' : 'Loading'}</span>
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

        <button type="button" role="switch" aria-checked={!!st.optical} onClick={() => setOption({ optical: !st.optical })} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; text-align: left; cursor: pointer')}><span>Blood sugar from the optical sensor engine (experimental) · <a href="./lab.html" onClick={(e) => e.stopPropagation()}>Sensor Lab</a></span><Toggle on={!!st.optical} /></button>

        <button type="button" role="switch" aria-checked={!!st.auto} onClick={() => setOption({ auto: !st.auto })} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; text-align: left; cursor: pointer')}><span>Send normal readings every minute (while this page is open)</span><Toggle on={!!st.auto} /></button>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <span style={s(label)}>Send a reading now</span>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            <button type="button" disabled={!p} onClick={() => run('normal', sendNormal)} style={s(btn + '; border-color: #0B7A75; color: #0B7A75')}>{busy === 'normal' ? 'Sent ✓' : 'All normal'}</button>
            {Object.entries(SCENARIOS).map(([id, sc]) => <button key={id} type="button" disabled={!p} onClick={() => run(id, () => runScenario(id))} style={s(btn + '; border-color: #F2B8BE; color: #A81C2B')}>{busy === id ? 'Sent ✓' : sc.label}</button>)}
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <span style={s(label)}>Early warning (AI)</span>
          <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>The watch learns this person's normal from two weeks of readings and warns caregivers about trends before readings go out of range. Try a story: it replaces the last two weeks with simulated readings.</span>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            {[['sugar', 'Sugar creeping up'], ['bp', 'Blood pressure creeping up'], [null, 'Normal fortnight']].map(([k, l]) => <button key={l} type="button" disabled={!p || !!busy} onClick={() => run('ai' + k, () => demoStory(k))} style={s(btn + (k ? '; border-color: #F2B33D; color: #8A5300' : ''))}>{busy === 'ai' + k ? 'Writing history…' : l}</button>)}
          </div>
          {p && p.insights && <div style={s('display: flex; flex-direction: column; gap: 6px')}>
            {p.insights.items.map((i) => <div key={i.id} style={s('padding: 8px 10px; border-radius: 12px; font-size: 13px; line-height: 1.45; ' + ({ warn: 'background: #FDECEE; color: #A81C2B', watch: 'background: #FFF1DB; color: #8A5300', info: 'background: #F5F7F8; color: #5B6672', good: 'background: #E3F5F3; color: #075955' }[i.level]))}><b>{i.title}</b><br />{i.text}</div>)}
          </div>}
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
          <button type="button" onClick={resetWatch} style={s(btn)}>Start setup again</button>
        </div>
        <a href="./" style={s('font-size: 14px; font-weight: 600; color: #0B7A75')}>Open the myDoc phone app</a>
      </section>
    </div>
  );
}

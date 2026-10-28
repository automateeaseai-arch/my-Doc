import { useEffect, useRef, useState } from 'react';
import { s, A, Logo, Back, Toggle, Seg, I, btn, section, go, toast } from '../ui.jsx';
import { update } from '../store.js';
import { useLive, updatePerson, stopMonitoring, linkCarerWatch, readCode, requestLink, saveProfile } from '../live.js';
import * as be from '../backend/index.js';
import { CONDITIONS, initials } from '../health.js';

export function Splash() {
  return <main style={s('min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FFFFFF')}><Logo size="lg" center /></main>;
}

export function Welcome() {
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 56px 24px 36px; position: relative; overflow: hidden')}>
      <div style={s('position: absolute; width: 460px; height: 460px; border-radius: 230px; background: #E3F5F3; top: 120px; left: 50%; margin-left: -230px')} />
      <div style={s('position: relative')}><Logo size="lg" center /></div>
      <div style={s('flex-grow: 1; position: relative; min-height: 340px')}>
        <div style={s('position: absolute; left: 50%; margin-left: -161px; top: 72px; width: 168px; height: 236px; border-radius: 28px; background: #FFFFFF; box-shadow: 0 16px 40px rgba(20,32,43,0.14); padding: 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px')}>
          <div style={s('font-size: 11px; font-weight: 600; color: #5B6672')}>Mama Nkechi</div>
          <div style={s('display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 14px; background: #FDECEE')}><span style={s('font-size: 10px; font-weight: 600; color: #A81C2B')}>BLOOD SUGAR</span><span style={s('font-size: 22px; font-weight: 800; color: #A81C2B')}>180</span></div>
          <div style={s('display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 14px; background: #F5F7F8')}><span style={s('font-size: 10px; font-weight: 600; color: #5B6672')}>BLOOD PRESSURE</span><span style={s('font-size: 22px; font-weight: 800')}>128/82</span></div>
          <div style={s('height: 30px; border-radius: 10px; background: #0B7A75; color: #FFFFFF; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center')}>Call</div>
        </div>
        <div style={s('position: absolute; left: 50%; margin-left: 15px; top: 130px; width: 150px; display: flex; flex-direction: column; align-items: center')}>
          <div style={s('width: 70px; height: 40px; background: #2E3A45; border-radius: 10px 10px 0 0')} />
          <div style={s('width: 150px; height: 150px; border-radius: 44px; background: #14202B; padding: 10px; box-sizing: border-box; box-shadow: 0 16px 40px rgba(20,32,43,0.25)')}>
            <div style={s('width: 100%; height: 100%; border-radius: 36px; background: #000000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #D62839')}>
              <span className="md-beat"><I.heart size={26} /></span>
              <span style={s('font-size: 28px; font-weight: 800; color: #FFFFFF; line-height: 1')}>84</span>
              <span style={s('font-size: 10px; color: #A9B4BE')}>beats/min</span>
            </div>
          </div>
          <div style={s('width: 70px; height: 40px; background: #2E3A45; border-radius: 0 0 10px 10px')} />
        </div>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 10px; position: relative; text-align: center; padding-bottom: 28px')}>
        <h1 style={s('margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700')}>Care for them,<br />even from afar</h1>
        <p style={s('margin: 0; font-size: 15px; line-height: 1.6; color: #5B6672')}>See their vitals from their smartwatch, get alerts when something is wrong, and send help in seconds.</p>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 8px; position: relative')}>
        <A to="/signup" style={btn.primary}>Get started</A>
        <A to="/signin" style="display: flex; height: 48px; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; color: #0B7A75; text-decoration: none">I already have an account</A>
      </div>
    </main>
  );
}

const field = 'height: 52px; border: 1.5px solid #E4E8EC; border-radius: 14px; padding: 0 16px; font-size: 16px; font-family: inherit; color: #14202B; background: #FFFFFF; width: 100%; box-sizing: border-box';
const outlineBig = 'display: flex; height: 52px; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #D5DBE0; border-radius: 16px; font-size: 15px; font-weight: 600; color: #14202B; background: #FFFFFF; font-family: inherit; cursor: pointer';

function AuthFrame({ title, sub, children, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 32px; gap: 16px; position: relative; overflow: hidden')}>
      <div style={s('position: absolute; width: 360px; height: 360px; border-radius: 180px; background: #E3F5F3; top: -200px; right: -140px')} />
      <div style={s('display: flex; align-items: center; height: 44px; position: relative')}><Back to="/welcome" /></div>
      <div style={s('position: relative; padding-top: 12px')}><Logo size="md" /></div>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700')}>{title}</h1>
        <p style={s('margin: 0; font-size: 15px; color: #5B6672')}>{sub}</p>
      </div>
      {children}
    </form>
  );
}

function Password({ id, value, onChange, auto }) {
  const [show, setShow] = useState(false);
  return (
    <div style={s('display: flex; align-items: center; height: 52px; border: 1.5px solid #E4E8EC; border-radius: 14px; padding: 0 4px 0 16px; box-sizing: border-box')}>
      <input id={id} autoComplete={auto} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} style={s('flex-grow: 1; min-width: 0; border: 0; outline: none; font-size: 16px; font-family: inherit; color: #14202B; background: transparent')} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} style={s('width: 44px; height: 44px; border: 0; background: transparent; color: #5B6672; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.eye /></button>
    </div>
  );
}

const Err = ({ msg }) => (msg ? <div role="alert" style={s('font-size: 13px; font-weight: 600; color: #A81C2B; margin-top: -4px')}>{msg}</div> : null);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!emailOk(email)) return setErr('Enter the email you signed up with.');
    if (!pw) return setErr('Enter your password.');
    setBusy(true); setErr('');
    try { await be.signIn({ email, password: pw }); go('/home'); } catch (x) { setErr(be.authMessage(x)); } finally { setBusy(false); }
  };
  const forgot = async () => {
    if (!emailOk(email)) return setErr('Type your email above first, then tap "Forgot password?".');
    try { await be.resetPassword(email); toast('We emailed you a link to reset your password.'); } catch (x) { setErr(be.authMessage(x)); }
  };
  const google = async () => { setErr(''); try { await be.signInGoogle(); go('/home'); } catch (x) { setErr(be.authMessage(x)); } };
  return (
    <AuthFrame title="Welcome back" sub="Sign in to see the people you care for." onSubmit={submit}>
      <div style={s('display: flex; flex-direction: column; gap: 6px; margin-top: 8px')}>
        <label htmlFor="si-id" style={s('font-size: 13px; font-weight: 600')}>Email</label>
        <input id="si-id" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} style={s(field)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <label htmlFor="si-pw" style={s('font-size: 13px; font-weight: 600')}>Password</label>
        <Password id="si-pw" value={pw} onChange={setPw} auto="current-password" />
        <button type="button" onClick={forgot} style={s('align-self: flex-end; font-size: 13px; font-weight: 600; padding: 8px 0; border: 0; background: transparent; color: #0B7A75; font-family: inherit; cursor: pointer')}>Forgot password?</button>
      </div>
      <Err msg={err} />
      <button type="submit" disabled={busy} style={s(btn.primary + (busy ? '; opacity: 0.7' : ''))}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {be.online && <>
        <div style={s('display: flex; align-items: center; gap: 12px; font-size: 13px; color: #5B6672')}><span style={s('flex-grow: 1; height: 1px; background: #E4E8EC')} />or<span style={s('flex-grow: 1; height: 1px; background: #E4E8EC')} /></div>
        <button type="button" onClick={google} style={s(outlineBig)}>Continue with Google</button>
      </>}
      <div style={s('flex-grow: 1')} />
      <div style={s('font-size: 14px; color: #5B6672; text-align: center')}>New to myDoc? <A to="/signup" style="font-weight: 600; color: #0B7A75">Create an account</A></div>
    </AuthFrame>
  );
}

export function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Type your name, so the people you care for know who is looking after them.');
    if (!emailOk(email)) return setErr('Check the email address.');
    if (pw.length < 6) return setErr('Use at least 6 characters for the password.');
    setBusy(true); setErr('');
    try { await be.signUp({ name, email, password: pw }); go('/about?first=1'); } catch (x) { setErr(be.authMessage(x)); } finally { setBusy(false); }
  };
  const google = async () => { setErr(''); try { await be.signInGoogle(); go('/about?first=1'); } catch (x) { setErr(be.authMessage(x)); } };
  return (
    <AuthFrame title="Create your account" sub="It takes a minute. Then add the first person you care for." onSubmit={submit}>
      <div style={s('display: flex; flex-direction: column; gap: 6px; margin-top: 8px')}>
        <label htmlFor="su-name" style={s('font-size: 13px; font-weight: 600')}>Your name</label>
        <input id="su-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chinedu" style={s(field)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <label htmlFor="su-email" style={s('font-size: 13px; font-weight: 600')}>Email</label>
        <input id="su-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} style={s(field)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <label htmlFor="su-pw" style={s('font-size: 13px; font-weight: 600')}>Password</label>
        <Password id="su-pw" value={pw} onChange={setPw} auto="new-password" />
        <span style={s('font-size: 12px; color: #5B6672')}>At least 6 characters</span>
      </div>
      <Err msg={err} />
      <button type="submit" disabled={busy} style={s(btn.primary + (busy ? '; opacity: 0.7' : ''))}>{busy ? 'Creating account…' : 'Create account'}</button>
      {be.online && <button type="button" onClick={google} style={s(outlineBig)}>Continue with Google</button>}
      {!be.online && <div style={s('font-size: 12px; line-height: 1.5; color: #8A5300; background: #FFF1DB; padding: 10px 12px; border-radius: 12px')}>Test mode: your account is kept on this phone only.</div>}
      <div style={s('flex-grow: 1')} />
      <div style={s('font-size: 14px; color: #5B6672; text-align: center')}>Already have an account? <A to="/signin" style="font-weight: 600; color: #0B7A75">Sign in</A></div>
    </AuthFrame>
  );
}

// The caregiver's own details, right after creating the account (also Profile → Edit).
export function About({ query }) {
  const live = useLive();
  const first = query.get('first');
  const pr = live.profile || {};
  const [name, setName] = useState(pr.name || (live.user && live.user.name) || '');
  const [phone, setPhone] = useState(pr.phone || '');
  const [city, setCity] = useState(pr.city || '');
  const [use, setUse] = useState(pr.use || 'others');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const small = 'height: 48px; border: 1.5px solid #E4E8EC; border-radius: 14px; padding: 0 14px; font-size: 16px; font-family: inherit; color: #14202B; background: #FFFFFF; width: 100%; box-sizing: border-box';
  const lab = 'font-size: 13px; font-weight: 600';
  const save = async () => {
    if (!name.trim()) return setErr('Type your name.');
    if (phone.replace(/\D/g, '').length < 7) return setErr('Type your phone number, so the people you care for and their contacts can reach you.');
    setBusy(true); setErr('');
    try {
      await saveProfile({ name: name.trim(), phone: phone.trim(), city: city.trim(), use, aboutDone: true });
      if (first) go('/add?first=1'); else { toast('Saved'); go('/profile'); }
    } catch { setErr('Could not save. Check your internet connection and try again.'); } finally { setBusy(false); }
  };
  const opt = (k, title, sub) => (
    <button type="button" aria-pressed={use === k} onClick={() => setUse(k)} style={s('display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 16px; text-align: left; font-family: inherit; cursor: pointer; ' + (use === k ? 'background: #E3F5F3; border: 1.5px solid #0B7A75; color: #14202B' : 'background: #FFFFFF; border: 1.5px solid #D5DBE0; color: #14202B'))}>
      <span style={s('font-size: 15px; font-weight: 700')}>{title}</span><span style={s('font-size: 12px; color: #5B6672')}>{sub}</span>
    </button>
  );
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 14px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        {first ? <span style={s('width: 44px')} /> : <Back to="/profile" />}
        <Logo />
        <div style={s('width: 44px; font-size: 12px; font-weight: 600; color: #5B6672; text-align: right')}>{first ? 'Step 1' : ''}</div>
      </div>
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>{first ? 'About you' : 'Your details'}</h1>
      <p style={s('margin: -6px 0 0; font-size: 14px; color: #5B6672; line-height: 1.5')}>The people you look after, and their emergency contacts, see these details.</p>
      <div style={s('display: flex; align-items: center; gap: 14px')}>
        <button type="button" aria-label="Add a photo" onClick={() => toast('Photos come in a later version')} style={s('width: 64px; height: 64px; flex-shrink: 0; border-radius: 32px; border: 0; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative')}><I.camera /><span style={s('position: absolute; right: -2px; bottom: -2px; width: 22px; height: 22px; border-radius: 11px; background: #0B7A75; color: #FFFFFF; border: 2px solid #FFFFFF; font-size: 16px; line-height: 20px; font-weight: 600')}>+</span></button>
        <div style={s('display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0')}>
          <label htmlFor="ab-name" style={s(lab)}>Your name</label>
          <input id="ab-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={s(small)} />
        </div>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <label htmlFor="ab-phone" style={s(lab)}>Phone number</label>
        <input id="ab-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0809 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} style={s(small)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <label htmlFor="ab-city" style={s(lab)}>City or town</label>
        <input id="ab-city" autoComplete="address-level2" placeholder="e.g. Lagos" value={city} onChange={(e) => setCity(e.target.value)} style={s(small)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <span style={s(section)}>How will you use myDoc?</span>
        {opt('others', 'Look after someone', 'A parent, grandparent, friend or patient')}
        {opt('self', 'Track my own health', 'My readings and medicine, on my own watch')}
        {opt('both', 'Both', 'Myself and people I look after')}
      </div>
      <Err msg={err} />
      <div style={s('flex-grow: 1')} />
      <button type="button" disabled={busy} onClick={save} style={s(btn.primary + (busy ? '; opacity: 0.7' : ''))}>{busy ? 'Saving…' : first ? 'Next' : 'Save'}</button>
    </main>
  );
}

// Set up (or edit) a person: name, conditions, emergency contacts.
export function Setup({ query }) {
  const live = useLive();
  const editId = query.get('edit');
  const first = query.get('first');
  const editing = live.people.find((p) => p.id === editId);
  const [who, setWho] = useState(editing ? (editing.self ? 'self' : 'other') : query.get('who') === 'self' ? 'self' : 'other');
  const [name, setName] = useState(editing ? editing.name : '');
  const [pronoun, setPronoun] = useState(editing ? editing.pronoun || '' : '');
  const [phone, setPhone] = useState(editing ? editing.phone || '' : '');
  const [on, setOn] = useState(() => Object.fromEntries((editing ? editing.conds : []).map((c) => [c, true])));
  const [contacts, setContacts] = useState(editing ? editing.contacts : []);
  const [auto, setAuto] = useState(editing ? editing.autoAlert !== false : true);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: '', rel: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const done = async () => {
    const nm = name.trim();
    if (!nm) return setErr(who === 'self' ? 'Please type your name.' : 'Please type their name.');
    const conds = CONDITIONS.filter((c) => on[c]);
    setBusy(true);
    try {
      await updatePerson(editing.id, { name: nm, ini: initials(nm), self: who === 'self', conds, contacts, autoAlert: auto, phone: phone.trim(), pronoun: who === 'self' ? '' : pronoun });
      toast('Saved'); go('/home');
    } catch { setErr('Could not save. Check your internet connection and try again.'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 4000); return; }
    await stopMonitoring(editing); update(() => ({ sel: 0 })); toast('You no longer monitor ' + editing.name); go('/home');
  };

  const addContact = (e) => {
    e.preventDefault();
    if (!nc.name.trim() || !nc.phone.trim()) return;
    setContacts([...contacts, { name: nc.name.trim(), ini: initials(nc.name), rel: nc.rel.trim() || 'Contact', phone: nc.phone.trim() }]);
    setNc({ name: '', rel: '', phone: '' });
    setAdding(false);
  };
  const small = 'height: 44px; border: 1.5px solid #E4E8EC; border-radius: 12px; padding: 0 14px; font-size: 15px; font-family: inherit; color: #14202B; background: #FFFFFF; min-width: 0; width: 100%; box-sizing: border-box';
  const outlineSm = 'height: 44px; border: 1.5px solid #0B7A75; border-radius: 12px; background: #FFFFFF; color: #0B7A75; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer';
  const chip = (onIt) => 'display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 20px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (onIt ? 'background: #0B7A75; color: #FFFFFF; border: 1.5px solid #0B7A75' : 'background: #FFFFFF; color: #14202B; border: 1.5px solid #D5DBE0');

  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 14px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        <Back to="/home" />
        <Logo />
        <div style={s('width: 44px; font-size: 12px; font-weight: 600; color: #5B6672; text-align: right')}>{editing ? '' : '1 of 2'}</div>
      </div>
      {!editing && <div style={s('height: 4px; border-radius: 2px; background: #E4E8EC')}><div style={s('width: 50%; height: 4px; border-radius: 2px; background: #0B7A75')} /></div>}
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>{editing ? 'Edit ' + editing.name : 'Who are you monitoring?'}</h1>
      <Seg options={[['self', 'Myself'], ['other', 'Someone else']]} value={who} onChange={setWho} bg="#F5F7F8" h={44} />
      <div style={s('display: flex; align-items: center; gap: 14px')}>
        <button type="button" aria-label="Add a photo" onClick={() => toast('Photos come in a later version')} style={s('width: 64px; height: 64px; flex-shrink: 0; border-radius: 32px; border: 0; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative')}><I.camera /><span style={s('position: absolute; right: -2px; bottom: -2px; width: 22px; height: 22px; border-radius: 11px; background: #0B7A75; color: #FFFFFF; border: 2px solid #FFFFFF; font-size: 16px; line-height: 20px; font-weight: 600')}>+</span></button>
        <div style={s('display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0')}>
          <label htmlFor="nm" style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>{who === 'self' ? 'Your name' : 'Their name'}</label>
          <input id="nm" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder={who === 'self' ? 'e.g. Yemi' : 'e.g. Mama Nkechi'} style={s(small)} />
        </div>
      </div>
      {who === 'other' && (
        <div style={s('display: flex; gap: 8px; align-items: center; flex-wrap: wrap')}>
          <span style={s('font-size: 13px; color: #5B6672')}>Call them</span>
          {[['she', 'she / her'], ['he', 'he / him'], ['', 'they / them']].map(([k, l]) => <button key={l} type="button" aria-pressed={pronoun === k} onClick={() => setPronoun(k)} style={s(chip(pronoun === k) + '; height: 36px; font-size: 13px')}>{l}</button>)}
        </div>
      )}
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <label htmlFor="ph" style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>{who === 'self' ? 'Your phone number' : 'Their phone number'} (optional)</label>
        <input id="ph" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0802 000 0000" style={s(small)} />
      </div>
      <Err msg={err} />
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <div style={s(section)}>Conditions</div>
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
          {CONDITIONS.map((c) => <button key={c} type="button" aria-pressed={!!on[c]} onClick={() => setOn({ ...on, [c]: !on[c] })} style={s(chip(on[c]))}>{on[c] && <I.tick />}{c}</button>)}
        </div>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: baseline; gap: 8px')}><span style={s(section)}>Emergency contact</span><span style={s('font-size: 12px; color: #5B6672; text-align: right')}>Called if a reading is dangerous</span></div>
        {contacts.map((k, i) => (
          <div key={i} style={s('display: flex; align-items: center; gap: 12px; padding: 10px 6px 10px 12px; border-radius: 16px; background: #F5F7F8')}>
            <span style={s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; ' + (i ? 'background: #FFF1DB; color: #8A5300' : 'background: #FDECEE; color: #A81C2B'))}>{k.ini}</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 15px; font-weight: 600')}>{k.name}</span><span style={s('font-size: 12px; color: #5B6672')}>{k.rel} · {k.phone}</span></span>
            <button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} aria-label={'Remove ' + k.name} style={s('width: 44px; height: 44px; border: 0; background: transparent; color: #5B6672; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.close size={18} /></button>
          </div>
        ))}
        {adding ? (
          <form onSubmit={addContact} style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 16px; background: #F5F7F8')}>
            <input aria-label="Contact name" placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} style={s(small)} autoFocus />
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
              <input aria-label="Relationship" placeholder="e.g. Son" value={nc.rel} onChange={(e) => setNc({ ...nc, rel: e.target.value })} style={s(small)} />
              <input aria-label="Phone number" placeholder="Phone" type="tel" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} style={s(small)} />
            </div>
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
              <button type="button" onClick={() => setAdding(false)} style={s(outlineSm)}>Cancel</button>
              <button type="submit" style={s('height: 44px; border: 0; border-radius: 12px; background: #0B7A75; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Add</button>
            </div>
          </form>
        ) : (
          <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
            <button type="button" onClick={() => setAdding(true)} style={s(outlineSm)}>+ Add contact</button>
            <button type="button" onClick={pickFromPhonebook(setContacts, contacts)} style={s(outlineSm)}>From phonebook</button>
          </div>
        )}
        <button type="button" role="switch" aria-checked={auto} onClick={() => setAuto(!auto)} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; text-align: left; cursor: pointer')}><span>Alert them automatically when a reading is high</span><Toggle on={auto} /></button>
      </div>
      <div style={s('flex-grow: 1')} />
      <button type="button" disabled={busy} onClick={done} style={s(btn.primary + (busy ? '; opacity: 0.7' : ''))}>{busy ? 'Saving…' : editing ? 'Save' : 'Next'}</button>
      {editing && <button type="button" onClick={del} style={s('height: 44px; border: 0; background: transparent; color: #A81C2B; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>{confirmDel ? 'Tap again to stop monitoring ' + editing.name : 'Stop monitoring ' + editing.name}</button>}
    </main>
  );
}

// Uses the phone's contact picker where the browser has one (Android Chrome).
const pickFromPhonebook = (set, list) => async () => {
  if (!('contacts' in navigator && 'select' in navigator.contacts)) { toast('This browser cannot open the phonebook. Use + Add contact.'); return; }
  try {
    const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!c) return;
    const name = (c.name && c.name[0]) || 'Contact';
    set([...list, { name, ini: initials(name), rel: 'Contact', phone: (c.tel && c.tel[0]) || '' }]);
  } catch { /* cancelled */ }
};

// One screen for codes: "Add a person" (a patient's watch code; they accept on their watch)
// and Profile › Pair a watch (your own caregiver watch).
export function Pair({ query, mode = 'watch' }) {
  const live = useLive();
  const first = query.get('first');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(null);
  const stopRef = useRef(null);
  useEffect(() => () => stopRef.current && stopRef.current(), []);
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '');
    if (d.length > 1) { const all = d.slice(0, 6).split(''); setCode([0, 1, 2, 3, 4, 5].map((k) => all[k] || '')); return; }
    const next = [...code]; next[i] = d; setCode(next); setErr('');
    if (d && i < 5) document.getElementById('dg' + (i + 1))?.focus();
  };
  const submit = async () => {
    const c6 = code.join('');
    if (c6.length < 6) return setErr('Type all 6 digits shown on the watch.');
    setBusy(true); setErr('');
    try {
      const c = await readCode(c6);
      if (c.role === 'carer') { await linkCarerWatch(c6, c); go('/paired?mine=1'); return; }
      if (live.people.find((p) => p.id === c.pid)) { setErr('You already look after ' + (c.name || 'this person') + '.'); return; }
      setWaiting(c.name || 'them');
      stopRef.current = await requestLink(c6, c, (r) => {
        if (r === 'accepted') go('/paired?who=' + c.pid);
        else { setWaiting(null); setErr((c.name || 'They') + ' said no on their watch.'); }
      });
    } catch (x) {
      setErr(x.code === 'no-code' ? 'No watch is showing that code. Check the digits on the watch.' : x.code === 'expired' ? 'That code has expired. Ask for a new one on the watch.' : 'Could not connect. Check your internet connection.');
    } finally { setBusy(false); }
  };
  const add = mode === 'add';
  if (waiting) return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 16px; text-align: center')}>
      <div style={s('width: 72px; height: 72px; border-radius: 36px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.watch /></div>
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Waiting for {waiting}</h1>
      <p style={s('margin: 0; font-size: 15px; line-height: 1.55; color: #5B6672')}>We asked {waiting} on their watch: "Allow {(live.profile && live.profile.name) || (live.user && live.user.name) || 'you'} to see your health?" This screen moves on when they tap Yes.</p>
      <span style={s('display: flex; gap: 6px')}><span className="md-dot" /><span className="md-dot" style={{ animationDelay: '0.2s' }} /><span className="md-dot" style={{ animationDelay: '0.4s' }} /></span>
      <button type="button" onClick={() => { stopRef.current && stopRef.current(); setWaiting(null); }} style={s('height: 44px; border: 0; background: transparent; color: #0B7A75; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer')}>Cancel</button>
    </main>
  );
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 14px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        {first ? <span style={s('width: 44px')} /> : <Back to={add ? '/home' : '/profile'} />}
        <Logo />
        <div style={s('width: 44px; font-size: 12px; font-weight: 600; color: #5B6672; text-align: right')}>{first ? 'Step 2' : ''}</div>
      </div>
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>{add ? 'Add a person' : 'Pair your watch'}</h1>
      <div style={s('display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 20px; background: #F5F7F8')}>
        <div style={s('flex-shrink: 0; display: flex; flex-direction: column; align-items: center')}>
          <div style={s('width: 34px; height: 12px; background: #2E3A45; border-radius: 5px 5px 0 0')} />
          <div style={s('width: 78px; height: 92px; border-radius: 22px; background: #14202B; padding: 5px; box-sizing: border-box')}><div style={s('width: 100%; height: 100%; border-radius: 18px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px')}><span style={s('font-size: 6px; font-weight: 700')}>{add ? 'PAIR WITH A CAREGIVER' : 'LINK TO YOUR PHONE'}</span><span style={s('font-size: 11px; font-weight: 800; letter-spacing: 1px')}>••• •••</span></div></div>
          <div style={s('width: 34px; height: 12px; background: #2E3A45; border-radius: 0 0 5px 5px')} />
        </div>
        <ol style={s('margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.55; color: #14202B')}>
          {add ? <>
            <li>On their watch: <b>Settings › Pair with a caregiver</b>.</li>
            <li>Type the 6-digit code it shows.</li>
            <li>They tap <b>Yes</b> on the watch.</li>
          </> : <>
            <li>Set up your watch as <b>I'm a caregiver</b>.</li>
            <li>On it: <b>Settings › Link to my phone</b>.</li>
            <li>Type the code it shows.</li>
          </>}
        </ol>
      </div>
      <a href="./watch.html" target="_blank" rel="noopener" style={s('display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 16px; background: #FFF1DB; color: #8A5300; text-decoration: none; font-size: 13px; line-height: 1.45')}>
        <I.watch /><span><b>No watch yet?</b> Open the watch simulator on another phone (or another tab).</span>
      </a>
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <span style={s(section)}>Code from the watch</span>
        <div style={s('display: flex; gap: 8px; justify-content: center')}>
          {code.map((v, i) => (
            <input key={i} id={'dg' + i} aria-label={'Digit ' + (i + 1)} value={v} inputMode="numeric" autoComplete="one-time-code"
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !v && i) document.getElementById('dg' + (i - 1))?.focus(); }}
              style={{ ...s('width: 44px; height: 54px; box-sizing: border-box; border: 1.5px solid #0B7A75; border-radius: 12px; text-align: center; font-size: 22px; font-weight: 800; font-family: inherit; color: #14202B; min-width: 0'), marginRight: i === 2 ? 8 : 0 }} />
          ))}
        </div>
        <Err msg={err} />
      </div>
      <div style={s('flex-grow: 1')} />
      <button type="button" disabled={busy} onClick={submit} style={s(btn.primary + (busy ? '; opacity: 0.7' : ''))}>{busy ? 'Checking…' : add ? 'Send request' : 'Pair watch'}</button>
      {first && <A to="/home" style="display: flex; height: 40px; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; text-decoration: none; color: #0B7A75">Skip for now</A>}
    </main>
  );
}

export function Paired({ query }) {
  const live = useLive();
  if (query.get('mine')) return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #F5F7F8; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 16px')}>
      <div style={s('height: 44px; padding-top: 8px; box-sizing: border-box')}><Logo center /></div>
      <div style={s('flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center')}>
        <div className="md-pop" style={s('width: 64px; height: 64px; border-radius: 32px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><I.tick size={32} color="#14202B" /></div>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700')}>Your watch is linked</h1>
        <p style={s('margin: 0; font-size: 15px; line-height: 1.55; color: #5B6672')}>It shows the {live.people.length === 1 ? 'person' : live.people.length + ' people'} you look after, their readings, medicine and alerts. People you add later appear on it too.</p>
      </div>
      <A to="/home" style={btn.primary}>Go to home</A>
    </main>
  );
  const p = live.people.find((x) => x.id === query.get('who')) || live.people[0];
  if (!p) return null;
  const rows = [
    ['Readings', 'Sugar, blood pressure, heart rate and oxygen'],
    ['Medicine reminders', `Doses ${p.she} mark${p.she === 'they' || p.she === 'I' ? '' : 's'} "Taken" on the watch show here`],
    ['Alerts', 'High readings and missed doses reach your phone'],
    ['SOS', `${p.self ? 'My' : 'The'} SOS button tells you and shares the location`]
  ];
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #F5F7F8; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 16px')}>
      <div style={s('height: 44px; padding-top: 8px; box-sizing: border-box')}><Logo center /></div>
      <div style={s('flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center')}>
        <div style={s('display: flex; align-items: center; gap: 14px')}>
          <div style={s('width: 56px; height: 96px; border-radius: 14px; border: 3px solid #14202B; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: #FFFFFF')}><span style={s('font-family: Kaushan Script, cursive; color: #D62839; font-size: 14px')}>my</span></div>
          <div className="md-pop" style={s('width: 52px; height: 52px; border-radius: 26px; background: #2BB5B0; display: flex; align-items: center; justify-content: center')}><I.tick size={28} color="#14202B" /></div>
          <div style={s('display: flex; flex-direction: column; align-items: center')}><div style={s('width: 26px; height: 10px; background: #2E3A45; border-radius: 4px 4px 0 0')} /><div style={s('width: 58px; height: 68px; border-radius: 18px; background: #14202B; display: flex; align-items: center; justify-content: center')}><span style={s('font-size: 9px; font-weight: 800; color: #FFFFFF')}>{p.ini}</span></div><div style={s('width: 26px; height: 10px; background: #2E3A45; border-radius: 0 0 4px 4px')} /></div>
        </div>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700')}>Linked</h1>
        <p style={s('margin: 0; font-size: 15px; line-height: 1.55; color: #5B6672')}>{p.name} accepted. You can now see {p.self ? 'your' : p.her} readings and medicine.</p>
        <div style={s('width: 100%; background: #FFFFFF; border-radius: 20px; padding: 6px 16px; box-sizing: border-box; display: flex; flex-direction: column; text-align: left')}>
          {rows.map((r, i) => (
            <div key={r[0]} style={s('display: flex; align-items: center; gap: 12px; padding: 10px 0; ' + (i < rows.length - 1 ? 'border-bottom: 1px solid #E4E8EC' : ''))}>
              <span style={s('width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.tick size={14} /></span>
              <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>{r[0]}</span><span style={s('font-size: 12px; color: #5B6672')}>{r[1]}</span></span>
            </div>
          ))}
        </div>
      </div>
      <A to={'/p/' + p.id + '/meds'} style={btn.outline}>Add {p.self ? 'my' : p.her} medicine</A>
      <A to="/home" style={btn.primary}>Go to home</A>
    </main>
  );
}

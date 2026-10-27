import { useState } from 'react';
import { s, A, Logo, Back, Toggle, Seg, I, btn, section, go, toast } from '../ui.jsx';
import { update, useStore } from '../store.js';
import { CONDITIONS, AVATARS, initials } from '../data.js';

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
        <A to="/setup?first=1" style={btn.primary}>Get started</A>
        <A to="/signin" style="display: flex; height: 48px; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; color: #0B7A75; text-decoration: none">I already have an account</A>
      </div>
    </main>
  );
}

export function SignIn() {
  const [show, setShow] = useState(false);
  const [id, setId] = useState('0809 000 0000');
  const [pw, setPw] = useState('mydoc2026');
  const [err, setErr] = useState('');
  const enter = () => { update(() => ({ signedIn: true })); go('/home'); };
  const submit = (e) => {
    e.preventDefault();
    if (!id.trim()) return setErr('Enter your phone number or email.');
    if (pw.length < 6) return setErr('Your password has at least 6 characters.');
    enter();
  };
  const field = 'height: 52px; border: 1.5px solid #E4E8EC; border-radius: 14px; padding: 0 16px; font-size: 16px; font-family: inherit; color: #14202B; background: #FFFFFF';
  return (
    <form onSubmit={submit} style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 32px; gap: 16px; position: relative; overflow: hidden')}>
      <div style={s('position: absolute; width: 360px; height: 360px; border-radius: 180px; background: #E3F5F3; top: -200px; right: -140px')} />
      <div style={s('display: flex; align-items: center; height: 44px; position: relative')}><Back to="/welcome" /></div>
      <div style={s('position: relative; padding-top: 12px')}><Logo size="md" /></div>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700')}>Welcome back</h1>
        <p style={s('margin: 0; font-size: 15px; color: #5B6672')}>Sign in to see the people you care for.</p>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px; margin-top: 8px')}>
        <label htmlFor="si-id" style={s('font-size: 13px; font-weight: 600')}>Phone number or email</label>
        <input id="si-id" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} style={s(field)} />
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <label htmlFor="si-pw" style={s('font-size: 13px; font-weight: 600')}>Password</label>
        <div style={s('display: flex; align-items: center; height: 52px; border: 1.5px solid #0B7A75; border-radius: 14px; padding: 0 4px 0 16px; box-sizing: border-box')}>
          <input id="si-pw" autoComplete="current-password" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} style={s('flex-grow: 1; min-width: 0; border: 0; outline: none; font-size: 16px; font-family: inherit; color: #14202B; background: transparent')} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} style={s('width: 44px; height: 44px; border: 0; background: transparent; color: #5B6672; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.eye /></button>
        </div>
        <button type="button" onClick={() => toast('We sent a reset link to ' + (id || 'your phone'))} style={s('align-self: flex-end; font-size: 13px; font-weight: 600; padding: 8px 0; border: 0; background: transparent; color: #0B7A75; font-family: inherit; cursor: pointer')}>Forgot password?</button>
      </div>
      {err && <div role="alert" style={s('font-size: 13px; font-weight: 600; color: #A81C2B; margin-top: -8px')}>{err}</div>}
      <button type="submit" style={s(btn.primary)}>Sign in</button>
      <div style={s('display: flex; align-items: center; gap: 12px; font-size: 13px; color: #5B6672')}><span style={s('flex-grow: 1; height: 1px; background: #E4E8EC')} />or<span style={s('flex-grow: 1; height: 1px; background: #E4E8EC')} /></div>
      <button type="button" onClick={enter} style={s('display: flex; height: 52px; align-items: center; justify-content: center; border: 1.5px solid #D5DBE0; border-radius: 16px; font-size: 15px; font-weight: 600; color: #14202B; background: #FFFFFF; font-family: inherit; cursor: pointer')}>Continue with Google</button>
      <button type="button" onClick={enter} style={s('display: flex; height: 52px; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #D5DBE0; border-radius: 16px; font-size: 15px; font-weight: 600; color: #14202B; background: #FFFFFF; font-family: inherit; cursor: pointer')}><I.lock />Sign in with fingerprint or face</button>
      <div style={s('flex-grow: 1')} />
      <div style={s('font-size: 14px; color: #5B6672; text-align: center')}>New to myDoc? <A to="/setup?first=1" style="font-weight: 600; color: #0B7A75">Create an account</A></div>
    </form>
  );
}

// Set up (or edit) a person: name, conditions, emergency contacts.
export function Setup({ query }) {
  const st = useStore();
  const editId = query.get('edit');
  const first = query.get('first');
  const editing = st.people.find((p) => p.id === editId);
  const [who, setWho] = useState(editing ? (editing.self ? 'self' : 'other') : 'other');
  const [name, setName] = useState(editing ? editing.name : first ? 'Mama Nkechi' : '');
  const [on, setOn] = useState(() => Object.fromEntries((editing ? editing.conds : first ? ['Hypertension', 'Diabetes'] : []).map((c) => [c, true])));
  const [contacts, setContacts] = useState(editing ? editing.contacts : first ? [{ name: 'Cathlyn', ini: 'C', rel: 'Granddaughter', phone: '0803 000 0000' }] : []);
  const [auto, setAuto] = useState(editing ? editing.autoAlert !== false : true);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: '', rel: '', phone: '' });
  const [err, setErr] = useState('');

  const done = () => {
    const nm = name.trim();
    if (!nm) return setErr('Please type their name.');
    const conds = CONDITIONS.filter((c) => on[c]);
    if (first) {
      update((x) => ({ signedIn: true, sel: 0, people: x.people.map((p, i) => (i === 0 ? { ...p, name: nm, ini: initials(nm), conds, contacts, autoAlert: auto } : p)) }));
      go('/pair?who=' + st.people[0].id);
      return;
    }
    if (editing) {
      update((x) => ({ people: x.people.map((p) => (p.id === editing.id ? { ...p, name: nm, ini: initials(nm), conds, contacts, autoAlert: auto, self: who === 'self' } : p)) }));
      toast('Saved');
      go('/home');
      return;
    }
    const id = 'p' + Date.now().toString(36);
    const [bg, fg] = AVATARS[st.people.length % AVATARS.length];
    const self = who === 'self';
    const person = { id, name: nm, ini: initials(nm), bg, fg, her: self ? 'my' : 'their', him: self ? 'me' : 'them', she: self ? 'I' : 'they', self, conds, contacts, autoAlert: auto,
      phone: '', watch: false, address: 'Unknown until a watch is paired', shortAddress: 'Unknown', week: 'No doses yet', note: 'Add medicine to start reminders', missed: false,
      vitals: {}, mini: [], doses: [], summary: 'No watch paired yet.' };
    update((x) => ({ people: [...x.people, person], sel: x.people.length }));
    go('/pair?who=' + id);
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

  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 14px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        <Back to={first ? '/welcome' : '/home'} />
        <Logo />
        <div style={s('width: 44px; font-size: 12px; font-weight: 600; color: #5B6672; text-align: right')}>{editing ? '' : '1 of 2'}</div>
      </div>
      {!editing && <div style={s('height: 4px; border-radius: 2px; background: #E4E8EC')}><div style={s('width: 50%; height: 4px; border-radius: 2px; background: #0B7A75')} /></div>}
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>{editing ? 'Edit ' + editing.name : 'Who are you monitoring?'}</h1>
      <Seg options={[['self', 'Myself'], ['other', 'Someone else']]} value={who} onChange={setWho} bg="#F5F7F8" h={44} />
      <div style={s('display: flex; align-items: center; gap: 14px')}>
        <button type="button" aria-label="Import picture" onClick={() => toast('Photos come in a later version')} style={s('width: 64px; height: 64px; flex-shrink: 0; border-radius: 32px; border: 0; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative')}><I.camera /><span style={s('position: absolute; right: -2px; bottom: -2px; width: 22px; height: 22px; border-radius: 11px; background: #0B7A75; color: #FFFFFF; border: 2px solid #FFFFFF; font-size: 16px; line-height: 20px; font-weight: 600')}>+</span></button>
        <div style={s('display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0')}>
          <label htmlFor="nm" style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>{who === 'self' ? 'Your name' : 'Their name'}</label>
          <input id="nm" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder={who === 'self' ? 'e.g. Yemi' : 'e.g. Mama Nkechi'} style={s(small)} />
        </div>
      </div>
      {err && <div role="alert" style={s('font-size: 13px; font-weight: 600; color: #A81C2B; margin-top: -6px')}>{err}</div>}
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <div style={s(section)}>Conditions</div>
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
          {CONDITIONS.map((c) => (
            <button key={c} type="button" aria-pressed={!!on[c]} onClick={() => setOn({ ...on, [c]: !on[c] })} style={s('display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 20px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (on[c] ? 'background: #0B7A75; color: #FFFFFF; border: 1.5px solid #0B7A75' : 'background: #FFFFFF; color: #14202B; border: 1.5px solid #D5DBE0'))}>{on[c] && <I.tick />}{c}</button>
          ))}
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
              <input aria-label="Phone number" placeholder="Phone" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} style={s(small)} />
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
      <button type="button" onClick={done} style={s(btn.primary)}>{editing ? 'Save' : 'Done'}</button>
    </main>
  );
}

// Uses the phone's contact picker where the browser has one (Android Chrome).
const pickFromPhonebook = (set, list) => async () => {
  if (!('contacts' in navigator && 'select' in navigator.contacts)) { toast('Your browser cannot open the phonebook. Use + Add contact.'); return; }
  try {
    const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!c) return;
    const name = (c.name && c.name[0]) || 'Contact';
    set([...list, { name, ini: initials(name), rel: 'Contact', phone: (c.tel && c.tel[0]) || '' }]);
  } catch { /* cancelled */ }
};

export function Pair({ query }) {
  const st = useStore();
  const preset = st.people.findIndex((p) => p.id === query.get('who'));
  const [who, setWho] = useState(preset >= 0 ? preset : 0);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '');
    if (d.length > 1) { // pasted the whole code
      const all = d.slice(0, 6).split('');
      setCode([0, 1, 2, 3, 4, 5].map((k) => all[k] || ''));
      return;
    }
    const next = [...code]; next[i] = d; setCode(next); setErr('');
    if (d && i < 5) document.getElementById('dg' + (i + 1))?.focus();
  };
  const pair = () => {
    if (code.join('').length < 6) return setErr('Type all 6 digits shown on the watch.');
    const p = st.people[who];
    update((x) => ({ people: x.people.map((q, i) => (i === who ? { ...q, watch: true, battery: q.battery || 100 } : q)) }));
    go('/paired?who=' + p.id);
  };
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; padding: 12px 24px 24px; gap: 14px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        <Back to={st.signedIn ? '/profile' : '/setup?first=1'} />
        <Logo />
        <div style={s('width: 44px; font-size: 12px; font-weight: 600; color: #5B6672; text-align: right')}>2 of 2</div>
      </div>
      <div style={s('height: 4px; border-radius: 2px; background: #0B7A75')} />
      <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Pair their watch</h1>
      <div style={s('display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 20px; background: #F5F7F8')}>
        <div style={s('flex-shrink: 0; display: flex; flex-direction: column; align-items: center')}>
          <div style={s('width: 34px; height: 12px; background: #2E3A45; border-radius: 5px 5px 0 0')} />
          <div style={s('width: 78px; height: 92px; border-radius: 22px; background: #14202B; padding: 5px; box-sizing: border-box')}><div style={s('width: 100%; height: 100%; border-radius: 18px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px')}><span style={s('font-size: 6px; font-weight: 700')}>LINK THIS WATCH</span><span style={s('font-size: 11px; font-weight: 800; letter-spacing: 1px')}>482 913</span></div></div>
          <div style={s('width: 34px; height: 12px; background: #2E3A45; border-radius: 0 0 5px 5px')} />
        </div>
        <ol style={s('margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.55; color: #14202B')}>
          <li>Open myDoc on their watch.</li>
          <li>Choose <b>I'm the patient</b> and finish their profile.</li>
          <li>Type the 6-digit code it shows below.</li>
        </ol>
      </div>
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
        <div style={s('font-size: 12px; color: #5B6672; text-align: center')}>{err ? <span role="alert" style={s('color: #A81C2B; font-weight: 600')}>{err}</span> : 'Sample code: 482 913'}</div>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <span style={s(section)}>Whose watch is it?</span>
        <div style={s('display: flex; gap: 8px; flex-wrap: wrap')}>
          {st.people.map((p, i) => (
            <button key={p.id} type="button" aria-pressed={who === i} onClick={() => setWho(i)} style={s('height: 40px; padding: 0 14px; border-radius: 20px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (who === i ? 'background: #0B7A75; color: #FFFFFF; border: 1.5px solid #0B7A75' : 'background: #FFFFFF; color: #14202B; border: 1.5px solid #D5DBE0'))}>{p.name}</button>
          ))}
        </div>
      </div>
      <div style={s('flex-grow: 1')} />
      <button type="button" onClick={pair} style={s(btn.primary)}>Pair watch</button>
      <A to="/home" style="display: flex; height: 40px; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; text-decoration: none; color: #0B7A75">Skip for now</A>
    </main>
  );
}

export function Paired({ query }) {
  const st = useStore();
  const p = st.people.find((x) => x.id === query.get('who')) || st.people[0];
  const rows = [
    ['Readings', 'Sugar, blood pressure, heart rate and oxygen'],
    ['Medicine reminders', `Doses ${p.she} marks "Taken" show here and on your watch`],
    ['Alerts', 'High readings and missed doses reach both your devices'],
    ['SOS', `${p.self ? 'My' : 'The'} SOS button calls 112 and tells you`]
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
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700')}>Watch linked</h1>
        <p style={s('margin: 0; font-size: 15px; line-height: 1.55; color: #5B6672')}>{p.self ? 'Your' : p.name + "'s"} watch is now connected to your phone and your watch.</p>
        <div style={s('width: 100%; background: #FFFFFF; border-radius: 20px; padding: 6px 16px; box-sizing: border-box; display: flex; flex-direction: column; text-align: left')}>
          {rows.map((r, i) => (
            <div key={r[0]} style={s('display: flex; align-items: center; gap: 12px; padding: 10px 0; ' + (i < rows.length - 1 ? 'border-bottom: 1px solid #E4E8EC' : ''))}>
              <span style={s('width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.tick size={14} /></span>
              <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>{r[0]}</span><span style={s('font-size: 12px; color: #5B6672')}>{r[1]}</span></span>
            </div>
          ))}
        </div>
      </div>
      <A to="/pair" style={btn.outline}>Pair another watch</A>
      <A to="/home" style={btn.primary}>Go to home</A>
    </main>
  );
}

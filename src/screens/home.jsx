import { useEffect, useState } from 'react';
import { s, A, Logo, Avatar, Toggle, Seg, Nav, I, btn, section, go, toast } from '../ui.jsx';
import { update, useStore, dosesFor, greeting, longDate, todayKey, resetAll } from '../store.js';
import { METRICS, ALERTS, statusOf, sugarText, outOfRange, warningsOf } from '../data.js';

const pillStyle = (warn) => 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; ' + (warn ? 'background: #D62839; color: #FFFFFF' : 'background: #E3F5F3; color: #075955');

export const personHome = (p) => (p.self && !Object.keys(p.vitals).length ? '/serotonin' : '/p/' + p.id + '/vitals');

const miniOf = (p, unit) => {
  if (p.self && !p.mini.length) return [['SEROTONIN', 'Optimal'], ['SLEEP', '7h 10m'], ['STRESS', 'Low']];
  return p.mini.map((k) => {
    const m = METRICS[k], v = p.vitals[k];
    const shown = k === 'sugar' ? sugarText(v.now, unit) : k === 'o2' ? v.show + '%' : v.show;
    return [m.short, shown, statusOf(m, v.now) !== 'Normal'];
  });
};

export const nextDose = (st, p) => {
  const list = dosesFor(st, p), sched = list.filter((d) => d.st !== 'need');
  const due = list.find((d) => d.st === 'due');
  const taken = sched.filter((d) => d.st === 'taken').length;
  return { due, taken, total: sched.length };
};

export function Home() {
  const st = useStore();
  const n = st.people.length;
  const i = Math.min(st.sel, n - 1);
  const p = st.people[i];
  const unread = st.alertsRead ? 0 : ALERTS.filter((a) => a.unread).length;
  const warn = outOfRange(p).length;
  const nd = nextDose(st, p);
  const [swipe, setSwipe] = useState(null);
  const pick = (k) => update(() => ({ sel: (k + n) % n }));

  // The daily summary pops up once after 20:00.
  useEffect(() => {
    if (st.settings.summary && new Date().getHours() >= 20 && st.summarySeen !== todayKey()) go('/summary');
  }, []);

  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <A to="/alerts" aria-label={unread ? `Alerts, ${unread} new` : 'Alerts'} style="width: 44px; height: 44px; position: relative; display: flex; align-items: center; color: #0B7A75">
            <span className={unread ? 'md-shake' : ''} style={s('display: flex')}><I.bell /></span>
            {unread > 0 && <span className="md-wave" style={s('position: absolute; top: 7px; left: 14px; width: 12px; height: 12px; border-radius: 6px; background: #D62839; border: 2px solid #F5F7F8; box-sizing: border-box')} />}
          </A>
          <Logo />
          <A to={'/setup?edit=' + p.id} aria-label={'Edit ' + p.name} style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: flex-end; color: #0B7A75"><I.edit /></A>
        </div>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <div style={s('font-size: 14px; color: #5B6672')}>{greeting()}, Chinedu</div>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>People you care for</h1>
        </div>
        <div style={s('display: flex; align-items: center; gap: 4px; margin: 0 -16px')}
          onTouchStart={(e) => setSwipe(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (swipe == null) return; const dx = e.changedTouches[0].clientX - swipe; if (Math.abs(dx) > 50) pick(i + (dx < 0 ? 1 : -1)); setSwipe(null); }}>
          <button type="button" onClick={() => pick(i - 1)} aria-label="Previous person" style={s('width: 44px; height: 44px; flex-shrink: 0; border: 0; background: transparent; color: #0B7A75; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.chevL /></button>
          <A key={p.id} to={personHome(p)} className="md-slide" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; color: #14202B; padding: 20px 16px 16px; background: #FFFFFF; border-radius: 28px; box-shadow: 0 10px 30px rgba(20,32,43,0.08)">
            <Avatar p={p} size={112} radius={36} font={38} />
            <div style={s('font-size: 20px; font-weight: 700; line-height: 1.2; text-align: center')}>{p.name}</div>
            <div style={s('font-size: 13px; color: #5B6672; text-align: center')}>{p.conds.join(' · ') || 'No conditions added'}</div>
            {p.watch || p.self
              ? <div className={warn ? 'md-wave' : ''} style={s(pillStyle(warn))}>{warn ? `${warn} reading${warn > 1 ? 's' : ''} need${warn > 1 ? '' : 's'} attention` : 'All readings normal'}</div>
              : <div style={s('padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #F5F7F8; color: #5B6672')}>No watch paired yet</div>}
            {miniOf(p, st.settings.unit).length > 0 && (
              <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; width: 100%; margin-top: 4px')}>
                {miniOf(p, st.settings.unit).map((m) => (
                  <div key={m[0]} style={s('display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 14px; ' + (m[2] ? 'background: #FDECEE; color: #A81C2B' : 'background: #F5F7F8; color: #14202B'))}><span style={s('font-size: 10px; font-weight: 600; letter-spacing: 0.3px')}>{m[0]}</span><span style={s('font-size: 17px; font-weight: 800')}>{m[1]}</span></div>
                ))}
              </div>
            )}
          </A>
          <button type="button" onClick={() => pick(i + 1)} aria-label="Next person" style={s('width: 44px; height: 44px; flex-shrink: 0; border: 0; background: transparent; color: #0B7A75; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.chevR /></button>
        </div>
        <div style={s('display: flex; justify-content: center; gap: 6px')}>
          {st.people.map((q, k) => <button key={q.id} type="button" aria-label={'Show ' + q.name} onClick={() => pick(k)} style={{ ...s('height: 8px; border-radius: 4px; border: 0; padding: 0; cursor: pointer; transition: width 0.25s'), width: k === i ? 22 : 8, background: k === i ? '#D62839' : '#F2B8BE' }} />)}
        </div>
        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Next dose</div>
          <A to={'/p/' + p.id + '/meds'} style="display: flex; gap: 12px; align-items: center; padding: 14px; background: #FFFFFF; border-radius: 18px; text-decoration: none; color: #14202B; box-shadow: 0 6px 20px rgba(20,32,43,0.06)">
            <span style={s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.pill /></span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}>
              <span style={s('font-size: 15px; font-weight: 600')}>{nd.due ? nd.due.name : nd.total ? 'All done for today' : 'No medicine added'}</span>
              <span style={s('font-size: 12px; color: #5B6672')}>{nd.due ? `${nd.due.time} · ${nd.due.label} · ${nd.taken} of ${nd.total} taken today` : nd.total ? `${nd.taken} of ${nd.total} taken today` : 'Tap to see medication'}</span>
            </span>
            <I.chev color="#0B7A75" />
          </A>
        </div>
        <A to="/setup" style={btn.dashed + '; background: transparent'}>+ Add a person</A>
      </main>
      <Nav tab="people" medsTo={'/p/' + p.id + '/meds'} />
    </div>
  );
}

export function Alerts() {
  const st = useStore();
  const [who, setWho] = useState('all');
  const list = ALERTS.filter((a) => who === 'all' || a.p === who);
  const unread = st.alertsRead ? 0 : ALERTS.filter((a) => a.unread).length;
  const K = { danger: ['#D62839', '#FFFFFF'], warn: ['#FFF1DB', '#8A5300'] };
  const tabs = [['all', 'All'], ...st.people.map((p) => [p.id, p.self ? 'Me' : p.name])];
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; position: relative')}>
      <A to="/home" aria-label="Close alerts" className="md-fade" style="position: fixed; inset: 0; background: rgba(20,32,43,0.55)" />
      <div role="dialog" aria-labelledby="al-title" className="md-drop" style={s('position: relative; background: #FFFFFF; border-radius: 0 0 28px 28px; padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 10px 40px rgba(20,32,43,0.25)')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <div style={s('display: flex; align-items: center; gap: 10px')}>
            <span className={unread ? 'md-wave' : ''} style={s('width: 36px; height: 36px; border-radius: 12px; background: #FDECEE; color: #D62839; display: flex; align-items: center; justify-content: center')}><I.bellFill /></span>
            <h1 id="al-title" style={s('margin: 0; font-size: 22px; font-weight: 700')}>Alerts</h1>
            <span style={s('padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; ' + (unread ? 'background: #D62839; color: #FFFFFF' : 'background: #E3F5F3; color: #075955'))}>{unread ? unread + ' new' : 'All read'}</span>
          </div>
          <A to="/home" aria-label="Close" style="display: flex; width: 44px; height: 44px; align-items: center; justify-content: flex-end"><span style={s('width: 32px; height: 32px; border-radius: 16px; background: #D62839; color: #FFFFFF; display: flex; align-items: center; justify-content: center')}><I.close /></span></A>
        </div>
        <div style={s('display: flex; gap: 8px; overflow-x: auto; margin: 0 -20px; padding: 0 20px; scrollbar-width: none')}>
          {tabs.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)} style={s('flex-shrink: 0; height: 36px; padding: 0 14px; border-radius: 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (who === k ? 'background: #0B7A75; color: #FFFFFF; border: 1.5px solid #0B7A75' : 'background: #FFFFFF; color: #14202B; border: 1.5px solid #D5DBE0'))}>{label}</button>
          ))}
        </div>
        <div style={s('display: flex; flex-direction: column')}>
          {list.map((a, i) => {
            const u = a.unread && !st.alertsRead, k = K[a.kind];
            return (
              <A key={a.id} to={a.to} style={'display: flex; align-items: center; gap: 12px; padding: 12px 8px; margin: 0 -8px; border-radius: 14px; text-decoration: none; color: #14202B; ' + (u ? 'background: #FDF6F6' : '') + (i < list.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
                <span className={u ? 'md-wave' : ''} style={{ ...s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center'), background: k[0], color: k[1] }}>!</span>
                <span style={s('display: flex; flex-direction: column; flex-grow: 1; gap: 1px')}><span style={s('font-size: 14px; font-weight: 600')}>{a.title}</span><span style={s('font-size: 12px; color: #5B6672')}>{a.sub}</span></span>
                <span style={s('display: flex; flex-direction: column; align-items: flex-end; gap: 6px')}><span style={s('font-size: 11px; color: #5B6672; white-space: nowrap')}>{a.time}</span><span style={{ ...s('width: 10px; height: 10px; border-radius: 5px'), background: u ? '#D62839' : 'transparent' }} /></span>
              </A>
            );
          })}
          {list.length === 0 && <div style={s('padding: 32px 0; text-align: center; font-size: 14px; color: #5B6672')}>No alerts for this person.</div>}
        </div>
        <div style={s('display: flex; gap: 10px')}>
          <button type="button" onClick={() => update(() => ({ alertsRead: true }))} style={s('flex-grow: 1; height: 48px; border: 1.5px solid #0B7A75; border-radius: 14px; background: #FFFFFF; color: #0B7A75; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Mark all as read</button>
          <A to="/profile" style="display: flex; flex-grow: 1; height: 48px; align-items: center; justify-content: center; border-radius: 14px; background: #F5F7F8; color: #14202B; font-size: 14px; font-weight: 600; text-decoration: none">Alert settings</A>
        </div>
      </div>
    </div>
  );
}

export function Summary() {
  const st = useStore();
  const [shared, setShared] = useState(false);
  useEffect(() => { update(() => ({ summarySeen: todayKey() })); }, []);
  const per = st.people.map((p) => ({ p, ...nextDose(st, p), w: warningsOf(p) }));
  const taken = per.reduce((a, x) => a + x.taken, 0), total = per.reduce((a, x) => a + x.total, 0);
  const warnings = per.reduce((a, x) => a + x.w, 0);
  const first = st.people.flatMap((p) => p.doses.filter((d) => d[0] !== '—').map((d) => ({ p, t: d[0], name: d[1] }))).sort((a, b) => a.t.localeCompare(b.t))[0];
  const share = async () => {
    const text = `myDoc daily summary, ${longDate()}: ${taken} of ${total} doses taken, ${warnings} warning${warnings === 1 ? '' : 's'}.`;
    try { if (navigator.share) await navigator.share({ title: 'myDoc daily summary', text }); else await navigator.clipboard.writeText(text); setShared(true); } catch { /* cancelled */ }
  };
  const badge = (p, w) => (w === 0 ? ['All normal', 'background: #E3F5F3; color: #075955', ''] : p.self ? [w + ' warning' + (w > 1 ? 's' : ''), 'background: #FFF1DB; color: #8A5300', ''] : [w + ' warning' + (w > 1 ? 's' : ''), 'background: #D62839; color: #FFFFFF', 'md-wave']);
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; position: relative; padding: 56px 16px 24px; box-sizing: border-box')}>
      <A to="/home" aria-label="Close summary" className="md-fade" style="position: fixed; inset: 0; background: rgba(20,32,43,0.6)" />
      <div role="dialog" aria-labelledby="sum-title" className="md-pop-in" style={s('position: relative; max-width: 420px; margin: 0 auto; background: #FFFFFF; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 50px rgba(20,32,43,0.35); display: flex; flex-direction: column')}>
        <div style={s('background: #0B7A75; color: #FFFFFF; padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 14px')}>
          <div style={s('display: flex; align-items: flex-start; justify-content: space-between')}>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 0.8px')}>DAILY SUMMARY · 20:00</span>
              <h1 id="sum-title" style={s('margin: 0; font-size: 22px; font-weight: 700')}>{longDate()}</h1>
            </div>
            <A to="/home" aria-label="Close" style="display: flex; width: 44px; height: 44px; align-items: flex-start; justify-content: flex-end; color: #FFFFFF"><span style={s('width: 32px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center')}><I.close /></span></A>
          </div>
          <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px')}>
            <div style={s('background: rgba(255,255,255,0.14); border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{st.people.length}</span><span style={s('font-size: 11px')}>people</span></div>
            <div style={s('background: rgba(255,255,255,0.14); border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{taken} / {total}</span><span style={s('font-size: 11px')}>doses taken</span></div>
            <div style={s('background: #FFFFFF; color: #A81C2B; border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{warnings}</span><span style={s('font-size: 11px; font-weight: 600')}>warnings</span></div>
          </div>
        </div>
        <div style={s('padding: 8px 20px 4px; display: flex; flex-direction: column')}>
          {per.map(({ p, due, taken: t, total: n, w }, i) => {
            const b = badge(p, w);
            return (
              <A key={p.id} to={personHome(p)} style={'display: flex; gap: 12px; padding: 14px 0; text-decoration: none; color: #14202B' + (i < per.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
                <Avatar p={p} size={44} radius={15} font={15} />
                <span style={s('display: flex; flex-direction: column; gap: 4px; flex-grow: 1')}>
                  <span style={s('display: flex; align-items: center; justify-content: space-between; gap: 8px')}><span style={s('font-size: 15px; font-weight: 700')}>{p.name}</span><span className={b[2]} style={s('padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; ' + b[1])}>{b[0]}</span></span>
                  <span style={s('font-size: 13px; line-height: 1.45; color: #5B6672')}>{p.summary} {n ? `${t} of ${n} doses taken${due ? `; ${due.name} due at ${due.time}.` : '.'}` : ''}</span>
                </span>
              </A>
            );
          })}
        </div>
        {first && (
          <div style={s('margin: 4px 20px 0; padding: 12px 14px; background: #F5F7F8; border-radius: 16px; display: flex; align-items: center; gap: 10px')}>
            <span style={s('width: 32px; height: 32px; flex-shrink: 0; border-radius: 16px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.clock size={18} /></span>
            <span style={s('font-size: 13px; line-height: 1.45')}><b>First dose tomorrow:</b> {first.p.name}, {first.name} at {first.t}</span>
          </div>
        )}
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 16px 20px 20px')}>
          <button type="button" onClick={share} style={s('height: 52px; border: 1.5px solid #0B7A75; border-radius: 16px; background: #FFFFFF; color: #0B7A75; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer')}>{shared ? 'Shared ✓' : 'Share with family'}</button>
          <A to="/home" style="display: flex; height: 52px; align-items: center; justify-content: center; background: #0B7A75; color: #FFFFFF; border-radius: 16px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(11,122,117,0.28)">Got it</A>
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  const st = useStore();
  const set = st.settings;
  const setSetting = (k, v) => update((x) => ({ settings: { ...x.settings, [k]: v } }));
  const al = [
    ['range', 'Readings out of range', 'High or low sugar, blood pressure, heart rate'],
    ['doses', 'Missed doses', '30 minutes after a dose is due'],
    ['summary', 'Daily summary', 'Every evening at 20:00'],
    ['quiet', 'Quiet hours', '22:00–06:00 · emergencies still ring']
  ];
  const row = 'display: flex; align-items: center; justify-content: space-between; min-height: 52px; font-size: 14px; font-weight: 600; color: #14202B; text-decoration: none; border: 0; background: transparent; font-family: inherit; padding: 0; cursor: pointer; width: 100%; text-align: left';
  const signOut = () => { update(() => ({ signedIn: false })); go('/welcome'); };
  const sel = st.people[Math.min(st.sel, st.people.length - 1)];
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Profile</h1>
          <Logo />
        </div>
        <div style={s('display: flex; align-items: center; gap: 14px; padding: 16px; background: #FFFFFF; border-radius: 24px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
          <span style={s('width: 64px; height: 64px; flex-shrink: 0; border-radius: 22px; background: #0B7A75; color: #FFFFFF; font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center')}>CN</span>
          <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 18px; font-weight: 700')}>Chinedu</span><span style={s('font-size: 13px; color: #5B6672')}>Caregiver · Lagos</span><span style={s('font-size: 13px; color: #5B6672')}>0809 000 0000</span></span>
          <button type="button" onClick={() => toast('Editing your own details comes in a later version')} style={s('height: 36px; padding: 0 14px; border: 1.5px solid #0B7A75; border-radius: 12px; background: #FFFFFF; color: #0B7A75; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer')}>Edit</button>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>People you care for</div>
          <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            {st.people.map((p, i) => (
              <A key={p.id} to={'/setup?edit=' + p.id} style={'display: flex; align-items: center; gap: 12px; padding: 12px 0; text-decoration: none; color: #14202B' + (i < st.people.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
                <Avatar p={p} size={44} radius={15} font={15} />
                <span style={s('display: flex; flex-direction: column; flex-grow: 1')}>
                  <span style={s('font-size: 15px; font-weight: 600')}>{p.name}</span>
                  <span style={s('font-size: 12px; color: #5B6672')}>{p.conds.join(' · ') || 'No conditions added'}</span>
                  <span style={s('display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5B6672')}><span style={{ ...s('width: 8px; height: 8px; border-radius: 4px'), background: p.watch ? '#0B7A75' : '#C5CDD4' }} />{p.watch ? `Watch connected · battery ${p.battery}%` : 'No watch paired yet'}</span>
                </span>
                <I.chev size={18} color="#5B6672" />
              </A>
            ))}
          </div>
          <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
            <A to="/setup" style="display: flex; height: 44px; align-items: center; justify-content: center; border: 1.5px dashed #0B7A75; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; color: #0B7A75; background: #FFFFFF">+ Add a person</A>
            <A to="/pair" style="display: flex; height: 44px; align-items: center; justify-content: center; border: 1.5px dashed #0B7A75; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; color: #0B7A75; background: #FFFFFF">Pair a watch</A>
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Alerts</div>
          <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            {al.map(([k, label, sub], i) => (
              <button key={k} type="button" role="switch" aria-checked={!!set[k]} onClick={() => setSetting(k, !set[k])} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding: 8px 0; border: 0; background: transparent; font-family: inherit; color: #14202B; text-align: left; cursor: pointer' + (i < al.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : ''))}>
                <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>{label}</span><span style={s('font-size: 12px; color: #5B6672')}>{sub}</span></span>
                <Toggle on={!!set[k]} />
              </button>
            ))}
          </div>
          <A to="/summary" style="align-self: flex-start; font-size: 13px; font-weight: 600; color: #0B7A75; padding: 4px 0">See today's summary</A>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Emergency</div>
          <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; border-bottom: 1px solid #E4E8EC')}><span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>Emergency number</span><span style={s('font-size: 12px; color: #5B6672')}>Called from the red button</span></span><span style={s('padding: 4px 12px; border-radius: 999px; background: #FDECEE; color: #A81C2B; font-size: 15px; font-weight: 700')}>112</span></div>
            <button type="button" role="switch" aria-checked={set.shareVitals} onClick={() => setSetting('shareVitals', !set.shareVitals)} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; border: 0; background: transparent; padding: 0; font-family: inherit; color: #14202B; text-align: left; cursor: pointer')}><span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>Share location and vitals</span><span style={s('font-size: 12px; color: #5B6672')}>Sent with every emergency call</span></span><Toggle on={set.shareVitals} /></button>
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Blood sugar units</div>
          <Seg options={[['mg', 'mg/dL'], ['mmol', 'mmol/L']]} value={set.unit} onChange={(v) => setSetting('unit', v)} />
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Watch theme</div>
          <Seg options={[['light', 'Light'], ['dark', 'Dark (saves battery)']]} value={set.theme} onChange={(v) => setSetting('theme', v)} />
        </div>

        <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
          <button type="button" onClick={() => toast('Help: call 0809 000 0000 or write to help@mydoc.app (sample)')} style={s(row + '; border-bottom: 1px solid #E4E8EC')}>Help and support<I.chev size={18} color="#5B6672" /></button>
          <button type="button" onClick={() => { if (confirm('Clear everything saved on this phone and start again with the sample data?')) { resetAll(); go('/welcome'); } }} style={s(row + '; border-bottom: 1px solid #E4E8EC')}>Privacy and data: reset this phone<I.chev size={18} color="#5B6672" /></button>
          <button type="button" onClick={signOut} style={s(row + '; color: #A81C2B')}>Sign out</button>
        </div>
        <div style={s('font-size: 12px; color: #5B6672; text-align: center')}>myDoc version 1.0 · sample data</div>
      </main>
      <Nav tab="profile" medsTo={'/p/' + sel.id + '/meds'} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { s, A, Logo, Avatar, Toggle, Seg, Nav, I, btn, section, go, toast, useTwoTap } from '../ui.jsx';
import { update, useStore, greeting, longDate } from '../store.js';
import { useLive, markAlertsRead, METRICS, statusOf } from '../live.js';
import * as be from '../backend/index.js';
import { sugarText, dayKey, ago } from '../health.js';

const pillStyle = (warn) => 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; ' + (warn ? 'background: #D62839; color: #FFFFFF' : 'background: #E3F5F3; color: #075955');

export const personHome = (p) => '/p/' + p.id + '/vitals';
export const outOfRange = (p) => Object.entries(p.vitals).filter(([k, v]) => statusOf(k, v.now) !== 'Normal').map(([k]) => k);

const miniOf = (p, unit) => p.mini.map((k) => {
  const v = p.vitals[k];
  const shown = k === 'sugar' ? sugarText(v.now, unit) : k === 'o2' ? v.show + '%' : v.show;
  return [METRICS[k].short, shown, statusOf(k, v.now) !== 'Normal'];
});

export const nextDose = (p) => {
  const sched = p.today.filter((d) => d.st !== 'need');
  return { due: p.today.find((d) => d.st === 'due') || p.today.find((d) => d.st === 'missed'), taken: sched.filter((d) => d.st === 'taken').length, total: sched.length };
};

function EmptyHome({ name }) {
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: center; height: 44px')}><Logo /></div>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <div style={s('font-size: 14px; color: #5B6672')}>{greeting()}{name ? ', ' + name.split(' ')[0] : ''}</div>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>People you care for</h1>
        </div>
        <div style={s('background: #FFFFFF; border-radius: 28px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; box-shadow: 0 10px 30px rgba(20,32,43,0.08)')}>
          <span style={s('width: 72px; height: 72px; border-radius: 24px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.peopleFill /></span>
          <div style={s('font-size: 18px; font-weight: 700')}>Add the first person</div>
          <div style={s('font-size: 14px; line-height: 1.55; color: #5B6672')}>Add someone you look after (or yourself), then link their watch to see their readings here.</div>
          <A to="/setup" style={btn.primary + '; width: 100%'}>+ Add a person</A>
        </div>
      </main>
      <Nav tab="people" medsTo="/home" />
    </div>
  );
}

export function Home() {
  const live = useLive();
  const st = useStore();
  const n = live.people.length;
  const [swipe, setSwipe] = useState(null);
  useEffect(() => {
    if (n && st.settings.summary && new Date().getHours() >= 20 && st.summarySeen !== dayKey()) go('/summary');
  }, [n > 0]);
  if (!n) return <EmptyHome name={live.user && live.user.name} />;
  const i = Math.min(st.sel, n - 1);
  const p = live.people[i];
  const unread = live.people.reduce((a, q) => a + q.unread, 0);
  const warn = outOfRange(p).length;
  const nd = nextDose(p);
  const pick = (k) => update(() => ({ sel: (k + n) % n }));
  const mini = miniOf(p, st.settings.unit);
  const sos = live.people.find((q) => q.sosActive);

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
        {sos && (
          <A to={'/p/' + sos.id + '/locate'} className="md-wave" style="display: flex; gap: 12px; align-items: center; padding: 14px 16px; background: #D62839; color: #FFFFFF; border-radius: 18px; text-decoration: none">
            <span style={s('width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800')}>SOS</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 15px; font-weight: 700')}>{sos.name} pressed SOS</span><span style={s('font-size: 12px')}>{sos.shortAddress} · {ago(sos.sos && sos.sos.at)}. Tap to see where.</span></span>
            <I.chev />
          </A>
        )}
        {live.profile && !live.profile.aboutDone && (
          <A to="/about" style="display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 16px; background: #FFF1DB; color: #8A5300; text-decoration: none; font-size: 13px; font-weight: 600">Add your phone number and details<span style={s('flex-grow: 1')} /><I.chev color="#8A5300" /></A>
        )}
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <div style={s('font-size: 14px; color: #5B6672')}>{greeting()}{live.user && live.user.name ? ', ' + live.user.name.split(' ')[0] : ''}</div>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>People you care for</h1>
        </div>
        <div style={s('display: flex; align-items: center; gap: 4px; margin: 0 -16px')}
          onTouchStart={(e) => setSwipe(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (swipe == null) return; const dx = e.changedTouches[0].clientX - swipe; if (Math.abs(dx) > 50 && n > 1) pick(i + (dx < 0 ? 1 : -1)); setSwipe(null); }}>
          <button type="button" disabled={n < 2} onClick={() => pick(i - 1)} aria-label="Previous person" style={s('width: 44px; height: 44px; flex-shrink: 0; border: 0; background: transparent; color: #0B7A75; cursor: pointer; display: flex; align-items: center; justify-content: center' + (n < 2 ? '; visibility: hidden' : ''))}><I.chevL /></button>
          <A key={p.id} to={personHome(p)} className="md-slide" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; color: #14202B; padding: 20px 16px 16px; background: #FFFFFF; border-radius: 28px; box-shadow: 0 10px 30px rgba(20,32,43,0.08)">
            <Avatar p={p} size={112} radius={36} font={38} />
            <div style={s('font-size: 20px; font-weight: 700; line-height: 1.2; text-align: center')}>{p.name}</div>
            <div style={s('font-size: 13px; color: #5B6672; text-align: center')}>{p.conds.join(' · ') || 'No conditions added'}</div>
            {!p.watch ? <div style={s('padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #F5F7F8; color: #5B6672')}>No watch paired yet</div>
              : !mini.length ? <div style={s('padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #F5F7F8; color: #5B6672')}>Waiting for the first reading</div>
              : <div className={warn ? 'md-wave' : ''} style={s(pillStyle(warn))}>{warn ? `${warn} reading${warn > 1 ? 's' : ''} need${warn > 1 ? '' : 's'} attention` : 'All readings normal'}</div>}
            {mini.length > 0 && (
              <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; width: 100%; margin-top: 4px')}>
                {mini.map((m) => <div key={m[0]} style={s('display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 14px; ' + (m[2] ? 'background: #FDECEE; color: #A81C2B' : 'background: #F5F7F8; color: #14202B'))}><span style={s('font-size: 10px; font-weight: 600; letter-spacing: 0.3px')}>{m[0]}</span><span style={s('font-size: 17px; font-weight: 800')}>{m[1]}</span></div>)}
              </div>
            )}
          </A>
          <button type="button" disabled={n < 2} onClick={() => pick(i + 1)} aria-label="Next person" style={s('width: 44px; height: 44px; flex-shrink: 0; border: 0; background: transparent; color: #0B7A75; cursor: pointer; display: flex; align-items: center; justify-content: center' + (n < 2 ? '; visibility: hidden' : ''))}><I.chevR /></button>
        </div>
        {n > 1 && <div style={s('display: flex; justify-content: center; gap: 6px')}>
          {live.people.map((q, k) => <button key={q.id} type="button" aria-label={'Show ' + q.name} onClick={() => pick(k)} style={{ ...s('height: 8px; border-radius: 4px; border: 0; padding: 0; cursor: pointer; transition: width 0.25s'), width: k === i ? 22 : 8, background: k === i ? '#D62839' : '#F2B8BE' }} />)}
        </div>}
        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Next dose</div>
          <A to={'/p/' + p.id + '/meds'} style="display: flex; gap: 12px; align-items: center; padding: 14px; background: #FFFFFF; border-radius: 18px; text-decoration: none; color: #14202B; box-shadow: 0 6px 20px rgba(20,32,43,0.06)">
            <span style={s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.pill /></span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}>
              <span style={s('font-size: 15px; font-weight: 600')}>{nd.due ? nd.due.name : nd.total ? 'All done for today' : 'No medicine added'}</span>
              <span style={{ ...s('font-size: 12px'), color: nd.due && nd.due.st === 'missed' ? '#A81C2B' : '#5B6672' }}>{nd.due ? `${nd.due.time} · ${nd.due.label} · ${nd.taken} of ${nd.total} taken today` : nd.total ? `${nd.taken} of ${nd.total} taken today` : 'Tap to add medicine and reminders'}</span>
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

const alertTo = (pid, a) => (a.type === 'sos' ? `/p/${pid}/locate` : a.type === 'dose' ? `/p/${pid}/meds` : a.k ? `/p/${pid}/r/${a.k}` : `/p/${pid}/vitals`);
const alertTime = (at) => { const d = new Date(at); return dayKey(d) === dayKey() ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : d.toLocaleDateString('en-GB', { weekday: 'short' }); };

export function Alerts() {
  const live = useLive();
  const [who, setWho] = useState('all');
  const all = live.people.flatMap((p) => p.alerts.map((a) => ({ ...a, pid: p.id }))).sort((a, b) => b.at - a.at);
  const list = all.filter((a) => who === 'all' || a.pid === who).slice(0, 20);
  const unread = all.filter((a) => !a.read).length;
  const K = { danger: ['#D62839', '#FFFFFF'], warn: ['#FFF1DB', '#8A5300'] };
  const tabs = [['all', 'All'], ...live.people.map((p) => [p.id, p.self ? 'Me' : p.name])];
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
        {tabs.length > 2 && <div style={s('display: flex; gap: 8px; overflow-x: auto; margin: 0 -20px; padding: 0 20px; scrollbar-width: none')}>
          {tabs.map(([k, label]) => <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)} style={s('flex-shrink: 0; height: 36px; padding: 0 14px; border-radius: 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (who === k ? 'background: #0B7A75; color: #FFFFFF; border: 1.5px solid #0B7A75' : 'background: #FFFFFF; color: #14202B; border: 1.5px solid #D5DBE0'))}>{label}</button>)}
        </div>}
        <div style={s('display: flex; flex-direction: column; max-height: 60vh; overflow-y: auto')}>
          {list.map((a, i) => {
            const u = !a.read, k = K[a.kind] || K.warn;
            return (
              <A key={a.pid + a.id} to={alertTo(a.pid, a)} style={'display: flex; align-items: center; gap: 12px; padding: 12px 8px; border-radius: 14px; text-decoration: none; color: #14202B; ' + (u ? 'background: #FDF6F6' : '') + (i < list.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
                <span className={u ? 'md-wave' : ''} style={{ ...s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; font-size: ' + (a.type === 'sos' ? '11px' : '18px') + '; font-weight: 800; display: flex; align-items: center; justify-content: center'), background: k[0], color: k[1] }}>{a.type === 'sos' ? 'SOS' : '!'}</span>
                <span style={s('display: flex; flex-direction: column; flex-grow: 1; gap: 1px')}><span style={s('font-size: 14px; font-weight: 600')}>{a.title}</span><span style={s('font-size: 12px; color: #5B6672')}>{a.sub}</span></span>
                <span style={s('display: flex; flex-direction: column; align-items: flex-end; gap: 6px')}><span style={s('font-size: 11px; color: #5B6672; white-space: nowrap')}>{alertTime(a.at)}</span><span style={{ ...s('width: 10px; height: 10px; border-radius: 5px'), background: u ? '#D62839' : 'transparent' }} /></span>
              </A>
            );
          })}
          {list.length === 0 && <div style={s('padding: 32px 0; text-align: center; font-size: 14px; color: #5B6672')}>No alerts. Warnings about readings, missed doses and SOS appear here.</div>}
        </div>
        <div style={s('display: flex; gap: 10px')}>
          <button type="button" disabled={!unread} onClick={() => markAlertsRead(live.people)} style={s('flex-grow: 1; height: 48px; border: 1.5px solid #0B7A75; border-radius: 14px; background: #FFFFFF; color: #0B7A75; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer' + (unread ? '' : '; opacity: 0.5'))}>Mark all as read</button>
          <A to="/profile" style="display: flex; flex-grow: 1; height: 48px; align-items: center; justify-content: center; border-radius: 14px; background: #F5F7F8; color: #14202B; font-size: 14px; font-weight: 600; text-decoration: none">Alert settings</A>
        </div>
      </div>
    </div>
  );
}

export function Summary() {
  const live = useLive();
  const [shared, setShared] = useState(false);
  useEffect(() => { update(() => ({ summarySeen: dayKey() })); }, []);
  const today = dayKey();
  const per = live.people.map((p) => {
    const w = p.alerts.filter((a) => dayKey(new Date(a.at)) === today).length;
    const lines = Object.entries(p.vitals).map(([k, v]) => {
      const m = METRICS[k], todays = v.vals[6];
      return todays != null ? `${m.label || m.title} averaged ${todays}${k === 'o2' ? '%' : ''}` : null;
    }).filter(Boolean);
    return { p, ...nextDose(p), w, line: lines.slice(0, 2).join(', ') + (lines.length ? '.' : p.watch ? 'No readings today.' : 'No watch paired yet.') };
  });
  const taken = per.reduce((a, x) => a + x.taken, 0), total = per.reduce((a, x) => a + x.total, 0);
  const warnings = per.reduce((a, x) => a + x.w, 0);
  const share = async () => {
    const text = `myDoc daily summary, ${longDate()}: ${taken} of ${total} doses taken, ${warnings} warning${warnings === 1 ? '' : 's'}.`;
    try { await navigator.share({ title: 'myDoc daily summary', text }); setShared(true); } catch (e) { if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(text); toast('Summary copied. Paste it to your family.'); setShared(true); } catch { toast(text); } }
  };
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
            <div style={s('background: rgba(255,255,255,0.14); border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{live.people.length}</span><span style={s('font-size: 11px')}>{live.people.length === 1 ? 'person' : 'people'}</span></div>
            <div style={s('background: rgba(255,255,255,0.14); border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{taken} / {total}</span><span style={s('font-size: 11px')}>doses taken</span></div>
            <div style={s('background: #FFFFFF; color: #A81C2B; border-radius: 14px; padding: 10px; display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 800')}>{warnings}</span><span style={s('font-size: 11px; font-weight: 600')}>warnings</span></div>
          </div>
        </div>
        <div style={s('padding: 8px 20px 4px; display: flex; flex-direction: column')}>
          {per.map(({ p, due, taken: t, total: n, w, line }, i) => (
            <A key={p.id} to={personHome(p)} style={'display: flex; gap: 12px; padding: 14px 0; text-decoration: none; color: #14202B' + (i < per.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
              <Avatar p={p} size={44} radius={15} font={15} />
              <span style={s('display: flex; flex-direction: column; gap: 4px; flex-grow: 1')}>
                <span style={s('display: flex; align-items: center; justify-content: space-between; gap: 8px')}><span style={s('font-size: 15px; font-weight: 700')}>{p.name}</span><span className={w ? 'md-wave' : ''} style={s('padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; ' + (w ? 'background: #D62839; color: #FFFFFF' : 'background: #E3F5F3; color: #075955'))}>{w ? w + ' warning' + (w > 1 ? 's' : '') : 'All normal'}</span></span>
                <span style={s('font-size: 13px; line-height: 1.45; color: #5B6672')}>{line} {n ? `${t} of ${n} doses taken${due ? `; ${due.name} at ${due.time} is ${due.st === 'missed' ? 'missed' : 'still due'}.` : '.'}` : ''}</span>
              </span>
            </A>
          ))}
        </div>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 16px 20px 20px')}>
          <button type="button" onClick={share} style={s('height: 52px; border: 1.5px solid #0B7A75; border-radius: 16px; background: #FFFFFF; color: #0B7A75; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer')}>{shared ? 'Shared ✓' : 'Share with family'}</button>
          <A to="/home" style="display: flex; height: 52px; align-items: center; justify-content: center; background: #0B7A75; color: #FFFFFF; border-radius: 16px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(11,122,117,0.28)">Got it</A>
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  const live = useLive();
  const st = useStore();
  const set = st.settings;
  const setSetting = (k, v) => update((x) => ({ settings: { ...x.settings, [k]: v } }));
  const [armed, twoTap] = useTwoTap();
  const al = [
    ['range', 'Readings out of range', 'High or low sugar, blood pressure, heart rate'],
    ['doses', 'Missed doses', '30 minutes after a dose is due'],
    ['summary', 'Daily summary', 'Every evening at 20:00'],
    ['quiet', 'Quiet hours', '22:00–06:00 · emergencies still ring']
  ];
  const row = 'display: flex; align-items: center; justify-content: space-between; min-height: 52px; font-size: 14px; font-weight: 600; color: #14202B; text-decoration: none; border: 0; background: transparent; font-family: inherit; padding: 0; cursor: pointer; width: 100%; text-align: left';
  const signOut = async () => { await be.signOut(); go('/welcome'); };
  const sel = live.people[Math.min(st.sel, live.people.length - 1)];
  const u = live.user || {};
  const pr = live.profile || {};
  const notif = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Profile</h1>
          <Logo />
        </div>
        <div style={s('display: flex; align-items: center; gap: 14px; padding: 16px; background: #FFFFFF; border-radius: 24px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
          <span style={s('width: 64px; height: 64px; flex-shrink: 0; border-radius: 22px; background: #0B7A75; color: #FFFFFF; font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center')}>{(pr.name || u.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
          <>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1; min-width: 0')}><span style={s('font-size: 18px; font-weight: 700')}>{pr.name || u.name || 'Caregiver'}</span><span style={s('font-size: 13px; color: #5B6672')}>{{ self: 'Tracking my health', both: 'Caregiver and patient' }[pr.use] || 'Caregiver'}{pr.city ? ' · ' + pr.city : ''}</span><span style={s('font-size: 13px; color: #5B6672; overflow-wrap: anywhere')}>{pr.phone || u.email}</span></span>
            <button type="button" onClick={() => go('/about')} style={s('height: 36px; padding: 0 14px; border: 1.5px solid #0B7A75; border-radius: 12px; background: #FFFFFF; color: #0B7A75; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer')}>Edit</button>
          </>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>People you care for</div>
          {live.people.length > 0 && <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            {live.people.map((p, i) => (
              <A key={p.id} to={'/setup?edit=' + p.id} style={'display: flex; align-items: center; gap: 12px; padding: 12px 0; text-decoration: none; color: #14202B' + (i < live.people.length - 1 ? '; border-bottom: 1px solid #E4E8EC' : '')}>
                <Avatar p={p} size={44} radius={15} font={15} />
                <span style={s('display: flex; flex-direction: column; flex-grow: 1')}>
                  <span style={s('font-size: 15px; font-weight: 600')}>{p.name}</span>
                  <span style={s('font-size: 12px; color: #5B6672')}>{p.conds.join(' · ') || 'No conditions added'}</span>
                  <span style={s('display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5B6672')}><span style={{ ...s('width: 8px; height: 8px; border-radius: 4px'), background: p.watch ? '#0B7A75' : '#C5CDD4' }} />{p.watch ? `Watch connected · battery ${p.battery ?? '–'}% · seen ${ago(p.lastSeen)}` : 'No watch paired yet'}</span>
                </span>
                <I.chev size={18} color="#5B6672" />
              </A>
            ))}
          </div>}
          <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
            <A to="/setup" style="display: flex; height: 44px; align-items: center; justify-content: center; border: 1.5px dashed #0B7A75; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; color: #0B7A75; background: #FFFFFF">+ Add a person</A>
            <A to="/pair" style="display: flex; height: 44px; align-items: center; justify-content: center; border: 1.5px dashed #0B7A75; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; color: #0B7A75; background: #FFFFFF">Pair a watch</A>
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Alerts</div>
          <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            {notif !== 'unsupported' && notif !== 'granted' && (
              <button type="button" onClick={async () => { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Notifications are on' : 'Notifications are blocked. Turn them on in the browser settings.'); }} style={s(row + '; min-height: 60px; border-bottom: 1px solid #E4E8EC; color: #0B7A75')}>
                <span style={s('display: flex; flex-direction: column')}><span>Turn on phone notifications</span><span style={s('font-size: 12px; font-weight: 400; color: #5B6672')}>So alerts pop up while myDoc is open in the background</span></span><I.chev size={18} color="#0B7A75" />
              </button>
            )}
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
            <button type="button" role="switch" aria-checked={set.shareVitals} onClick={() => setSetting('shareVitals', !set.shareVitals)} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; border: 0; background: transparent; padding: 0; font-family: inherit; color: #14202B; text-align: left; cursor: pointer')}><span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 14px; font-weight: 600')}>Share location and vitals</span><span style={s('font-size: 12px; color: #5B6672')}>Included when you share an emergency</span></span><Toggle on={set.shareVitals} /></button>
          </div>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s(section)}>Blood sugar units</div>
          <Seg options={[['mg', 'mg/dL'], ['mmol', 'mmol/L']]} value={set.unit} onChange={(v) => setSetting('unit', v)} />
        </div>

        <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
          <a href="./watch.html" target="_blank" rel="noopener" style={s(row + '; border-bottom: 1px solid #E4E8EC')}>Open the watch simulator<I.chev size={18} color="#5B6672" /></a>
          <button type="button" onClick={() => toast('Help: write to help@mydoc.app')} style={s(row + '; border-bottom: 1px solid #E4E8EC')}>Help and support<I.chev size={18} color="#5B6672" /></button>
          {!be.online && <button type="button" onClick={() => twoTap(() => { be.clearAll(); localStorage.removeItem('mydoc.prefs'); localStorage.removeItem('mydoc.watch'); go('/welcome'); })} style={s(row + '; border-bottom: 1px solid #E4E8EC' + (armed ? '; color: #A81C2B' : ''))}>{armed ? 'Tap again to delete all test data' : 'Delete all test data on this phone'}<I.chev size={18} color="#5B6672" /></button>}
          <button type="button" onClick={signOut} style={s(row + '; color: #A81C2B')}>Sign out</button>
        </div>
        <div style={s('font-size: 12px; color: #5B6672; text-align: center')}>myDoc version 1.1</div>
      </main>
      <Nav tab="profile" medsTo={sel ? '/p/' + sel.id + '/meds' : '/home'} />
    </div>
  );
}

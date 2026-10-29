import { useState } from 'react';
import { s, A, Logo, Back, Avatar, Toggle, Seg, Nav, I, btn, section, card, toast } from '../ui.jsx';
import { update, useStore, todayLabel } from '../store.js';
import { useLive, markTaken, addDose, removeDose, sendToWatch, endSOS, METRICS, statusOf } from '../live.js';
import { ORDER, sugarText, sugarUnit, clock, ago } from '../health.js';

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const her = (p, t) => t.replaceAll('{her}', p.her).replaceAll('{him}', p.him);
const valueOf = (k, v, unit) => (k === 'sugar' ? sugarText(v.now, unit) : k === 'o2' ? v.show + '%' : v.show);
const unitOf = (k, m, unit) => (k === 'sugar' ? sugarUnit(unit) : m.cardUnit || m.unit);
const telOf = (n) => 'tel:' + String(n).replace(/[^\d+]/g, '');

function NoReadings({ p }) {
  return (
    <div style={s(card + '; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center')}>
      <span style={s('width: 56px; height: 56px; border-radius: 28px; background: #E3F5F3; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.watch /></span>
      <div style={s('font-size: 17px; font-weight: 700')}>{p.watch ? 'Waiting for the first reading' : 'No readings yet'}</div>
      <div style={s('font-size: 14px; color: #5B6672; line-height: 1.5')}>{p.watch ? `Readings appear here as soon as ${p.her} watch measures them.` : `Pair ${p.her} watch to see blood sugar, blood pressure, heart rate and oxygen here.`}</div>
      {!p.watch && <A to="/add" style={btn.primary + '; width: 100%; height: 52px; font-size: 16px'}>Pair a watch</A>}
    </div>
  );
}

export function Vitals({ p }) {
  const st = useStore();
  const unit = st.settings.unit;
  const keys = ORDER.filter((k) => p.vitals[k]);
  const bad = keys.filter((k) => statusOf(k, p.vitals[k].now) !== 'Normal');
  const first = bad[0];
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <Back to="/home" />
          <Logo />
          <Avatar p={p} />
        </div>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Health parameters</h1>
          <div style={s('display: flex; align-items: center; gap: 6px; font-size: 13px; color: #5B6672')}><I.watch />{p.name} · {p.watch ? 'synced ' + ago(p.lastSeen) : 'no watch yet'}</div>
        </div>
        {p.sosActive && (
          <A to={'/p/' + p.id + '/locate'} className="md-wave" style="display: flex; gap: 12px; align-items: center; padding: 14px 16px; background: #D62839; color: #FFFFFF; border-radius: 18px; text-decoration: none">
            <span style={s('width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800')}>SOS</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 15px; font-weight: 700')}>SOS pressed {ago(p.sos.at)}</span><span style={s('font-size: 12px')}>{p.shortAddress}. Tap to see where.</span></span>
            <I.chev />
          </A>
        )}
        {first && (
          <A to={'/p/' + p.id + '/r/' + first} className="md-wave" style="display: flex; gap: 12px; align-items: center; padding: 14px 16px; background: #D62839; color: #FFFFFF; border-radius: 18px; text-decoration: none; box-shadow: 0 10px 24px rgba(214,40,57,0.28)">
            <span className="md-wave-light" style={s('width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800')}>!</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 15px; font-weight: 600')}>{(METRICS[first].label || METRICS[first].title)} is {statusOf(first, p.vitals[first].now).toLowerCase()}</span><span style={s('font-size: 12px')}>{p.self ? 'Take your medication or call for help' : `Check on ${p.him} or remind ${p.him} to take ${p.her} medication`}</span></span>
            <I.chev />
          </A>
        )}
        {keys.length ? (
          <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px')}>
            {keys.map((k) => {
              const m = METRICS[k], v = p.vitals[k], state = statusOf(k, v.now), warn = state !== 'Normal';
              const Icon = I[m.icon];
              return (
                <A key={k} to={'/p/' + p.id + '/r/' + k} className={warn ? 'md-wave' : ''} style={'display: flex; flex-direction: column; padding: 16px; border-radius: 24px; text-decoration: none; min-height: 168px; box-sizing: border-box; ' + (warn ? 'background: #D62839; color: #FFFFFF; box-shadow: 0 10px 24px rgba(214,40,57,0.25)' : 'background: #FFFFFF; color: #14202B; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
                  <span style={s('display: flex; justify-content: space-between; align-items: center')}>
                    <span style={s('width: 38px; height: 38px; border-radius: 19px; display: flex; align-items: center; justify-content: center; ' + (warn ? 'background: #FFFFFF; color: #D62839' : 'background: #E3F5F3; color: #0B7A75'))}><Icon /></span>
                    <span style={s('padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; ' + (warn ? 'background: #FFFFFF; color: #A81C2B' : 'background: #E3F5F3; color: #075955'))}>{state}</span>
                  </span>
                  <span style={s('font-size: 12px; font-weight: 600; margin-top: 10px')}>{m.label || m.title}</span>
                  <span style={s('font-size: 30px; font-weight: 800; line-height: 1.1')}>{valueOf(k, v, unit)}</span>
                  <span style={s('font-size: 12px')}>{unitOf(k, m, unit)} · {ago(v.at)}</span>
                </A>
              );
            })}
          </div>
        ) : <NoReadings p={p} />}
        {p.conds.includes('Migraine') && (
          <A to={'/p/' + p.id + '/serotonin'} style="display: flex; gap: 12px; align-items: center; padding: 14px; background: #FFFFFF; border-radius: 18px; text-decoration: none; color: #14202B; box-shadow: 0 6px 20px rgba(20,32,43,0.06)">
            <span style={s('width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: #FFF1DB; color: #8A5300; display: flex; align-items: center; justify-content: center; font-weight: 800')}>5-HT</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 15px; font-weight: 600')}>Serotonin and migraine</span><span style={s('font-size: 12px; color: #5B6672')}>Estimated from sleep, stress and heart signals</span></span>
            <I.chev color="#0B7A75" />
          </A>
        )}
        {keys.length > 0 && <div style={s('font-size: 12px; color: #5B6672; text-align: center')}>Tap a reading for its history and normal range</div>}
      </main>
      <div style={s('position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px 24px max(28px, env(safe-area-inset-bottom)); background: #FFFFFF; border-radius: 24px 24px 0 0; box-shadow: 0 -6px 24px rgba(20,32,43,0.06); margin-top: 16px')}>
        <A to={'/p/' + p.id + '/call'} style="display: flex; height: 56px; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #0B7A75; color: #0B7A75; border-radius: 16px; font-size: 16px; font-weight: 600; text-decoration: none"><I.phone />Call</A>
        <A to={'/p/' + p.id + '/locate'} style="display: flex; height: 56px; align-items: center; justify-content: center; gap: 8px; background: #0B7A75; color: #FFFFFF; border-radius: 16px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(11,122,117,0.28)"><I.pin />Locate</A>
      </div>
    </div>
  );
}

export function Reading({ p, metric }) {
  const st = useStore();
  const [range, setRange] = useState('week');
  const [sent, setSent] = useState(false);
  const k = metric, m = METRICS[k], v = p.vitals[k];
  if (!m || !v) return <Vitals p={p} />;
  const unit = st.settings.unit;
  const state = statusOf(k, v.now), high = state !== 'Normal';
  const span = m.max - m.min;
  const clampPct = (x) => (Math.max(0, Math.min(1, (x - m.min) / span)) * 100).toFixed(1) + '%';
  const px = (x) => Math.max(6, Math.min(140, Math.round((x - m.min) / span * 140)));
  const lowW = clampPct(m.lo), normW = ((Math.min(m.hi, m.max) - m.lo) / span * 100).toFixed(1) + '%';
  const out = (x) => x > m.hi || x < m.lo;
  const big = k === 'sugar' ? sugarText(v.now, unit) : v.show;
  const unitText = k === 'sugar' ? sugarUnit(unit) : m.unit;
  const normText = k === 'sugar' && unit === 'mmol' ? 'Normal 3.9–7.8' : m.normText;
  const remind = async () => {
    try {
      await sendToWatch(p, k === 'sugar' || k === 'bp' ? { kind: 'dose', text: 'Please take your medicine.' } : { kind: 'check', text: 'Are you OK? Your readings look unusual.' });
      setSent(true); toast(cap(her(p, m.done)));
    } catch { toast('Could not reach the watch. Check your connection.'); }
  };
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #F5F7F8; display: flex; flex-direction: column; gap: 14px; padding: 12px 24px 24px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        <Back to={'/p/' + p.id + '/vitals'} />
        <div style={s('font-size: 16px; font-weight: 600')}>{m.title}</div>
        <div style={s('width: 44px')} />
      </div>
      <div style={s(card + '; padding: 18px; display: flex; flex-direction: column; gap: 12px')}>
        <div style={s('display: flex; align-items: center; gap: 10px')}>
          <Avatar p={p} size={36} radius={12} font={13} />
          <div style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 14px; font-weight: 600')}>{p.name}</span><span style={s('font-size: 12px; color: #5B6672')}>{v.rows[0][0]} · from {p.her} watch</span>{v.est && <span style={s('font-size: 12px; font-weight: 600; color: #8A5300')}>Estimated by optical sensor (experimental) · ± {v.est.pm} mg/dL</span>}</div>
          <span className={high ? 'md-wave' : ''} style={s('padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; ' + (high ? 'background: #D62839; color: #FFFFFF' : 'background: #E3F5F3; color: #075955'))}>{state}</span>
        </div>
        <div style={s('display: flex; align-items: baseline; gap: 6px')}><span style={{ ...s('font-size: 52px; font-weight: 800; line-height: 1'), color: high ? '#A81C2B' : '#14202B' }}>{big}</span><span style={s('font-size: 15px; color: #5B6672')}>{unitText}</span></div>
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          <div style={s('position: relative; display: flex; height: 10px; gap: 3px')}>
            <div style={{ ...s('border-radius: 5px 0 0 5px; background: #F2B33D'), width: lowW }} />
            <div style={{ ...s('background: #2BB5B0'), width: normW, ...(m.noHigh ? s('flex-grow: 1; border-radius: 0 5px 5px 0') : {}) }} />
            {!m.noHigh && <div style={s('flex-grow: 1; border-radius: 0 5px 5px 0; background: #D62839')} />}
            <div className="md-marker" style={{ ...s('position: absolute; top: -5px; width: 20px; height: 20px; margin-left: -10px; border-radius: 10px; background: #FFFFFF; border: 4px solid #14202B; box-sizing: border-box'), left: clampPct(v.now) }} />
          </div>
          <div style={s('display: flex; font-size: 11px; color: #5B6672')}>
            <span style={{ width: lowW }}>Low</span>
            <span style={{ width: normW, ...(m.noHigh ? s('flex-grow: 1; text-align: right') : s('white-space: nowrap')) }}>{normText}</span>
            {!m.noHigh && <span style={s('flex-grow: 1; text-align: right')}>High</span>}
          </div>
        </div>
      </div>
      <Seg options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month']]} value={range} onChange={(r) => { setRange(r); if (r !== 'week') toast('Day and month views come with more history. Showing this week.'); }} />
      <div style={s(card + '; padding: 16px 16px 12px; display: flex; flex-direction: column; gap: 8px')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
          <span style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>{m.chartTitle}</span>
          <span style={s('display: flex; flex-shrink: 0; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #075955')}><span style={s('width: 14px; height: 10px; border-radius: 3px; background: #E3F5F3; border: 1px solid #2BB5B0')} />Normal range</span>
        </div>
        <div style={s('position: relative; height: 140px; display: flex; align-items: flex-end; gap: 12px; padding: 0 4px')}>
          <div style={{ ...s('position: absolute; left: 0; right: 0; background: #E3F5F3; border-radius: 8px'), bottom: px(m.lo), height: px(Math.min(m.hi, m.max)) - px(m.lo) }} />
          {v.vals.map((x, i) => <div key={i} className="md-grow" title={x == null ? 'No readings' : String(x)} style={{ ...s('flex-grow: 1; flex-basis: 0; position: relative; border-radius: 8px'), height: x == null ? 0 : px(x), background: x != null && out(x) ? '#D62839' : '#0B7A75', animationDelay: i * 40 + 'ms' }} />)}
        </div>
        <div style={s('display: flex; gap: 12px; padding: 0 4px')}>
          {v.labels.map((d) => <span key={d} style={s('flex-grow: 1; flex-basis: 0; text-align: center; font-size: 11px; color: #5B6672')}>{d}</span>)}
        </div>
      </div>
      <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 4px 16px')}>
        {v.rows.map((r, i) => (
          <div key={i} style={s('display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 14px')}><span style={{ ...s('width: 10px; height: 10px; border-radius: 5px'), background: r[2] ? '#D62839' : '#0B7A75' }} /><span style={s('flex-grow: 1; color: #5B6672')}>{r[0]}</span><span style={s('font-weight: 700')}>{r[1]}</span></div>
        ))}
      </div>
      <div style={s('flex-grow: 1')} />
      <div style={s('display: flex; gap: 10px')}>
        <A to={'/p/' + p.id + '/call'} aria-label={'Call ' + p.name} style="display: flex; width: 56px; height: 56px; flex-shrink: 0; align-items: center; justify-content: center; border: 1.5px solid #0B7A75; color: #0B7A75; border-radius: 16px; background: #FFFFFF"><I.phone size={22} /></A>
        <button type="button" disabled={!p.watch} onClick={remind} style={s('flex-grow: 1; height: 56px; border: 0; border-radius: 16px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.25s; ' + (sent ? 'background: #E3F5F3; color: #075955' : 'background: #0B7A75; color: #FFFFFF; box-shadow: 0 8px 20px rgba(11,122,117,0.28)'))}>{sent ? cap(her(p, m.done)) : her(p, m.act)}</button>
      </div>
    </main>
  );
}

export function Call({ p }) {
  const row = 'display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 20px; background: #F5F7F8; text-decoration: none; color: #14202B';
  const callBtn = 'width: 44px; height: 44px; flex-shrink: 0; border-radius: 22px; background: #0B7A75; color: #FFFFFF; display: flex; align-items: center; justify-content: center';
  return (
    <div style={s('position: relative; min-height: 100dvh')}>
      <div aria-hidden="true" inert="" style={s('pointer-events: none')}><Vitals p={p} /></div>
      <A to={'/p/' + p.id + '/vitals'} aria-label="Close" className="md-fade" style="position: fixed; inset: 0; z-index: 10; background: rgba(20,32,43,0.55)" />
      <div role="dialog" aria-labelledby="call-title" className="md-sheet" style={s('position: fixed; left: 0; right: 0; bottom: 0; z-index: 11; max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 28px 28px 0 0; padding: 12px 24px max(32px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; box-shadow: 0 -10px 40px rgba(20,32,43,0.2)')}>
        <div style={s('align-self: center; width: 40px; height: 5px; border-radius: 3px; background: #D5DBE0')} />
        <div style={s('display: flex; align-items: center; justify-content: space-between')}>
          <div style={s('display: flex; flex-direction: column')}><h1 id="call-title" style={s('margin: 0; font-size: 22px; font-weight: 700')}>Who do you want to call?</h1><span style={s('font-size: 13px; color: #5B6672')}>For {p.name}</span></div>
          <A to={'/p/' + p.id + '/vitals'} aria-label="Close" style="display: flex; width: 44px; height: 44px; align-items: center; justify-content: flex-end"><span style={s('width: 32px; height: 32px; border-radius: 16px; background: #D62839; color: #FFFFFF; display: flex; align-items: center; justify-content: center')}><I.close /></span></A>
        </div>
        {!p.self && p.phone && (
          <a href={telOf(p.phone)} style={s(row)}>
            <Avatar p={p} size={48} radius={16} font={16} />
            <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 16px; font-weight: 600')}>{p.name}</span><span style={s('font-size: 12px; color: #5B6672')}>{p.phone}</span></span>
            <span style={s(callBtn)}><I.phone /></span>
          </a>
        )}
        {p.contacts.map((c, i) => (
          <a key={i} href={telOf(c.phone)} style={s(row)}>
            <span style={s('width: 48px; height: 48px; flex-shrink: 0; border-radius: 16px; background: #FFF1DB; color: #8A5300; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center')}>{c.ini}</span>
            <span style={s('display: flex; flex-direction: column; flex-grow: 1; gap: 2px; min-width: 0')}><span style={s('display: flex; align-items: center; gap: 6px; flex-wrap: wrap')}><span style={s('font-size: 16px; font-weight: 600')}>{c.name}</span>{i === 0 && <span style={s('padding: 1px 8px; border-radius: 999px; background: #E3F5F3; color: #075955; font-size: 10px; font-weight: 700')}>EMERGENCY CONTACT</span>}</span><span style={s('font-size: 12px; color: #5B6672')}>{c.rel} · {c.phone}</span></span>
            <span style={s(callBtn)}><I.phone /></span>
          </a>
        ))}
        {!p.contacts.length && !p.phone && <div style={s('font-size: 14px; color: #5B6672; padding: 4px 0')}>No phone numbers saved yet. Add an emergency contact below.</div>}
        <A to={'/p/' + p.id + '/locate'} style="display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 20px; background: #D62839; color: #FFFFFF; text-decoration: none; box-shadow: 0 10px 24px rgba(214,40,57,0.3)">
          <span style={s('width: 48px; height: 48px; flex-shrink: 0; border-radius: 16px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center')}><I.cross /></span>
          <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 16px; font-weight: 700')}>Emergency services</span><span style={s('font-size: 12px')}>Call 112 with {p.her} location ready</span></span>
          <I.chev size={22} />
        </A>
        <A to={'/setup?edit=' + p.id} style="display: flex; height: 44px; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; text-decoration: none; color: #0B7A75">Edit contacts</A>
      </div>
    </div>
  );
}

export function Locate({ p }) {
  const contact = p.contacts[0];
  const hasLoc = !!(p.loc && p.loc.lat);
  const shareText = `${p.name} is at ${p.address}${hasLoc ? ` (map: https://maps.google.com/?q=${p.loc.lat},${p.loc.lng})` : ''}. Sent from myDoc.`;
  const share = async () => {
    try { await navigator.share({ title: 'Location of ' + p.name, text: shareText }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(shareText); toast('Location copied'); } catch { toast(shareText); }
  };
  const label = 'font-size: 11px; font-weight: 600; color: #7A6E5A';
  const street = p.address.split(',')[0].replace(/^\d+\s*/, '');
  const area = (p.address.split(',')[1] || '').trim();
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #EFEBE3; position: relative; overflow: hidden')}>
      <div aria-hidden="true" style={s('position: absolute; inset: 0; left: 50%; width: 390px; margin-left: -195px')}>
        <div style={s('position: absolute; left: 30px; top: 150px; width: 130px; height: 110px; border-radius: 18px; background: #D7E8CF')} />
        <div style={s('position: absolute; left: 250px; top: 90px; width: 110px; height: 150px; border-radius: 18px; background: #D7E8CF')} />
        <div style={s('position: absolute; left: -400px; right: -400px; top: 300px; height: 14px; background: #FFFFFF; transform: rotate(-8deg)')} />
        <div style={s('position: absolute; left: 196px; top: -20px; height: 340px; width: 18px; background: #F6D58B; transform: rotate(6deg)')} />
        <div style={s('position: absolute; left: -400px; right: -400px; top: 420px; height: 10px; background: #FFFFFF')} />
        <div style={s('position: absolute; left: 90px; top: 0; height: 2000px; width: 10px; background: #FFFFFF')} />
        <div style={s('position: absolute; left: 300px; top: 260px; height: 2000px; width: 10px; background: #FFFFFF')} />
        {hasLoc && <div style={s(label + '; position: absolute; left: 40px; top: 272px; transform: rotate(-8deg)')}>{street}</div>}
        {hasLoc && <div style={s('position: absolute; left: 260px; top: 180px; font-size: 13px; font-weight: 700; color: #5E7A55')}>{area}</div>}
        {hasLoc && (
          <div style={s('position: absolute; left: 175px; top: 290px; width: 40px; display: flex; flex-direction: column; align-items: center')}>
            <div className="md-ring" style={s('position: absolute; top: 18px; width: 120px; height: 120px; margin-top: -42px; border-radius: 60px; background: rgba(214,40,57,0.14)')} />
            <div className="md-pin" style={s('position: relative; width: 56px; height: 56px; border-radius: 28px 28px 28px 4px; transform: rotate(-45deg); background: #D62839; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(214,40,57,0.4)')}><span style={{ ...s('transform: rotate(45deg); width: 40px; height: 40px; border-radius: 20px; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center'), background: p.bg, color: p.fg }}>{p.ini}</span></div>
            <span style={s('position: relative; margin-top: 14px; white-space: nowrap; background: #14202B; color: #FFFFFF; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600')}>{ago(p.loc.at)}</span>
          </div>
        )}
      </div>
      <div style={s('position: absolute; left: 0; right: 0; top: 0; padding: 12px 16px; display: flex; align-items: center; gap: 8px')}>
        <A to={'/p/' + p.id + '/vitals'} aria-label="Back" style="display: flex; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; color: #0B7A75; background: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,32,43,0.12)"><I.back /></A>
        <div style={s('flex-grow: 1; height: 44px; background: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,32,43,0.12); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600')}>Where is {p.self ? 'my watch' : p.name}?</div>
      </div>
      <div style={s('position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: stretch')}>
        {hasLoc && <button type="button" onClick={share} aria-label="Share location" style={s('align-self: flex-end; margin: 0 20px 16px; width: 56px; height: 56px; border-radius: 28px; border: 0; background: #14202B; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(20,32,43,0.3)')}><I.share /></button>}
        <div className="md-sheet" style={s('background: #FFFFFF; border-radius: 28px 28px 0 0; padding: 12px 24px max(28px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; box-shadow: 0 -10px 40px rgba(20,32,43,0.12)')}>
          <div style={s('align-self: center; width: 40px; height: 5px; border-radius: 3px; background: #D5DBE0')} />
          <div style={s('display: flex; gap: 12px; align-items: center')}>
            <span style={s('width: 44px; height: 44px; flex-shrink: 0; border-radius: 14px; background: #FDECEE; color: #D62839; display: flex; align-items: center; justify-content: center')}><I.pin size={22} /></span>
            <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 16px; font-weight: 600')}>{p.address}</span><span style={s('font-size: 12px; color: #5B6672')}>{hasLoc ? `From ${p.her} watch's GPS · ${ago(p.loc.at)}` : `Appears once ${p.her} watch is linked`}</span></span>
          </div>
          <A to={'/p/' + p.id + '/sent'} style="display: flex; height: 56px; align-items: center; justify-content: center; gap: 8px; background: #D62839; color: #FFFFFF; border-radius: 16px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(214,40,57,0.3)">Get emergency help</A>
          {hasLoc && <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
            {contact ? <a href={'sms:' + contact.phone.replace(/[^\d+]/g, '') + '?body=' + encodeURIComponent(shareText)} style={s('display: flex; height: 48px; align-items: center; justify-content: center; border: 1.5px solid #0B7A75; color: #0B7A75; border-radius: 14px; font-size: 14px; font-weight: 600; text-decoration: none')}>Text {contact.name}</a>
              : <button type="button" onClick={share} style={s('display: flex; height: 48px; align-items: center; justify-content: center; border: 1.5px solid #0B7A75; color: #0B7A75; background: #FFFFFF; border-radius: 14px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Share location</button>}
            <a href={'https://www.google.com/maps/dir/?api=1&destination=' + p.loc.lat + ',' + p.loc.lng} target="_blank" rel="noopener" style={s('display: flex; height: 48px; align-items: center; justify-content: center; border: 1.5px solid #0B7A75; color: #0B7A75; border-radius: 14px; font-size: 14px; font-weight: 600; text-decoration: none')}>Directions</a>
          </div>}
        </div>
      </div>
    </main>
  );
}

// Emergency: myDoc can't reach 112 by itself, so it puts everything 112 needs on one screen.
export function Sent({ p }) {
  const st = useStore();
  const vit = ['sugar', 'bp', 'hr'].filter((k) => p.vitals[k]).map((k) => (k === 'sugar' ? 'Sugar ' + sugarText(p.vitals.sugar.now, st.settings.unit) : k === 'bp' ? 'BP ' + p.vitals.bp.show : 'Heart ' + p.vitals.hr.show)).join(' · ') || 'None yet';
  const contact = p.contacts[0];
  const text = `EMERGENCY: ${p.name} needs help at ${p.address}.${p.loc && p.loc.lat ? ` Map: https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}` : ''} Readings: ${vit}. I am calling 112. (myDoc)`;
  const row = 'display: flex; justify-content: space-between; gap: 12px; padding: 12px 0';
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #F5F7F8; display: flex; flex-direction: column; padding: 12px 24px 28px; gap: 16px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}><Back to={'/p/' + p.id + '/locate'} /><Logo /><span style={s('width: 44px')} /></div>
      <div className="md-pop-in" style={s('background: #D62839; color: #FFFFFF; border-radius: 32px; padding: 28px 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; box-shadow: 0 18px 40px rgba(214,40,57,0.3)')}>
        <div className="md-pop" style={s('width: 72px; height: 72px; border-radius: 36px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center')}><I.cross /></div>
        <h1 style={s('margin: 4px 0 0; font-size: 30px; font-weight: 800; letter-spacing: 1px')}>CALL 112</h1>
        <p style={s('margin: 0; font-size: 15px; line-height: 1.5')}>Tell them it's an emergency for {p.self ? 'you' : p.name} and read out the address below.</p>
      </div>
      <a href="tel:112" style={s(btn.primary + '; background: #D62839; box-shadow: 0 8px 20px rgba(214,40,57,0.3)')}><I.phone />Call 112 now</a>
      <div style={s(card + '; padding: 6px 18px; display: flex; flex-direction: column; font-size: 14px')}>
        <div style={s(row + '; border-bottom: 1px solid #E4E8EC')}><span style={s('color: #5B6672')}>Address</span><span style={s('font-weight: 700; text-align: right; user-select: all')}>{p.address}</span></div>
        {st.settings.shareVitals && <div style={s(row + '; border-bottom: 1px solid #E4E8EC')}><span style={s('color: #5B6672')}>Readings</span><span style={s('font-weight: 600; text-align: right')}>{vit}</span></div>}
        <div style={s(row)}><span style={s('color: #5B6672')}>Conditions</span><span style={s('font-weight: 600; text-align: right')}>{p.conds.join(', ') || 'None saved'}</span></div>
      </div>
      {contact && <a href={'sms:' + contact.phone.replace(/[^\d+]/g, '') + '?body=' + encodeURIComponent(text)} style={s(btn.outline)}>Text {contact.name} the location</a>}
      {p.sosActive && <button type="button" onClick={async () => { await endSOS(p); toast('SOS marked as handled'); }} style={s(btn.outline + '; border-color: #5B6672; color: #14202B')}>Mark SOS as handled</button>}
      <div style={s('flex-grow: 1')} />
      <A to="/home" style={btn.outline + '; border: 0; background: transparent'}>Back to home</A>
    </main>
  );
}

export function Meds({ p }) {
  const [reminded, setReminded] = useState(false);
  const [flash, setFlash] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nm, setNm] = useState({ name: '', time: '08:00', how: '', need: false });
  const list = p.today;
  const due = list.find((d) => d.st === 'due') || list.find((d) => d.st === 'missed');
  const sched = list.filter((d) => d.st !== 'need');
  const chip = { taken: 'background: #E3F5F3; color: #075955', due: 'background: #FFF1DB; color: #8A5300', later: 'background: #F5F7F8; color: #5B6672', missed: 'background: #FDECEE; color: #A81C2B', need: 'background: #FFFFFF; color: #5B6672; border: 1px solid #D5DBE0' };
  const remindLabel = p.self ? 'Remind me later' : 'Remind ' + p.him + ' now';
  const take = async (d) => {
    await markTaken(p, d.id, clock());
    setFlash(d.id); setReminded(false);
    toast(d.name + ' marked as taken');
    if (navigator.vibrate) navigator.vibrate(30);
  };
  const remind = async () => {
    if (!p.watch) { toast(`Pair ${p.her} watch to send reminders.`); return; }
    await sendToWatch(p, { kind: 'dose', text: `Time for ${due.name}.` });
    setReminded(true); toast('Reminder sent to ' + p.her + ' watch');
  };
  const addMed = async (e) => {
    e.preventDefault();
    if (!nm.name.trim()) return;
    await addDose(p, nm.need ? { name: nm.name.trim(), how: nm.how.trim() || 'When needed', need: true, time: '' } : { time: nm.time, name: nm.name.trim(), how: nm.how.trim() || '1 tablet' });
    setNm({ name: '', time: '08:00', how: '', need: false }); setAdding(false);
    toast('Medicine added. ' + (p.watch ? cap(p.her) + ' watch will remind ' + p.him + '.' : 'Pair a watch for reminders.'));
  };
  const field = 'height: 44px; border: 1.5px solid #E4E8EC; border-radius: 12px; padding: 0 12px; font-size: 15px; font-family: inherit; color: #14202B; background: #FFFFFF; min-width: 0; box-sizing: border-box; width: 100%';
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 12px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
          <Back to="/home" />
          <div style={s('display: flex; flex-direction: column; align-items: center')}><span style={s('font-size: 16px; font-weight: 600')}>Medication</span><span style={s('font-size: 12px; color: #5B6672')}>{p.name}</span></div>
          <Avatar p={p} />
        </div>
        <div style={s('background: #0B7A75; color: #FFFFFF; border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 12px 28px rgba(11,122,117,0.3)')}>
          <div style={s('display: flex; justify-content: space-between; align-items: center')}>
            <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 0.8px')}>NEXT DOSE</span>
            <span style={s('display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); font-size: 12px; font-weight: 600')}><I.clock />{due ? due.label : sched.length ? 'Done' : '—'}</span>
          </div>
          <div key={due ? due.id : 'done'} className="md-slide" style={s('display: flex; align-items: center; gap: 14px')}>
            <span style={s('width: 52px; height: 52px; flex-shrink: 0; border-radius: 16px; background: #FFFFFF; color: #0B7A75; display: flex; align-items: center; justify-content: center')}><I.pill size={28} /></span>
            <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 20px; font-weight: 700; line-height: 1.2')}>{due ? due.name : sched.length ? 'All done for today' : 'No medicine yet'}</span><span style={s('font-size: 13px')}>{due ? due.how + ' · ' + due.time : sched.length ? 'Every dose has been taken' : 'Add one below'}</span></span>
          </div>
          {due && (
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
              <button type="button" onClick={remind} style={s('height: 44px; border: 0; border-radius: 14px; background: #FFFFFF; color: #0B7A75; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>{reminded ? 'Reminder sent' : remindLabel}</button>
              <button type="button" onClick={() => take(due)} style={s('height: 44px; border: 1.5px solid #FFFFFF; border-radius: 14px; background: transparent; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Mark as taken</button>
            </div>
          )}
        </div>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
          <div style={s('background: #FFFFFF; border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column')}><span style={s('font-size: 12px; color: #5B6672')}>Today</span><span style={s('font-size: 18px; font-weight: 700')}>{sched.filter((d) => d.st === 'taken').length} of {sched.length} taken</span></div>
          <div style={s('background: #FFFFFF; border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column')}><span style={s('font-size: 12px; color: #5B6672')}>This week</span><span style={s('font-size: 18px; font-weight: 700')}>{p.week}</span></div>
        </div>
        <div style={s('display: flex; justify-content: space-between; align-items: baseline')}>
          <span style={s(section)}>Today · {todayLabel()}</span>
          {list.length > 0 ? <button type="button" onClick={() => setEditing(!editing)} style={s('border: 0; background: transparent; font-size: 13px; font-weight: 600; color: #0B7A75; font-family: inherit; cursor: pointer; padding: 4px 0')}>{editing ? 'Done' : 'Edit'}</button> : <span style={s('font-size: 12px; color: #5B6672')}>{p.watch ? 'Also on ' + p.her + ' watch' : ''}</span>}
        </div>
        {list.length > 0 && (
          <div style={s('display: flex; flex-direction: column; background: #FFFFFF; border-radius: 20px; padding: 2px 14px')}>
            {list.map((d, i) => (
              <div key={d.id} className={flash === d.id ? 'md-flash' : ''} style={s('display: flex; align-items: center; gap: 10px; padding: 10px 0; ' + (i < list.length - 1 ? 'border-bottom: 1px solid #E4E8EC' : ''))}>
                <span style={s('width: 44px; font-size: 14px; font-weight: 700')}>{d.time}</span>
                <span style={s('display: flex; flex-direction: column; flex-grow: 1')}><span style={s('font-size: 14px; font-weight: 600')}>{d.name}</span><span style={s('font-size: 12px; color: #5B6672')}>{d.how}</span></span>
                {editing
                  ? <button type="button" aria-label={'Remove ' + d.name} onClick={() => removeDose(p, d.id)} style={s('width: 36px; height: 36px; border: 0; border-radius: 18px; background: #FDECEE; color: #A81C2B; cursor: pointer; display: flex; align-items: center; justify-content: center')}><I.close size={14} /></button>
                  : d.st === 'missed' ? <button type="button" onClick={() => take(d)} style={s('flex-shrink: 0; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 0; cursor: pointer; font-family: inherit; ' + chip.missed)}>Missed · mark taken</button>
                  : <span style={s('flex-shrink: 0; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; ' + chip[d.st])}>{d.label}</span>}
              </div>
            ))}
          </div>
        )}
        <div style={s('display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px; background: ' + (p.missed ? '#FDECEE' : '#E3F5F3'))}>
          <span style={s('width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; color: #FFFFFF; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; background: ' + (p.missed ? '#D62839' : '#0B7A75'))}>{p.missed ? '!' : 'i'}</span>
          <span style={s('font-size: 13px; color: ' + (p.missed ? '#A81C2B' : '#075955'))}>{p.note}</span>
        </div>
        <div style={s('flex-grow: 1')} />
        {adding ? (
          <form onSubmit={addMed} style={s('display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 18px; background: #FFFFFF')}>
            <input aria-label="Medicine name and strength" placeholder="e.g. Metformin 500 mg" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} style={s(field)} autoFocus />
            <div style={s('display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px')}>
              <input aria-label="Time" type="time" disabled={nm.need} value={nm.time} onChange={(e) => setNm({ ...nm, time: e.target.value })} style={s(field + (nm.need ? '; opacity: 0.4' : ''))} required={!nm.need} />
              <input aria-label="How to take it" placeholder="e.g. 1 tablet after lunch" value={nm.how} onChange={(e) => setNm({ ...nm, how: e.target.value })} style={s(field)} />
            </div>
            <button type="button" role="switch" aria-checked={nm.need} onClick={() => setNm({ ...nm, need: !nm.need })} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; cursor: pointer')}><span>Only when needed (no set time)</span><Toggle on={nm.need} /></button>
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
              <button type="button" onClick={() => setAdding(false)} style={s('height: 44px; border: 1.5px solid #0B7A75; border-radius: 12px; background: #FFFFFF; color: #0B7A75; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Cancel</button>
              <button type="submit" style={s('height: 44px; border: 0; border-radius: 12px; background: #0B7A75; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer')}>Add</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={s(btn.dashed + '; font-family: inherit; cursor: pointer')}>+ Add medicine</button>
        )}
      </main>
      <Nav tab="meds" medsTo={'/p/' + p.id + '/meds'} />
    </div>
  );
}

// Serotonin can't be measured by a watch; this view shows the planned estimate (preview).
export function Serotonin({ p }) {
  const st = useStore();
  const [low, setLow] = useState(false);
  const warn = st.serotoninWarn;
  const v = low ? [62, 60, 58, 50, 42, 34, 24] : [58, 62, 55, 60, 64, 57, 61];
  const d = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Today'];
  const signals = low ? [['Sleep', '5h 20m'], ['Stress', 'High'], ['Headaches', '0 today']] : [['Sleep', '7h 10m'], ['Stress', 'Low'], ['Headaches', '0 this week']];
  const tab = (a) => 'height: 40px; border: 0; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; ' + (a ? 'background: #FFFFFF; color: #14202B; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #5B6672');
  return (
    <main style={s('min-height: 100dvh; box-sizing: border-box; background: #F5F7F8; display: flex; flex-direction: column; gap: 12px; padding: 12px 24px 24px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}>
        <Back to={'/p/' + p.id + '/vitals'} />
        <div style={s('font-size: 16px; font-weight: 600')}>Serotonin &amp; migraine</div>
        <Avatar p={p} font={15} />
      </div>
      <div style={s('padding: 10px 12px; border-radius: 14px; background: #FFF1DB; color: #8A5300; font-size: 12px; line-height: 1.5')}>Preview: example values. Watches can't measure serotonin; a future version estimates migraine risk from sleep, stress and heart signals.</div>
      <div style={s(card + '; padding: 18px; display: flex; flex-direction: column; gap: 12px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: center')}>
          <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 0.8px; color: #5B6672')}>SEROTONIN LEVEL</span>
          <span style={s('padding: 3px 10px; border-radius: 999px; background: #F5F7F8; color: #5B6672; font-size: 11px; font-weight: 600')}>Estimated</span>
        </div>
        <div style={{ ...s('font-size: 22px; font-weight: 700; line-height: 1.3'), color: low ? '#A81C2B' : '#14202B' }}>{low ? 'Serotonin level is dropping.' : 'Serotonin levels are within optimal range.'}</div>
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          <div style={s('position: relative; display: flex; height: 12px; gap: 3px')}>
            <div style={s('width: 30%; border-radius: 6px 0 0 6px; background: #F2B33D')} />
            <div style={s('width: 45%; background: #2BB5B0')} />
            <div style={s('flex-grow: 1; border-radius: 0 6px 6px 0; background: #8FD3CF')} />
            <div className="md-marker" style={{ ...s('position: absolute; top: -5px; width: 22px; height: 22px; margin-left: -11px; border-radius: 11px; background: #FFFFFF; border: 4px solid #14202B; box-sizing: border-box'), left: low ? '18%' : '55%' }} />
          </div>
          <div style={s('display: flex; font-size: 11px; color: #5B6672')}><span style={s('width: 30%')}>Dropping</span><span style={s('width: 45%; text-align: center')}>Optimal</span><span style={s('flex-grow: 1; text-align: right')}>High</span></div>
        </div>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #F5F7F8; padding: 4px; border-radius: 12px')}>
          <button type="button" aria-pressed={!low} onClick={() => setLow(false)} style={s(tab(!low))}>Normal day</button>
          <button type="button" aria-pressed={low} onClick={() => setLow(true)} style={s(tab(low))}>Dropping</button>
        </div>
      </div>
      {low && (
        <div className="md-wave md-slide" style={s('display: flex; gap: 12px; align-items: center; padding: 14px 16px; background: #D62839; color: #FFFFFF; border-radius: 18px; box-shadow: 0 10px 24px rgba(214,40,57,0.28)')}>
          <span style={s('width: 36px; height: 36px; flex-shrink: 0; border-radius: 18px; background: #FFFFFF; color: #D62839; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800')}>!</span>
          <span style={s('display: flex; flex-direction: column')}><span style={s('font-size: 15px; font-weight: 600')}>Migraine risk is rising</span><span style={s('font-size: 12px')}>Take the medication now to head off an episode</span></span>
        </div>
      )}
      <div style={s(card + '; padding: 16px; display: flex; flex-direction: column; gap: 10px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: center')}><span style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>Last 7 days · relative level</span><span style={s('display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #075955')}><span style={s('width: 14px; height: 10px; border-radius: 3px; background: #E3F5F3; border: 1px solid #2BB5B0')} />Optimal</span></div>
        <div style={s('position: relative; height: 110px; display: flex; align-items: flex-end; gap: 12px; padding: 0 4px')}>
          <div style={s('position: absolute; left: 0; right: 0; bottom: 33px; height: 50px; background: #E3F5F3; border-radius: 8px')} />
          {v.map((x, i) => <div key={i + String(low)} className="md-grow" style={{ ...s('flex-grow: 1; flex-basis: 0; border-radius: 8px; position: relative'), height: x, background: x < 33 ? '#D62839' : x < 45 ? '#F2B33D' : '#0B7A75', animationDelay: i * 40 + 'ms' }} />)}
        </div>
        <div style={s('display: flex; gap: 12px; padding: 0 4px')}>{d.map((x) => <span key={x} style={s('flex-grow: 1; flex-basis: 0; text-align: center; font-size: 11px; color: #5B6672')}>{x}</span>)}</div>
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px')}>
        {signals.map(([l, val]) => <div key={l} style={s('background: #FFFFFF; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column')}><span style={s('font-size: 11px; color: #5B6672')}>{l}</span><span style={s('font-size: 16px; font-weight: 700')}>{val}</span></div>)}
      </div>
      <button type="button" role="switch" aria-checked={warn} onClick={() => update((x) => ({ serotoninWarn: !x.serotoninWarn }))} style={s('display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 14px; color: #14202B; text-align: left; cursor: pointer')}><span>Warn on the watch when it starts dropping</span><Toggle on={warn} /></button>
      <div style={s('flex-grow: 1')} />
      <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
        <A to={'/p/' + p.id + '/meds'} style="display: flex; height: 52px; align-items: center; justify-content: center; border: 1.5px solid #0B7A75; color: #0B7A75; border-radius: 16px; font-size: 15px; font-weight: 600; text-decoration: none; background: #FFFFFF">Medication</A>
        <A to="/home" style="display: flex; height: 52px; align-items: center; justify-content: center; background: #0B7A75; color: #FFFFFF; border-radius: 16px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px rgba(11,122,117,0.28)">Back to home</A>
      </div>
    </main>
  );
}

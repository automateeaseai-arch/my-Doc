// Doctor report: preview on the phone, then share or save the PDF (src/reportPdf.js).
import { useEffect, useState } from 'react';
import { s, Back, Seg, Logo, toast } from '../ui.jsx';
import { useStore } from '../store.js';
import { useLive, loadReport, METRICS, statusOf } from '../live.js';
import { ORDER } from '../health.js';
import { reportData } from '../report.js';

const DAY = 86400000;
const unitOf = (k, mmol) => (k === 'sugar' ? (mmol ? 'mmol/L' : 'mg/dL') : k === 'bp' ? 'mmHg' : k === 'hr' ? 'bpm' : '%');

// Every reading as a dot, daily averages as a line, the normal range shaded (same as the PDF).
function Chart({ k, st, data, mmol }) {
  const m = METRICS[k], W = 320, H = 120, from = data.from, to = from + data.days * DAY;
  const vals = st.readings.flatMap((r) => (k === 'bp' ? [r.v, r.v2 || r.v] : [r.v]));
  let lo = Math.min(...vals, m.lo), hi = Math.max(...vals, m.noHigh ? 100 : m.hi);
  if (k === 'o2') { lo = Math.min(lo, 88); hi = 100.5; } else { const pad = (hi - lo) * 0.08; lo -= pad; hi += pad; }
  const X = (t) => 26 + ((t - from) / (to - from)) * (W - 30), Y = (v) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 22);
  const step = [5, 10, 20, 25, 50].find((x) => (hi - lo) / x <= 5) || 50, ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const line = (key) => st.daily.filter(Boolean).map((d) => `${X(d.day + DAY / 2)},${Y(d[key])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${m.title}: ${st.n} readings over ${data.days} days, ${st.inRange}% in the normal range`}>
      <rect x={X(from)} y={Y(m.noHigh ? hi : m.hi)} width={X(to) - X(from)} height={Y(m.lo) - Y(m.noHigh ? hi : m.hi)} fill="#E3F5F3" />
      {ticks.map((v) => <g key={v}><line x1={X(from)} x2={X(to)} y1={Y(v)} y2={Y(v)} stroke="#E4E8EC" strokeWidth="0.6" /><text x="22" y={Y(v) + 3} fontSize="8" textAnchor="end" fill="#5B6672">{k === 'sugar' && mmol ? (v / 18).toFixed(1) : v}</text></g>)}
      {data.dayList.map((d, i) => i % Math.ceil(data.days / 7) === 0 && <text key={d} x={X(d + DAY / 2)} y={H - 3} fontSize="8" textAnchor="middle" fill="#5B6672">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>)}
      {k === 'bp' && <line x1={X(from)} x2={X(to)} y1={Y(90)} y2={Y(90)} stroke="#2F4A8A" strokeDasharray="2 2" strokeWidth="0.8" />}
      {st.readings.map((r, i) => <g key={i}>
        <circle cx={X(r.at)} cy={Y(r.v)} r="1.6" fill={r.est ? '#FFFFFF' : statusOf(k, r.v) !== 'Normal' ? '#D62839' : '#0B7A75'} stroke={statusOf(k, r.v) !== 'Normal' ? '#D62839' : '#0B7A75'} strokeWidth="0.6" />
        {k === 'bp' && r.v2 && <circle cx={X(r.at)} cy={Y(r.v2)} r="1.3" fill={r.v2 >= 90 ? '#D62839' : '#2F4A8A'} />}
      </g>)}
      <polyline points={line('v')} fill="none" stroke="#0B7A75" strokeWidth="1.8" strokeLinejoin="round" />
      {k === 'bp' && <polyline points={line('v2')} fill="none" stroke="#2F4A8A" strokeWidth="1.4" strokeDasharray="3 2" />}
    </svg>
  );
}

export function Report({ p }) {
  const live = useLive();
  const st = useStore();
  const mmol = st.settings.unit === 'mmol';
  const [days, setDays] = useState(14);
  const [raw, setRaw] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { setRaw(null); setErr(''); loadReport(p, 30).then(setRaw).catch(() => setErr('Could not load the readings. Check your connection and try again.')); }, [p.id]);
  const data = raw && reportData({ ...raw, doses: p.doses, days });
  const carer = (live.profile && live.profile.name) || (live.user && live.user.name) || 'Caregiver';
  const fileName = `myDoc report ${p.name} ${new Date().toISOString().slice(0, 10)}.pdf`;

  const make = async (how) => {
    setBusy(how);
    try {
      const { makeReport } = await import('../reportPdf.js');
      const blob = await makeReport({ person: p, data, insights: p.insights, carer, unit: st.settings.unit });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (how === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'myDoc health report', text: `Health report for ${p.name} (last ${days} days)` }); } catch (e) { if (e.name !== 'AbortError') throw e; }
      } else {
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        toast(how === 'share' ? 'Sharing is not available here, so the PDF was saved instead.' : 'PDF saved to your downloads.');
      }
    } catch { toast('Could not make the PDF. Please try again.'); }
    setBusy('');
  };

  const keys = data ? ORDER.filter((k) => data.metrics[k]) : [];
  const md = data && data.meds;
  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8; display: flex; flex-direction: column')}>
      <main style={s('display: flex; flex-direction: column; gap: 16px; padding: 12px 24px 0; flex-grow: 1')}>
        <div style={s('display: flex; align-items: center; justify-content: space-between; height: 44px')}><Back to={'/p/' + p.id + '/vitals'} /><Logo /><span style={s('width: 44px')} /></div>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <h1 style={s('margin: 0; font-size: 24px; font-weight: 700')}>Doctor report</h1>
          <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>{p.name}'s readings, medicine and alerts with graphs, as a PDF to share with a doctor. Made on this phone; nothing is uploaded.</span>
        </div>
        <Seg options={[['7', '7 days'], ['14', '14 days'], ['30', '30 days']]} value={String(days)} onChange={(v) => setDays(Number(v))} />
        {err && <div role="alert" style={s('padding: 12px 14px; border-radius: 14px; background: #FDECEE; color: #A81C2B; font-size: 14px')}>{err}</div>}
        {!data && !err && <span style={s('font-size: 14px; color: #5B6672')}>Loading readings…</span>}
        {data && !keys.length && <span style={s('font-size: 14px; color: #5B6672')}>No readings in the last {days} days.</span>}
        {keys.map((k) => {
          const x = data.metrics[k], m = METRICS[k];
          const avg = k === 'bp' ? `${Math.round(x.avg)}/${Math.round(x.avg2)}` : k === 'sugar' && mmol ? (x.avg / 18).toFixed(1) : Math.round(x.avg);
          return (
            <section key={k} aria-label={m.title} style={s('display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #FFFFFF; border-radius: 22px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
              <div style={s('display: flex; justify-content: space-between; align-items: baseline; gap: 8px')}><span style={s('font-size: 15px; font-weight: 700')}>{m.title}</span><span style={s('font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; ' + (x.inRange >= 90 ? 'background: #E3F5F3; color: #075955' : 'background: #FDECEE; color: #A81C2B'))}>{x.inRange}% in range</span></div>
              <span style={s('font-size: 13px; color: #5B6672')}>Average <b style={s('color: #14202B')}>{avg} {unitOf(k, mmol)}</b> · {x.n} readings{x.high ? ` · ${x.high} high` : ''}{x.low ? ` · ${x.low} low` : ''}</span>
              <Chart k={k} st={x} data={data} mmol={mmol} />
              {x.pattern && <span style={s('font-size: 12px; color: #5B6672')}>Highest in the {x.pattern.hi.slot}, lowest in the {x.pattern.lo.slot}.</span>}
            </section>
          );
        })}
        {data && md.due > 0 && <section aria-label="Medicine" style={s('padding: 14px 16px; background: #FFFFFF; border-radius: 22px; font-size: 14px; line-height: 1.5')}><b>Medicine:</b> {Math.round((md.taken / md.due) * 100)}% of doses taken ({md.taken} of {md.due}), {md.missed.length} missed.</section>}
        {data && <span style={s('font-size: 12px; color: #5B6672; line-height: 1.5')}>The PDF also lists missed doses, alerts{p.insights && p.insights.items && p.insights.items.some((i) => i.level === 'warn' || i.level === 'watch') ? ', the AI early warnings' : ''} and notes for the doctor.</span>}
      </main>
      <div style={s('position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px 24px max(28px, env(safe-area-inset-bottom)); background: #FFFFFF; border-radius: 24px 24px 0 0; box-shadow: 0 -6px 24px rgba(20,32,43,0.06); margin-top: 16px')}>
        <button type="button" disabled={!keys.length || !!busy} onClick={() => make('save')} style={s('height: 56px; border: 1.5px solid #0B7A75; border-radius: 16px; background: #FFFFFF; color: #0B7A75; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer')}>{busy === 'save' ? 'Making…' : 'Save PDF'}</button>
        <button type="button" disabled={!keys.length || !!busy} onClick={() => make('share')} style={s('height: 56px; border: 0; border-radius: 16px; background: #0B7A75; color: #FFFFFF; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 8px 20px rgba(11,122,117,0.28)')}>{busy === 'share' ? 'Making…' : 'Share PDF'}</button>
      </div>
    </div>
  );
}

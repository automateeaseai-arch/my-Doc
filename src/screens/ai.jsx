// Early warning (AI) on the phone: what the person's watch found (src/ai/insights.js).
import { s, A } from '../ui.jsx';
import { ago } from '../health.js';

export const LEVEL = {
  warn: { bg: '#FDECEE', fg: '#A81C2B', dot: '#D62839', tag: 'Early warning' },
  watch: { bg: '#FFF1DB', fg: '#8A5300', dot: '#F2B33D', tag: 'Keep an eye on' },
  info: { bg: '#F5F7F8', fg: '#5B6672', dot: '#B9C2CA', tag: 'Learning' },
  good: { bg: '#E3F5F3', fg: '#075955', dot: '#0B7A75', tag: 'All steady' }
};

export const Spark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7z" /></svg>
);

// Daily averages, the trend going forward and the limit it is heading for.
function Forecast({ f }) {
  const pts = [...f.daily.map((p) => ({ x: p.d, v: p.v })), ...f.next.map((v, i) => ({ x: i + 1, v, ahead: true }))];
  const vals = [...pts.map((p) => p.v), ...(f.limit != null ? [f.limit] : [])];
  const lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4, x0 = Math.min(...pts.map((p) => p.x)), x1 = 3;
  const W = 300, H = 90, X = (x) => 8 + ((x - x0) / (x1 - x0)) * (W - 16), Y = (v) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 22);
  const past = pts.filter((p) => !p.ahead), last = past[past.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Daily averages and the next 3 days if the trend continues: ${f.next.join(', ')}`}>
      {f.limit != null && <><line x1="8" x2={W - 8} y1={Y(f.limit)} y2={Y(f.limit)} stroke="#D62839" strokeDasharray="4 4" strokeWidth="1.5" /><text x={W - 8} y={Y(f.limit) - 4} fontSize="10" textAnchor="end" fill="#A81C2B">limit {f.limit}</text></>}
      <line x1={X(0)} x2={X(0)} y1="4" y2={H - 16} stroke="#E4E8EC" />
      <polyline points={past.map((p) => `${X(p.x)},${Y(p.v)}`).join(' ')} fill="none" stroke="#0B7A75" strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points={[last, ...pts.filter((p) => p.ahead)].map((p) => `${X(p.x)},${Y(p.v)}`).join(' ')} fill="none" stroke="#D62839" strokeWidth="2.5" strokeDasharray="5 4" />
      {past.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.v)} r="3" fill="#0B7A75" />)}
      <text x="8" y={H - 3} fontSize="10" fill="#5B6672">last week</text>
      <text x={X(0)} y={H - 3} fontSize="10" fill="#5B6672" textAnchor="middle">today</text>
      <text x={W - 8} y={H - 3} fontSize="10" fill="#A81C2B" textAnchor="end">next 3 days</text>
    </svg>
  );
}

// p: a person from live.js; k: only findings about this metric; open: show the reasons and chart.
export function Insights({ p, k, open = true }) {
  const ins = p.insights;
  if (!ins || !ins.items) return null;
  const items = ins.items.filter((i) => !k || i.k === k);
  if (!items.length) return null;
  return (
    <section aria-label="Early warning (AI)" style={s('display: flex; flex-direction: column; gap: 10px; padding: 16px; background: #FFFFFF; border-radius: 24px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
        <span style={s('display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; letter-spacing: 0.4px; color: #0B7A75')}><Spark />EARLY WARNING · AI</span>
        <span style={s('font-size: 11px; color: #5B6672')}>updated {ago(ins.at)}</span>
      </div>
      {items.map((i) => {
        const L = LEVEL[i.level];
        return (
          <div key={i.id} style={{ ...s('display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 16px'), background: L.bg, color: L.fg }}>
            <span style={s('font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase')}>{L.tag}</span>
            <span style={s('font-size: 15px; font-weight: 700; color: #14202B; line-height: 1.35')}>{i.title}</span>
            <span style={s('font-size: 13px; line-height: 1.5; color: #14202B')}>{i.text}</span>
            {open && i.forecast && <div style={s('background: #FFFFFF; border-radius: 12px; padding: 6px')}><Forecast f={i.forecast} /></div>}
            {open && i.why && i.why.length > 0 && <span style={s('font-size: 12px; line-height: 1.5')}>Why: {i.why.join(' · ')}</span>}
            {!k && i.k && <A to={'/p/' + p.id + '/r/' + i.k} style="font-size: 13px; font-weight: 600; color: #0B7A75">See readings</A>}
          </div>
        );
      })}
      <span style={s('font-size: 11px; line-height: 1.5; color: #5B6672')}>Learns {p.self ? 'your' : p.her} own normal from two weeks of readings. Decision support, not a diagnosis.</span>
    </section>
  );
}

// One short line for cards and the daily summary.
export function insightLine(p) {
  const i = p.insights && p.insights.items && p.insights.items[0];
  return i && i.level !== 'info' ? i : null;
}

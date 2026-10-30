// myDoc early warning: learns each person's own normal from their readings and spots
// trouble before it becomes an emergency. Runs on the watch (no cloud AI, no cost);
// the result is saved on the person's record (`insights`) for caregivers' phones.
//
//   1. Personal baseline: median and spread for each metric and time of day
//      (six slots, night to late evening) over the last 4–14 days.
//   2. Unusual reading: the latest reading is far from this person's normal for that time of
//      day, even though it is inside the general normal range.
//   3. Shift: the last 3 days run clearly higher (or lower) than this person's normal.
//   4. Trend and forecast: a robust line through the daily averages of the last week
//      (Theil–Sen); if it keeps going, when will it cross the normal range?
//   5. Context: missed doses in the same days are named as a likely reason.
// Each finding says why, in plain words. It is decision support, not a diagnosis.
import { METRICS, statusOf, dayKey } from '../health.js';

export const VERSION = 1;
const DAY = 86400000;
export const BUCKETS = [['night', 0, 6], ['early morning', 6, 9], ['morning', 9, 12], ['afternoon', 12, 16], ['evening', 16, 20], ['late evening', 20, 24]];
const bucketOf = (at) => { const h = new Date(at).getHours(); return BUCKETS.find(([, a, b]) => h >= a && h < b)[0]; };
// smallest spread we trust (meter noise), per metric
const FLOOR = { sugar: 6, bp: 4, hr: 3, o2: 0.7 };
const NAMES = { sugar: 'sugar', bp: 'blood pressure', hr: 'heart rate', o2: 'oxygen' };
const UNIT = { sugar: ' mg/dL', bp: ' mmHg', hr: ' bpm', o2: '%' };

const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (a) => { const m = median(a); return median(a.map((v) => Math.abs(v - m))); };
const spread = (a, k) => Math.max(1.4826 * mad(a), FLOOR[k]);
const round = (v, k) => (k === 'o2' ? Math.round(v * 10) / 10 : Math.round(v));

// Theil–Sen: the median of all pairwise slopes (ignores one-off spikes).
function theilSen(pts) {
  const slopes = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) slopes.push((pts[j].y - pts[i].y) / (pts[j].x - pts[i].x));
  const b = median(slopes), a = median(pts.map((p) => p.y - b * p.x));
  let up = 0, down = 0;
  for (const s of slopes) { if (s > 0) up++; else if (s < 0) down++; }
  return { a, b, agree: Math.max(up, down) / (slopes.length || 1) }; // agree: how consistently it moves one way
}

// Scheduled doses missed in the last `n` days (not today, which is still running).
export function missedDoses(doses, doselog, now, n = 3) {
  const sched = (doses || []).filter((d) => !d.need);
  let missed = 0;
  for (let i = 1; i <= n; i++) {
    const taken = doselog[dayKey(new Date(now - i * DAY))] || {};
    for (const d of sched) if (!taken[d.id]) missed++;
  }
  return missed;
}

// readings: [{ k, v, v2?, at }]; doses: the person's schedule; doselog: { 'YYYY-MM-DD': { doseId: 'HH:MM' } }
export function analyze({ readings, doses = [], doselog = {}, name = 'They', her = 'their', now = Date.now() }) {
  const items = [], baseline = {};
  const missed = missedDoses(doses, doselog, now);
  const because = missed ? `${missed} missed dose${missed > 1 ? 's' : ''} in the last 3 days` : '';
  let learning = false;
  for (const k of Object.keys(METRICS)) {
    const m = METRICS[k], rs = readings.filter((r) => r.k === k && r.at > now - 14 * DAY && r.at <= now).sort((a, b) => a.at - b.at);
    if (!rs.length) continue;
    const base = rs.filter((r) => r.at < now - 3 * DAY), recent = rs.filter((r) => r.at >= now - 3 * DAY);
    if (base.length < 8) { learning = true; continue; }
    // 1. baseline per time of day (falls back to the whole day when a slot has few readings)
    const all = base.map((r) => r.v), whole = { med: median(all), sd: spread(all, k), n: all.length };
    const slot = {};
    for (const [b] of BUCKETS) { const v = base.filter((r) => bucketOf(r.at) === b).map((r) => r.v); if (v.length >= 3) slot[b] = { med: median(v), sd: spread(v, k), n: v.length }; }
    const normOf = (at) => slot[bucketOf(at)] || whole;
    const adjSd = spread(base.map((r) => r.v - normOf(r.at).med), k); // day-to-day spread once the daily rhythm is removed
    baseline[k] = { usual: round(whole.med, k), range: [round(whole.med - 2 * whole.sd, k), round(whole.med + 2 * whole.sd, k)], slots: Object.fromEntries(Object.entries(slot).map(([b, x]) => [b, round(x.med, k)])) };
    const label = NAMES[k], Label = label[0].toUpperCase() + label.slice(1);

    // 4. trend over the last week (daily averages), with a forecast
    const byDay = {};
    for (const r of rs.filter((x) => x.at > now - 7 * DAY)) { const d = Math.floor((r.at - now) / DAY) + 1; (byDay[d] = byDay[d] || []).push(r.v - (normOf(r.at).med - whole.med)); } // time-of-day adjusted
    const pts = Object.entries(byDay).filter(([, v]) => v.length >= 2).map(([d, v]) => ({ x: Number(d), y: v.reduce((a, b) => a + b) / v.length }));
    let trendItem = null;
    if (pts.length >= 4) {
      const t = theilSen(pts), perDay = t.b, today = t.a; // fitted value now (x = 0)
      const weekly = Math.abs(perDay * 7) / whole.med;
      const rising = perDay > 0, limit = rising ? (m.noHigh ? null : m.hi) : m.lo;
      // forecast the time of day that runs highest (or lowest), e.g. sugar after meals
      const slots = Object.entries(slot).map(([b, x]) => ({ b, off: x.med - whole.med }));
      const edge = slots.length ? slots.reduce((a, c) => (rising ? (c.off > a.off ? c : a) : (c.off < a.off ? c : a))) : { b: '', off: 0 };
      const level = today + edge.off, inRange = statusOf(k, level) === 'Normal';
      const days = limit != null && inRange && perDay !== 0 ? (limit - level) / perDay : null;
      const forecast = [1, 2, 3].map((d) => round(today + perDay * d, k));
      if (t.agree >= 0.7 && weekly >= 0.08 && Math.abs(perDay * 6) >= 1.5 * adjSd) {
        const dir = rising ? 'rising' : 'falling', per = `${perDay > 0 ? '+' : '−'}${Math.abs(round(perDay, k))}${UNIT[k]} a day`;
        const soon = days != null && days > 0 && days <= 4.5;
        const word = rising ? 'high' : 'low', over = limit != null && !inRange; // already past the limit
        trendItem = {
          id: k + '-trend', k, level: soon || over ? 'warn' : 'watch',
          title: soon ? `${Label} ${dir}: likely ${word} within ${Math.max(1, Math.round(days))} day${Math.round(days) > 1 ? 's' : ''}` : over ? `${Label} ${dir} all week, now ${word}` : `${Label} ${dir} slowly`,
          text: `${Label} has been ${dir} this week (${per}).` + (soon ? ` At this rate ${her} ${edge.b ? edge.b + ' ' : ''}readings pass ${limit}${UNIT[k]} in about ${Math.max(1, Math.round(days))} day${Math.round(days) > 1 ? 's' : ''}.` : ''),
          why: [`Steady ${dir} trend over ${pts.length} days`, ...(because && (k === 'sugar' || k === 'bp') ? [because] : [])],
          forecast: { daily: pts.map((p) => ({ d: p.x, v: round(p.y + edge.off, k) })), next: forecast.map((v) => round(v + edge.off, k)), limit, slot: edge.b }
        };
        items.push(trendItem);
      }
    }

    // 2. unusual latest reading (inside the general range, but not normal for this person)
    const last = rs[rs.length - 1];
    if (!trendItem && last.at > now - 3 * 3600000 && statusOf(k, last.v) === 'Normal') {
      const nb = normOf(last.at), z = (last.v - nb.med) / nb.sd;
      if (Math.abs(z) >= 3 && !(k === 'o2' && z > 0)) items.push({ // high oxygen is never a worry
        id: k + '-unusual', k, level: 'watch', title: `Unusual ${label} for ${name}`,
        text: `${round(last.v, k)}${UNIT[k]} now; ${her} ${bucketOf(last.at)} ${label} is usually about ${round(nb.med, k)}${UNIT[k]}.`,
        why: ['Far from ' + her + ' own normal for this time of day, though inside the general range']
      });
    }

    // 3. shift: last 3 days compared with this person's normal for the same times of day
    if (!trendItem && recent.length >= 4) {
      const diffs = recent.map((r) => r.v - normOf(r.at).med), shift = diffs.reduce((a, b) => a + b) / diffs.length;
      const rel = shift / whole.med;
      if (Math.abs(rel) >= 0.12 && Math.abs(shift) / adjSd >= 1.5) {
        // name the time of day where it shows most
        let worst = null;
        for (const [b] of BUCKETS) {
          const d = recent.filter((r) => bucketOf(r.at) === b).map((r) => r.v - normOf(r.at).med);
          if (d.length >= 2) { const s = d.reduce((a, c) => a + c) / d.length; if (!worst || Math.abs(s) > Math.abs(worst.s)) worst = { b, s }; }
        }
        const pct = Math.round(Math.abs((worst ? worst.s : shift) / whole.med) * 100), dir = shift > 0 ? 'higher' : 'lower';
        items.push({
          id: k + '-shift', k, level: 'watch',
          title: `${worst ? worst.b[0].toUpperCase() + worst.b.slice(1) + ' ' + label : Label} ${pct}% ${dir} than usual`,
          text: `Over the last 3 days ${her} ${worst ? worst.b + ' ' : ''}${label} ran ${pct}% ${dir} than ${her} usual ${round(worst ? (slot[worst.b] || whole).med : whole.med, k)}${UNIT[k]}.`,
          why: ['Compared with ' + her + ' own readings at the same times of day', ...(because && (k === 'sugar' || k === 'bp') ? [because] : [])]
        });
      }
    }
  }
  const order = { warn: 0, watch: 1, info: 2, good: 3 };
  if (learning && !Object.keys(baseline).length) items.push({ id: 'learning', level: 'info', title: `Learning ${her} normal`, text: `Early warnings start after about 4 days of readings.`, why: [] });
  else if (!items.length && Object.keys(baseline).length) items.push({ id: 'steady', level: 'good', title: 'Steady this week', text: `Readings are within ${her} usual pattern. No worrying trends.`, why: [] });
  items.sort((a, b) => order[a.level] - order[b.level]);
  return { v: VERSION, at: now, items, baseline, missed };
}

// Doctor report: the numbers behind it (works on plain data, so it can be tested on its own).
// readings: [{ k, v, v2?, at, est? }]; doses: schedule; doselog: { day: { doseId: 'HH:MM' } };
// alerts: [{ type, title, sub, at }]
import { METRICS, ORDER, statusOf, dayKey, mins } from './health.js';
import { BUCKETS } from './ai/insights.js';

const DAY = 86400000;
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const slotOf = (at) => { const h = new Date(at).getHours(); return BUCKETS.find(([, a, b]) => h >= a && h < b)[0]; };

export function reportData({ readings, doses = [], doselog = {}, alerts = [], days = 14, now = Date.now() }) {
  const start = new Date(now - (days - 1) * DAY); start.setHours(0, 0, 0, 0);
  const from = start.getTime(), dayList = Array.from({ length: days }, (_, i) => new Date(from + i * DAY));
  const metrics = {};
  for (const k of ORDER) {
    const rs = readings.filter((r) => r.k === k && r.at >= from && r.at <= now).sort((a, b) => a.at - b.at);
    if (!rs.length) continue;
    const v = rs.map((r) => r.v), out = rs.filter((r) => statusOf(k, r.v) !== 'Normal');
    const daily = dayList.map((d) => {
      const x = rs.filter((r) => dayKey(new Date(r.at)) === dayKey(d));
      return x.length ? { day: d.getTime(), v: avg(x.map((r) => r.v)), v2: k === 'bp' ? avg(x.map((r) => r.v2 || 0)) : null } : null;
    });
    const slots = BUCKETS.map(([b]) => { const x = rs.filter((r) => slotOf(r.at) === b).map((r) => r.v); return x.length >= 3 ? { slot: b, v: avg(x) } : null; }).filter(Boolean);
    const hiSlot = slots.length > 1 ? slots.reduce((a, c) => (c.v > a.v ? c : a)) : null, loSlot = slots.length > 1 ? slots.reduce((a, c) => (c.v < a.v ? c : a)) : null;
    metrics[k] = {
      n: rs.length, avg: avg(v), min: Math.min(...v), max: Math.max(...v),
      avg2: k === 'bp' ? avg(rs.map((r) => r.v2 || 0)) : null,
      inRange: Math.round(((rs.length - out.length) / rs.length) * 100),
      high: out.filter((r) => r.v > METRICS[k].hi).length, low: out.filter((r) => r.v < METRICS[k].lo).length,
      est: rs.filter((r) => r.est).length, readings: rs, daily,
      pattern: hiSlot && loSlot && hiSlot.v - loSlot.v >= (k === 'o2' ? 1.5 : k === 'hr' ? 5 : 8) ? { hi: hiSlot, lo: loSlot } : null
    };
  }
  // medicine: scheduled doses each full day (today only up to now), on time = within 60 minutes
  const sched = doses.filter((d) => !d.need);
  let due = 0, taken = 0, onTime = 0;
  const missed = [];
  for (const d of dayList) {
    const log = doselog[dayKey(d)] || {}, today = dayKey(d) === dayKey(new Date(now));
    for (const x of sched) {
      if (today && mins(x.time) > new Date(now).getHours() * 60 + new Date(now).getMinutes()) continue;
      due++;
      if (log[x.id]) { taken++; if (Math.abs(mins(log[x.id]) - mins(x.time)) <= 60) onTime++; } else missed.push({ day: d.getTime(), name: x.name, time: x.time });
    }
  }
  const events = alerts.filter((a) => a.at >= from && a.at <= now).sort((a, b) => a.at - b.at);
  return { from, to: now, days, dayList: dayList.map((d) => d.getTime()), metrics, meds: { due, taken, onTime, missed, list: sched }, events };
}

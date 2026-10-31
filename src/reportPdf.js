// Doctor report as a PDF (A4), made on the phone. jsPDF is loaded only when a report is made.
// Charts are drawn as vector graphics: every reading as a dot, the daily average as a line,
// the normal range as a shaded band.
import { METRICS, ORDER, statusOf } from './health.js';

const TEAL = [11, 122, 117], TEAL_TINT = [227, 245, 243], RED = [214, 40, 57], INK = [20, 32, 43], MUTED = [91, 102, 114], LINE = [228, 232, 236], NAVY = [47, 74, 138], AMBER = [138, 83, 0];
const W = 210, M = 16; // page width and margin (mm)
// The built-in PDF fonts can't show a few symbols; use plain ones.
const clean = (t) => String(t).replace(/−/g, '-').replace(/≈/g, '~').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');
const dateOf = (t, o = { day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('en-GB', o);
const timeOf = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export async function makeReport({ person: p, data, insights, carer, unit = 'mg' }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mmol = unit === 'mmol';
  const val = (k, v) => (k === 'sugar' && mmol ? (v / 18).toFixed(1) : k === 'o2' ? Math.round(v * 10) / 10 : Math.round(v));
  const unitOf = (k) => (k === 'sugar' ? (mmol ? 'mmol/L' : 'mg/dL') : k === 'bp' ? 'mmHg' : k === 'hr' ? 'bpm' : '%');
  const titleOf = (k) => METRICS[k].title;
  let y = 0;
  const color = (c) => doc.setTextColor(...c);
  const font = (size, style = 'normal', c = INK) => { doc.setFont('helvetica', style); doc.setFontSize(size); color(c); };
  const write = (t, x, yy, opts) => doc.text(clean(t), x, yy, opts);
  const para = (t, size = 9.5, c = INK, indent = 0, gap = 4.4) => { font(size, 'normal', c); for (const l of doc.splitTextToSize(clean(t), W - 2 * M - indent)) { room(gap); write(l, M + indent, y); y += gap; } };
  const room = (h) => { if (y + h > 280) { doc.addPage(); y = 18; } };
  const heading = (t) => { room(14); y += 4; font(12, 'bold', TEAL); write(t, M, y); y += 2; doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5; };

  // ---- header -------------------------------------------------------------------------
  doc.setFillColor(...TEAL); doc.rect(0, 0, W, 24, 'F');
  font(20, 'bold', [255, 255, 255]); write('myDoc', M, 15);
  font(11, 'normal', [255, 255, 255]); write('Health report for the doctor', W - M, 11, { align: 'right' }); write(`${dateOf(data.from)} – ${dateOf(data.to, { day: 'numeric', month: 'short', year: 'numeric' })} · ${data.days} days`, W - M, 17, { align: 'right' });
  y = 34;
  font(17, 'bold'); write(p.name, M, y); y += 6;
  para(`${p.conds.length ? 'Conditions: ' + p.conds.join(', ') + '. ' : ''}Made on ${dateOf(Date.now(), { day: 'numeric', month: 'long', year: 'numeric' })} by ${carer} (caregiver) from the readings of ${p.self ? 'their' : p.her} myDoc watch.`, 9.5, MUTED);

  // ---- at a glance ------------------------------------------------------------------------
  const lines = [];
  for (const k of ORDER) {
    const s = data.metrics[k];
    if (!s) continue;
    const avgTxt = k === 'bp' ? `${Math.round(s.avg)}/${Math.round(s.avg2)}` : val(k, s.avg);
    lines.push([titleOf(k), `average ${avgTxt} ${unitOf(k)}, ${s.inRange}% of readings in the normal range` + (s.high || s.low ? ` (${[s.high ? s.high + ' high' : '', s.low ? s.low + ' low' : ''].filter(Boolean).join(', ')})` : '')]);
  }
  const md = data.meds;
  if (md.due) lines.push(['Medicine', `${Math.round((md.taken / md.due) * 100)}% of doses taken (${md.taken} of ${md.due}), ${md.onTime} on time; ${md.missed.length} missed`]);
  const sos = data.events.filter((e) => e.type === 'sos').length;
  lines.push(['Alerts', `${data.events.length} in this period${sos ? `, including ${sos} SOS` : ''}`]);
  const ai = ((insights && insights.items) || []).filter((i) => i.level === 'warn' || i.level === 'watch');
  const boxH = 10 + lines.length * 5.2 + (ai.length ? 6 + ai.length * 9.5 : 0);
  doc.setFillColor(245, 247, 248); doc.roundedRect(M, y + 1, W - 2 * M, boxH, 3, 3, 'F');
  y += 8; font(11, 'bold'); write('At a glance', M + 5, y); y += 6;
  for (const [a, b] of lines) { font(9.5, 'bold'); write(a + ':', M + 5, y); font(9.5); write(doc.splitTextToSize(clean(b), W - 2 * M - 42)[0], M + 38, y); y += 5.2; }
  if (ai.length) {
    y += 1.5; font(9.5, 'bold', AMBER); write('AI early warning (decision support, not a diagnosis):', M + 5, y); y += 4.8;
    for (const i of ai) { const t = doc.splitTextToSize(clean(`${i.title}. ${i.text}`), W - 2 * M - 14).slice(0, 2); font(9, 'normal'); t.forEach((l, j) => write((j ? '   ' : '• ') + l, M + 7, y + j * 4.2)); y += 9.5; }
  }
  y += 4;

  // ---- a chart per vital ------------------------------------------------------------------------
  const chart = (k, s, x0, y0, w, h) => {
    const m = METRICS[k], from = data.from, to = from + data.days * 86400000;
    const vals = s.readings.flatMap((r) => (k === 'bp' ? [r.v, r.v2 || r.v] : [r.v]));
    let lo = Math.min(...vals, m.lo), hi = Math.max(...vals, m.noHigh ? 100 : m.hi);
    if (k === 'o2') { lo = Math.min(lo, 91); hi = 100; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += k === 'o2' ? 0.5 : pad;
    const X = (t) => x0 + 12 + ((t - from) / (to - from)) * (w - 14), Y = (v) => y0 + h - 7 - ((v - lo) / (hi - lo)) * (h - 9);
    // normal band
    const bandTop = m.noHigh ? hi : m.hi, bandLo = m.lo;
    doc.setFillColor(...TEAL_TINT); doc.rect(X(from), Y(bandTop), X(to) - X(from), Y(bandLo) - Y(bandTop), 'F');
    // grid and labels
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); font(7, 'normal', MUTED);
    const step = [5, 10, 20, 25, 50].find((st) => (hi - lo) / st <= 6) || 50;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { doc.line(X(from), Y(v), X(to), Y(v)); write(String(val(k, v)), x0 + 10, Y(v) + 1, { align: 'right' }); }
    data.dayList.forEach((d, i) => { if (i % 2 === 0) write(dateOf(d, { weekday: 'short', day: 'numeric' }), X(d + 43200000), y0 + h - 2, { align: 'center' }); });
    // limits for blood pressure's lower number
    if (k === 'bp') { doc.setDrawColor(...NAVY); doc.setLineDashPattern([1, 1], 0); doc.line(X(from), Y(90), X(to), Y(90)); doc.setLineDashPattern([], 0); }
    // daily averages
    const line = (key, c, dashed) => {
      const pts = s.daily.filter(Boolean).map((d) => [X(d.day + 43200000), Y(d[key])]);
      doc.setDrawColor(...c); doc.setLineWidth(0.6); if (dashed) doc.setLineDashPattern([1.2, 0.8], 0);
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      doc.setLineDashPattern([], 0);
    };
    // every reading
    for (const r of s.readings) {
      const bad = statusOf(k, r.v) !== 'Normal';
      doc.setDrawColor(...(bad ? RED : TEAL)); doc.setFillColor(...(bad ? RED : TEAL)); doc.setLineWidth(0.25);
      doc.circle(X(r.at), Y(r.v), 0.55, r.est ? 'S' : 'F');
      if (k === 'bp' && r.v2) { doc.setFillColor(...(r.v2 >= 90 ? RED : NAVY)); doc.circle(X(r.at), Y(r.v2), 0.45, 'F'); }
    }
    line('v', TEAL);
    if (k === 'bp') line('v2', NAVY, true);
  };

  for (const k of ORDER) {
    const s = data.metrics[k];
    if (!s) continue;
    room(64);
    heading(titleOf(k));
    const range = k === 'bp' ? `${Math.round(s.min)}–${Math.round(s.max)} (top number)` : `${val(k, s.min)}–${val(k, s.max)}`;
    para(`${s.n} readings · average ${k === 'bp' ? Math.round(s.avg) + '/' + Math.round(s.avg2) : val(k, s.avg)} ${unitOf(k)} · range ${range} · ${s.inRange}% in the normal range (${clean(METRICS[k].normText)}).` +
      (s.pattern ? ` Highest in the ${s.pattern.hi.slot} (about ${val(k, s.pattern.hi.v)}), lowest in the ${s.pattern.lo.slot} (about ${val(k, s.pattern.lo.v)}).` : ''), 9, INK);
    if (s.est) para(`${s.est} of these are estimates from the experimental optical sensor (open dots), not finger-prick readings.`, 8.5, AMBER);
    room(48);
    chart(k, s, M, y, W - 2 * M, 44);
    y += 46;
    para(k === 'bp' ? 'Dots: each reading (top number teal, lower number blue; red = out of range). Lines: daily averages. Shaded: normal range for the top number; dotted: 90 limit for the lower number.' : 'Dots: each reading (red = out of range; open = optical estimate). Line: daily average. Shaded: normal range.', 7, MUTED, 0, 3.2); y += 1.5;
  }

  // ---- medicine -------------------------------------------------------------------------
  heading('Medicine');
  if (!md.list.length) para('No regular medicine was set up in myDoc.', 9.5, MUTED);
  else {
    para(`Schedule: ${md.list.map((d) => `${d.name}${d.how ? ' (' + d.how + ')' : ''} at ${d.time}`).join('; ')}.`, 9.5);
    para(`${md.taken} of ${md.due} doses taken (${md.due ? Math.round((md.taken / md.due) * 100) : 0}%), ${md.onTime} within an hour of the set time.`, 9.5);
    if (md.missed.length) { y += 1; font(9, 'bold'); room(5); write('Missed doses', M, y); y += 4.5; para(md.missed.slice(-24).map((x) => `${dateOf(x.day, { weekday: 'short', day: 'numeric', month: 'short' })} ${x.time} ${x.name}`).join(' · ') + (md.missed.length > 24 ? ` · and ${md.missed.length - 24} more` : ''), 8.5, INK); }
  }

  // ---- alerts -------------------------------------------------------------------------
  heading('Alerts in this period');
  if (!data.events.length) para('None.', 9.5, MUTED);
  for (const e of data.events.slice(-30)) {
    room(5);
    font(8.5, 'bold', e.type === 'sos' ? RED : INK); write(`${dateOf(e.at, { weekday: 'short', day: 'numeric', month: 'short' })} ${timeOf(e.at)}`, M, y);
    const t = doc.splitTextToSize(clean(`${e.title}${e.sub ? ' – ' + e.sub.replace(p.name + ' · ', '') : ''}`), W - 2 * M - 34).slice(0, 3);
    font(8.5, 'normal'); t.forEach((l, j) => write(l, M + 32, y + j * 3.9)); y += 4.6 + (t.length - 1) * 3.9;
  }
  if (data.events.length > 30) para(`and ${data.events.length - 30} earlier alerts.`, 8.5, MUTED);

  // ---- notes --------------------------------------------------------------------------------
  heading('About this report');
  para('Readings come from the patient\'s myDoc watch and are shown as recorded. Normal ranges are general adult ranges; the doctor should judge them for this patient. AI early warnings compare the patient with their own usual readings and are decision support, not a diagnosis.', 8.5, MUTED);
  para('Questions: mydoc.health.team@gmail.com', 8.5, MUTED);

  // footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(7.5, 'normal', MUTED);
    write(`myDoc health report · ${p.name} · ${dateOf(data.from)} – ${dateOf(data.to, { day: 'numeric', month: 'short', year: 'numeric' })}`, M, 290);
    write(`Page ${i} of ${pages}`, W - M, 290, { align: 'right' });
  }
  return doc.output('blob');
}

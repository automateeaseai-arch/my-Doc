// The simulated watch: pairs with a caregiver, sends readings, logs doses, SOS.
// It writes exactly what a real watch app would write, so the phone app can't tell the difference.
import * as be from '../backend/index.js';
import { METRICS, statusOf, showValue, dayKey, daysBack, clock, mins, nowMins } from '../health.js';

const KEY = 'mydoc.watch';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* blocked */ } };

export const PROFILES = {
  diabetes: { label: 'Diabetes + blood pressure', metrics: ['sugar', 'bp', 'hr', 'o2'] },
  bp: { label: 'Blood pressure', metrics: ['bp', 'hr', 'o2'] },
  heart: { label: 'Heart rate and oxygen only', metrics: ['hr', 'o2'] }
};
export const PLACES = [
  { address: '12 Allen Avenue, Ikeja, Lagos', short: '12 Allen Ave, Ikeja', lat: 6.6018, lng: 3.3515 },
  { address: '4 Adeola Odeku Street, Victoria Island, Lagos', short: '4 Adeola Odeku St, VI', lat: 6.4311, lng: 3.4158 },
  { address: '9 Bode Thomas Street, Surulere, Lagos', short: '9 Bode Thomas St, Surulere', lat: 6.4918, lng: 3.3561 },
  { address: 'Ikeja City Mall, Obafemi Awolowo Way, Lagos', short: 'Ikeja City Mall', lat: 6.6142, lng: 3.3576 },
  { address: '21 Aminu Kano Crescent, Wuse 2, Abuja', short: '21 Aminu Kano Cres, Wuse 2', lat: 9.0817, lng: 7.4710 }
];

// Normal resting values with a little daily rhythm.
const rnd = (a, b) => a + Math.random() * (b - a);
export const normal = (k) => {
  const h = new Date().getHours(), meal = [8, 9, 13, 14, 19, 20].includes(h);
  if (k === 'sugar') return { v: Math.round(meal ? rnd(115, 138) : rnd(88, 118)) };
  if (k === 'bp') { const s = Math.round(rnd(116, 134)); return { v: s, v2: Math.round(s * rnd(0.62, 0.68)) }; }
  if (k === 'hr') return { v: Math.round(rnd(64, 86)) };
  return { v: Math.round(rnd(95, 99)) };
};
export const SCENARIOS = {
  sugarHigh: { label: 'Sugar high', k: 'sugar', r: () => ({ v: Math.round(rnd(205, 240)) }) },
  sugarLow: { label: 'Sugar low', k: 'sugar', r: () => ({ v: Math.round(rnd(52, 64)) }) },
  bpHigh: { label: 'BP high', k: 'bp', r: () => ({ v: Math.round(rnd(160, 175)), v2: Math.round(rnd(98, 108)) }) },
  hrFast: { label: 'Fast heart', k: 'hr', r: () => ({ v: Math.round(rnd(122, 138)) }) },
  o2Low: { label: 'Low oxygen', k: 'o2', r: () => ({ v: Math.round(rnd(88, 91)) }) }
};

// ---- state shared with the UI -------------------------------------------------

let st = { ready: false, uid: null, code: null, pid: null, patient: null, today: {}, linked: false, lost: false, ...load() };
const subs = new Set();
const set = (patch) => { st = { ...st, ...patch }; save({ code: st.code, pid: st.pid, setup: st.setup, profile: st.profile, auto: st.auto, place: st.place, battery: st.battery, theme: st.theme }); subs.forEach((f) => f(st)); };
export const getSim = () => st;
export const onSim = (f) => { subs.add(f); return () => subs.delete(f); };
export const setOption = (patch) => set(patch);

let stops = [];
const stop = () => { stops.forEach((f) => f()); stops = []; };

export async function startSim() {
  await be.start('watch');
  if (st.profile == null) set({ profile: 'diabetes', auto: true, place: 0, battery: 86, theme: 'light' });
  be.onAuth(async (u) => {
    if (!u) { await be.signInAnon(); return; }
    set({ uid: u.uid, ready: true });
    if (st.pid) follow(); else if (st.setup && st.setup.done) newCode();
  });
  setInterval(tick, 60000);
  setInterval(checkDoses, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

async function newCode() {
  stop();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await be.setDoc('codes/' + code, { watchUid: st.uid, createdAt: Date.now(), battery: st.battery, setup: { self: true, conds: st.setup.conds } });
  set({ code, pid: null, patient: null, linked: false, lost: false });
  stops.push(be.watchDoc('codes/' + code, (c) => {
    if (c && c.pid) { set({ pid: c.pid, linked: true }); be.deleteDoc('codes/' + code).catch(() => {}); follow(true); }
  }));
}

function follow(justLinked) {
  stop();
  stops.push(be.watchDoc('patients/' + st.pid, async (p) => {
    if (!p || p.watchUid !== st.uid) { set({ patient: null, lost: true }); return; }
    set({ patient: p, lost: false });
    if (justLinked) { justLinked = false; await setPlace(st.place || 0); if (!p.recent) await backfill(p); else tick(); }
  }));
  stops.push(be.watchDoc(`patients/${st.pid}/doselog/${dayKey()}`, (d) => set({ today: (d && d.taken) || {} })));
}

// First-time setup on the watch (designs: who wears it, then myself + conditions).
export async function finishSetup(conds) {
  set({ setup: { done: true, self: true, conds } });
  await newCode();
}
export function resetWatch() {
  if (st.pid && st.patient) be.updateDoc('patients/' + st.pid, { watchUid: null }).catch(() => {});
  stop();
  set({ setup: null, code: null, pid: null, patient: null, linked: false, lost: false, seenLinked: false });
}

export async function unlink() {
  if (st.pid && st.patient) await be.updateDoc('patients/' + st.pid, { watchUid: null }).catch(() => {});
  set({ pid: null, patient: null, linked: false });
  newCode();
}

// ---- writing data ----------------------------------------------------------------

const path = () => 'patients/' + st.pid;
const metrics = () => PROFILES[st.profile || 'diabetes'].metrics;
const alerted = {}; // metric -> time of last alert, so a long spike alerts once

export async function sendReading(k, r) {
  const p = st.patient;
  if (!p) return;
  const at = Date.now(), reading = { v: r.v, ...(r.v2 != null ? { v2: r.v2 } : {}), at };
  const day = dayKey(), days = { ...(p.days || {}) };
  const agg = { ...((days[day] || {})[k] || { s: 0, n: 0 }) };
  agg.s += r.v; agg.n += 1;
  days[day] = { ...(days[day] || {}), [k]: agg };
  for (const d of Object.keys(days)) if (d < dayKey(daysBack(10))) delete days[d];
  const recent = { ...(p.recent || {}), [k]: [reading, ...(((p.recent || {})[k]) || [])].slice(0, 5) };
  st.patient = { ...p, recent, days };
  await be.addDoc(path() + '/readings', { k, ...reading });
  await be.updateDoc(path(), { recent, days, watchInfo: { battery: st.battery, lastSeen: at } });
  const s = statusOf(k, r.v);
  if (s !== 'Normal' && at - (alerted[k] || 0) > 30 * 60 * 1000) {
    alerted[k] = at;
    const m = METRICS[k];
    await be.addDoc(path() + '/alerts', {
      kind: 'danger', type: 'reading', k, at, read: false,
      title: (m.label || m.title) + ' is ' + s.toLowerCase(),
      sub: `${p.name} · ${showValue(k, reading)} ${k === 'o2' ? '%' : m.unit}`
    });
    set({ attention: k });
  } else if (s === 'Normal') { alerted[k] = 0; if (st.attention === k) set({ attention: null }); }
}

export async function sendNormal() { for (const k of metrics()) await sendReading(k, normal(k)); }
export async function runScenario(id) { const sc = SCENARIOS[id]; await sendReading(sc.k, sc.r()); }

let ticks = 0;
async function tick() {
  if (!st.patient || !st.auto || document.hidden) return;
  ticks++;
  for (const k of metrics()) if (k === 'hr' || ticks % 5 === 1) await sendReading(k, normal(k));
}

export async function setPlace(i) {
  set({ place: i });
  if (!st.pid) return;
  const pl = PLACES[i];
  await be.updateDoc(path(), { loc: { ...pl, at: Date.now() } });
}
export async function setBattery(b) {
  set({ battery: b });
  if (st.pid) await be.updateDoc(path(), { watchInfo: { battery: b, lastSeen: Date.now() } });
}

// A week of history so the charts aren't empty on day one (marked as simulated).
async function backfill(p) {
  const days = {}, recent = {};
  for (let n = 6; n >= 1; n--) {
    const key = dayKey(daysBack(n));
    days[key] = {};
    for (const k of metrics()) {
      let s = 0;
      for (let j = 0; j < 4; j++) s += normal(k).v;
      days[key][k] = { s, n: 4 };
    }
  }
  st.patient = { ...p, days, recent };
  await be.updateDoc(path(), { days, recent, simulatedHistory: true });
  await sendNormal();
}

export async function takeDose(dose) {
  const day = dayKey();
  await be.setDoc(`${path()}/doselog/${day}`, { day, taken: { [dose.id]: clock() }, by: { [dose.id]: 'watch' } }, { merge: true });
}

export async function sendSOS() {
  const p = st.patient, pl = PLACES[st.place || 0], at = Date.now();
  await be.updateDoc(path(), { sos: { active: true, at, address: pl.address } });
  await be.addDoc(path() + '/alerts', { kind: 'danger', type: 'sos', at, read: false, title: 'SOS from ' + p.name, sub: pl.short + ' · pressed on ' + (p.self ? 'your' : 'their') + ' watch' });
}

export const clearPing = () => be.updateDoc(path(), { ping: null });

// Dose reminders on the watch, and a "missed dose" alert 30 minutes after.
let doseListener = null;
export const onDoseDue = (f) => { doseListener = f; };
const missedSent = {};
function checkDoses() {
  const p = st.patient;
  if (!p) return;
  const now = nowMins(), day = dayKey();
  for (const d of p.doses || []) {
    if (d.need || st.today[d.id]) continue;
    const late = now - mins(d.time);
    if (late >= 0 && late < 1 && doseListener) doseListener(d);
    const key = day + d.id;
    if (late >= 30 && late < 90 && !missedSent[key]) {
      missedSent[key] = true;
      be.addDoc(path() + '/alerts', { kind: 'warn', type: 'dose', at: Date.now(), read: false, title: 'Missed dose', sub: `${p.name} · ${d.name} at ${d.time}` });
    }
  }
}

// The simulated watch: sets up its wearer, pairs with caregivers, sends readings, logs doses, SOS.
// It writes exactly what a real watch app would write, so the phone app can't tell the difference.
import * as be from '../backend/index.js';
import { METRICS, statusOf, showValue, dayKey, daysBack, clock, mins, nowMins, initials } from '../health.js';
import { startLive } from '../live.js';
import { opticalSugar } from '../sensor/onwatch.js';
import { sendPush } from '../push.js';

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
const set = (patch) => { st = { ...st, ...patch }; save({ pid: st.pid, recovery: st.recovery, carer: st.carer, setup: st.setup, profile: st.profile, auto: st.auto, optical: st.optical, place: st.place, battery: st.battery, theme: st.theme }); subs.forEach((f) => f(st)); };
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
    if (st.carer) startCarer(); else if (st.pid) follow();
  });
  setInterval(tick, 60000);
  setInterval(checkDoses, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

const newCodeNumber = () => String(Math.floor(100000 + Math.random() * 900000));

// ---- patient watch ------------------------------------------------------------------

// Setup creates the patient's own record; the watch works on its own from here.
// Caregivers join later, when the patient pairs from Settings and accepts them.
export async function finishSetup({ name, conds, contacts }) {
  const pid = be.newId();
  await be.setDoc('patients/' + pid, {
    name, ini: initials(name), self: false, conds, contacts, autoAlert: true, phone: '', pronoun: '',
    carers: [], carerNames: {}, carerGroups: {}, ownerUid: st.uid, watchUid: st.uid,
    doses: [], created: Date.now(), watchInfo: { battery: st.battery, lastSeen: Date.now() }
  });
  set({ setup: { done: true, role: 'patient' }, pid });
  follow(true);
  await makeRecovery(name);
}

// ---- recovery code (for a patient with no caregiver to move them to a new watch) -----------
// 8 letters/digits the patient writes down. Only a hash is stored (recovery/{hash}); typing the
// code on a new watch proves it is them (see firestore.rules).
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const cleanCode = (c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
const recoveryKey = async (code) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mydoc-recovery:' + cleanCode(code)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
export async function makeRecovery(name) {
  const r = crypto.getRandomValues(new Uint8Array(8));
  const code = [...r].map((b) => LETTERS[b % LETTERS.length]).join('');
  await be.setDoc('recovery/' + (await recoveryKey(code)), { pid: st.pid, watchUid: st.uid, name: name || (st.patient && st.patient.name) || '', createdAt: Date.now() });
  set({ recovery: code, showRecovery: true });
}
export const showCode = (c) => (c ? c.slice(0, 4) + '-' + c.slice(4) : '');
// New watch: move the person here with their recovery code. Returns '' or an error message.
export async function recoverWithCode(code) {
  if (cleanCode(code).length !== 8) return 'The code has 8 letters and numbers';
  const key = await recoveryKey(code);
  const r = await be.getDoc('recovery/' + key).catch(() => null);
  if (!r || !r.pid) return 'Code not found. Check it and try again';
  stopPairing();
  try {
    await be.updateDoc('patients/' + r.pid, { watchUid: st.uid, recoverKey: key, watchInfo: { battery: st.battery, lastSeen: Date.now() } });
  } catch { return 'Could not move your record. Check the connection'; }
  set({ pid: r.pid, recovery: cleanCode(code), setup: { done: true, role: 'patient' }, welcomeBack: r.name || 'You' });
  follow(true);
  return '';
}

// Settings › Delete my data: erases the person's record and history for good.
export async function deleteMyData() {
  const pid = st.pid;
  if (!pid) return;
  stop(); stopPairing();
  for (const sub of ['readings', 'alerts', 'doselog', 'push']) {
    for (;;) {
      const docs = await be.getCol(`patients/${pid}/${sub}`, { limit: 200 }).catch(() => []);
      if (!docs.length) break;
      await Promise.all(docs.map((d) => be.deleteDoc(`patients/${pid}/${sub}/${d.id}`).catch(() => {})));
      if (docs.length < 200) break;
    }
  }
  if (st.recovery) await be.deleteDoc('recovery/' + (await recoveryKey(st.recovery))).catch(() => {});
  await be.deleteDoc('patients/' + pid);
  set({ recovery: null });
  resetWatch();
}

function follow(fresh) {
  stop();
  stops.push(be.watchDoc('patients/' + st.pid, async (p) => {
    // Online, a replaced watch can no longer read the record at all (p is null).
    if (!p || p.watchUid !== st.uid) { set({ patient: null, lost: true, replaced: !!(p && p.watchUid) || !!st.patient || st.replaced }); return; }
    set({ patient: p, lost: false });
    if (fresh) { fresh = false; await setPlace(st.place || 0); if (!p.recent) await backfill(p); else tick(); }
  }));
  stops.push(be.watchDoc(`patients/${st.pid}/doselog/${dayKey()}`, (d) => set({ today: (d && d.taken) || {} })));
}

// Settings › Pair with a caregiver: show a code and wait for someone to type it.
let codeStop = null;
export async function startPairing() {
  stopPairing();
  const code = newCodeNumber();
  await be.setDoc('codes/' + code, { watchUid: st.uid, pid: st.pid, role: 'patient', name: st.patient ? st.patient.name : '', createdAt: Date.now() });
  set({ code, request: null });
  codeStop = be.watchDoc('codes/' + code, (c) => { if (c && c.request && !c.status) set({ request: c.request }); });
}
export function stopPairing() {
  if (codeStop) codeStop();
  codeStop = null;
  if (st.code) be.deleteDoc('codes/' + st.code).catch(() => {});
  set({ code: null, request: null });
}
// "Allow Chinedu to see your health?" Yes adds the caregiver (and their own watch).
export async function answerRequest(yes) {
  const r = st.request, code = st.code, p = st.patient;
  if (!r || !p) return;
  if (yes) {
    const group = [...new Set([r.carerUid, ...(r.carers || [])])];
    await be.updateDoc('patients/' + st.pid, {
      carers: [...new Set([...(p.carers || []), ...group])],
      carerNames: { ...(p.carerNames || {}), [r.carerUid]: r.carerName },
      carerGroups: { ...(p.carerGroups || {}), [r.carerUid]: group }
    });
  }
  await be.updateDoc('codes/' + code, { status: yes ? 'accepted' : 'declined' });
  if (codeStop) codeStop();
  codeStop = null;
  setTimeout(() => be.deleteDoc('codes/' + code).catch(() => {}), 5000);
  set({ code: null, request: null });
}
// Settings › My caregivers › Remove.
export async function removeCarer(uid) {
  const p = st.patient, group = ((p.carerGroups || {})[uid]) || [uid];
  const names = { ...(p.carerNames || {}) }, groups = { ...(p.carerGroups || {}) };
  delete names[uid]; delete groups[uid];
  await be.updateDoc('patients/' + st.pid, { carers: (p.carers || []).filter((x) => !group.includes(x)), carerNames: names, carerGroups: groups });
}

// ---- caregiver watch ------------------------------------------------------------------

// A replacement watch: shows a code; a caregiver moves the person (and their history) onto it.
export async function startReplace() {
  stopPairing();
  const code = newCodeNumber();
  await be.setDoc('codes/' + code, { watchUid: st.uid, role: 'replace', createdAt: Date.now() });
  set({ code });
  codeStop = be.watchDoc('codes/' + code, (c) => {
    if (c && c.pid) {
      if (codeStop) codeStop();
      codeStop = null;
      be.deleteDoc('codes/' + code).catch(() => {});
      set({ code: null, pid: c.pid, setup: { done: true, role: 'patient' }, welcomeBack: c.personName || '' });
      follow(true);
    }
  });
}

export function finishCarerSetup() { set({ setup: { done: true, role: 'carer' } }); }

// Settings › Link to my phone: a code the caregiver types on their phone.
export async function startCarerLink() {
  stopPairing();
  const code = newCodeNumber();
  await be.setDoc('codes/' + code, { watchUid: st.uid, role: 'carer', createdAt: Date.now() });
  set({ code });
  codeStop = be.watchDoc('codes/' + code, (c) => {
    if (c && c.carerUid) {
      if (codeStop) codeStop();
      codeStop = null;
      be.deleteDoc('codes/' + code).catch(() => {});
      set({ code: null, carer: { uid: c.carerUid, name: c.carerName, carers: [...new Set([...(c.carers || []), st.uid])] }, linked: true });
      startCarer();
    }
  });
}

// The caregiver watch shows the same live data as the caregiver's phone (see live.js).
let carerStarted = false;
function startCarer() {
  stop();
  if (carerStarted) return;
  carerStarted = true;
  startLive({ asCarer: st.carer });
}

// Simulator only: forget this watch and start setup again.
export function resetWatch() {
  stop(); stopPairing();
  set({ setup: null, code: null, pid: null, recovery: null, showRecovery: false, carer: null, patient: null, request: null, linked: false, lost: false, replaced: false, welcomeBack: '', seenLinked: false });
  if (carerStarted) location.reload(); // drop the caregiver's live data
}

// ---- writing data ----------------------------------------------------------------

const path = () => 'patients/' + st.pid;
const metrics = () => PROFILES[st.profile || 'diabetes'].metrics;
const alerted = {}; // metric -> time of last alert, so a long spike alerts once

// Save an alert for the caregivers and push it to their phones (even when myDoc is closed).
async function raise(a) {
  const id = await be.addDoc(path() + '/alerts', a);
  // same tag as the app uses, so an open app and the push don't show it twice
  sendPush(st.pid, { type: a.type, title: a.title, body: a.sub, tag: st.pid + id, urgent: a.type === 'sos', url: a.type === 'sos' ? `./#/p/${st.pid}/locate` : './#/alerts' });
}

export async function sendReading(k, r) {
  const p = st.patient;
  if (!p) return;
  // Optical sensor mode: the sugar value is what the sensor engine estimates from
  // simulated light readings (r.v is the true value it is measuring).
  if (k === 'sugar' && st.optical) { r = opticalSugar(st.pid, r.v); if (!r) return; }
  const at = Date.now(), reading = { v: r.v, ...(r.v2 != null ? { v2: r.v2 } : {}), ...(r.est ? { est: r.est } : {}), at };
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
    await raise({
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
  await raise({ kind: 'danger', type: 'sos', at, read: false, title: 'SOS from ' + p.name, sub: pl.short + ' · pressed on ' + (p.self ? 'your' : 'their') + ' watch' });
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
      raise({ kind: 'warn', type: 'dose', at: Date.now(), read: false, title: 'Missed dose', sub: `${p.name} · ${d.name} at ${d.time}` });
    }
  }
}

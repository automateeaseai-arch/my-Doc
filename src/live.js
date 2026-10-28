// Live data for the phone app: the signed-in caregiver, the people they look
// after, today's doses and alerts. Screens read it with useLive().
import { useEffect, useState } from 'react';
import * as be from './backend/index.js';
import { METRICS, ORDER, AVATARS, statusOf, showValue, doseStatus, dayKey, daysBack, when, initials } from './health.js';

let state = { ready: false, user: null, profile: null, raw: [], logs: {}, alerts: {} };
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; derived = null; subs.forEach((f) => f()); };
let derived = null;

let stopAll = [];
const perPatient = new Map(); // pid -> unsubscribe functions

export function startLive() {
  be.onAuth((user) => {
    stopAll.forEach((f) => f()); stopAll = [];
    perPatient.forEach((fs) => fs.forEach((f) => f())); perPatient.clear();
    set({ user, profile: null, raw: [], logs: {}, alerts: {}, ready: !user });
    if (!user || user.anon) return;
    const loaded = { people: false, profile: false };
    const done = () => loaded.people && loaded.profile;
    stopAll.push(be.watchDoc('users/' + user.uid, (d) => { loaded.profile = true; set({ profile: d || {}, ready: done() }); }));
    stopAll.push(be.watchCol('patients', { where: ['carers', 'array-contains', user.uid] }, (rows) => {
      rows.sort((a, b) => (a.created || 0) - (b.created || 0));
      for (const p of rows) {
        if (perPatient.has(p.id)) continue;
        perPatient.set(p.id, [
          be.watchCol(`patients/${p.id}/doselog`, { orderBy: ['day', 'desc'], limit: 8 }, (docs) => set({ logs: { ...state.logs, [p.id]: Object.fromEntries(docs.map((d) => [d.day, d.taken || {}])) } })),
          be.watchCol(`patients/${p.id}/alerts`, { orderBy: ['at', 'desc'], limit: 30 }, (docs) => set({ alerts: { ...state.alerts, [p.id]: docs } }))
        ]);
      }
      for (const [pid, fs] of perPatient) if (!rows.find((r) => r.id === pid)) { fs.forEach((f) => f()); perPatient.delete(pid); }
      loaded.people = true;
      set({ raw: rows, ready: done() });
    }));
  });
}

// ---- turning stored data into what the screens show --------------------------

const pron = (p) => (p.self ? { her: 'my', him: 'me', she: 'I' } : p.pronoun === 'he' ? { her: 'his', him: 'him', she: 'he' } : p.pronoun === 'she' ? { her: 'her', him: 'her', she: 'she' } : { her: 'their', him: 'them', she: 'they' });

function vitalsOf(p) {
  const out = {};
  const days = [6, 5, 4, 3, 2, 1, 0].map((n) => daysBack(n));
  for (const k of ORDER) {
    const recent = (p.recent && p.recent[k]) || [];
    if (!recent.length) continue;
    const last = recent[0];
    const vals = days.map((d) => { const a = p.days && p.days[dayKey(d)] && p.days[dayKey(d)][k]; return a && a.n ? Math.round(a.s / a.n) : null; });
    out[k] = {
      now: last.v, show: showValue(k, last), at: last.at,
      vals, labels: days.map((d, i) => (i === 6 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }))),
      rows: recent.slice(0, 3).map((r) => [when(r.at), showValue(k, r) + (k === 'sugar' ? ' mg/dL' : k === 'hr' ? ' bpm' : k === 'o2' ? '%' : ''), statusOf(k, r.v) !== 'Normal'])
    };
  }
  return out;
}

function weekOf(p, logs) {
  const sched = (p.doses || []).filter((d) => !d.need);
  let due = 0, taken = 0;
  const missed = [];
  for (let n = 1; n <= 7; n++) {
    const d = daysBack(n);
    if (p.created && d.getTime() < p.created) break;
    const log = logs[dayKey(d)] || {};
    for (const x of sched) {
      due++;
      if (log[x.id]) taken++; else missed.push(x.name.split(' ')[0] + ', ' + d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + x.time);
    }
  }
  return { week: due ? Math.round((taken / due) * 100) + '% on time' : 'Starts tomorrow', missed };
}

function person(p, i) {
  const [bg, fg] = AVATARS[(p.color ?? i) % AVATARS.length];
  const logs = state.logs[p.id] || {};
  const vitals = vitalsOf(p);
  const { week, missed } = weekOf(p, logs);
  const conds = p.conds || [];
  const mini = (conds.includes('Diabetes') ? ['sugar', 'bp', 'hr', 'o2'] : ['bp', 'hr', 'o2', 'sugar']).filter((k) => vitals[k]).slice(0, 3);
  const alerts = state.alerts[p.id] || [];
  return {
    ...p, ...pron(p), bg, fg, ini: p.ini || initials(p.name), conds,
    contacts: p.contacts || [], doses: p.doses || [],
    watch: !!p.watchUid, battery: p.watchInfo && p.watchInfo.battery, lastSeen: p.watchInfo && p.watchInfo.lastSeen,
    address: (p.loc && p.loc.address) || 'No location yet', shortAddress: (p.loc && p.loc.short) || 'Unknown',
    vitals, mini, week,
    missed: missed.length > 0,
    note: missed.length ? `${missed.length} missed dose${missed.length > 1 ? 's' : ''} this week: ${missed[0]}` : (p.doses || []).length ? 'No missed doses this week' : 'Add medicine to start reminders',
    today: doseStatus(p.doses, logs[dayKey()] || {}),
    alerts, unread: alerts.filter((a) => !a.read).length,
    sosActive: p.sos && p.sos.active
  };
}

export const getLive = () => {
  if (!derived) derived = { ...state, people: state.raw.map(person) };
  return derived;
};
export const useLive = () => {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); const t = setInterval(f, 30000); return () => { subs.delete(f); clearInterval(t); }; }, []);
  return getLive();
};

// ---- actions -------------------------------------------------------------------

const me = () => state.user;

export async function createPerson({ name, self, conds, contacts, autoAlert, phone, pronoun }) {
  const u = me();
  const id = be.newId();
  await be.setDoc('patients/' + id, {
    name, ini: initials(name), self: !!self, conds, contacts, autoAlert, phone: phone || '', pronoun: pronoun || '',
    color: state.raw.length % AVATARS.length, carers: [u.uid], carerNames: { [u.uid]: u.name || 'Your caregiver' }, ownerUid: u.uid,
    watchUid: null, doses: [], created: Date.now()
  });
  return id;
}
// The caregiver's own details (phone sign-up step "About you").
export async function saveProfile(data) {
  await be.setDoc('users/' + me().uid, { ...data, updated: Date.now() }, { merge: true });
  if (data.name) await be.setName(data.name);
}

export const updatePerson = (id, patch) => be.updateDoc('patients/' + id, patch);
export async function removePerson(id) { await be.deleteDoc('patients/' + id); }

export async function addDose(p, dose) {
  const doses = [...(p.doses || []), { id: be.newId(), ...dose }].sort((a, b) => (a.need ? 1 : b.need ? -1 : a.time.localeCompare(b.time)));
  await be.updateDoc('patients/' + p.id, { doses });
}
export async function removeDose(p, doseId) { await be.updateDoc('patients/' + p.id, { doses: p.doses.filter((d) => d.id !== doseId) }); }

export async function markTaken(p, doseId, at) {
  const day = dayKey();
  await be.setDoc(`patients/${p.id}/doselog/${day}`, { day, taken: { [doseId]: at }, by: { [doseId]: me().uid } }, { merge: true });
}

export async function markAlertsRead(people) {
  await Promise.all(people.flatMap((p) => p.alerts.filter((a) => !a.read).map((a) => be.updateDoc(`patients/${p.id}/alerts/${a.id}`, { read: true }))));
}

// Messages to the patient's watch (reminders, check-ins). The watch shows them.
export const sendToWatch = (p, msg) => be.updateDoc('patients/' + p.id, { ping: { ...msg, at: Date.now(), from: me().name || 'Your caregiver' } });

export async function endSOS(p) { await be.updateDoc('patients/' + p.id, { sos: { active: false, endedAt: Date.now() } }); }

// Pairing: the watch shows a 6-digit code and waits on codes/{code}.
export async function linkWatch(code, p) {
  const c = await be.getDoc('codes/' + code);
  if (!c || !c.watchUid) { const e = new Error('no-code'); e.code = 'no-code'; throw e; }
  if (Date.now() - (c.createdAt || 0) > 30 * 60 * 1000) { const e = new Error('expired'); e.code = 'expired'; throw e; }
  // Conditions the patient chose on the watch during its setup are added to the person.
  const fromWatch = (c.setup && c.setup.conds) || [];
  const conds = [...new Set([...(p.conds || []), ...fromWatch])];
  await be.updateDoc('patients/' + p.id, { watchUid: c.watchUid, conds, watchInfo: { battery: c.battery ?? 100, lastSeen: Date.now() } });
  await be.updateDoc('codes/' + code, { pid: p.id, carerName: me().name || 'Your caregiver', personName: p.name });
}
export async function unlinkWatch(p) { await be.updateDoc('patients/' + p.id, { watchUid: null }); }

export { METRICS, statusOf };

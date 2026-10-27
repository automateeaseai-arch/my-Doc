import { useEffect, useState } from 'react';
import { PEOPLE } from './data.js';

// Everything the user changes is kept on this phone (localStorage).
const KEY = 'mydoc.v1';

const fresh = () => ({
  signedIn: false,
  people: structuredClone(PEOPLE),
  sel: 0,
  taken: {},
  alertsRead: false,
  settings: { range: true, doses: true, summary: true, quiet: false, unit: 'mg', theme: 'light', shareVitals: true },
  serotoninWarn: true,
  summarySeen: ''
});

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.people)) return { ...fresh(), ...saved, settings: { ...fresh().settings, ...saved.settings } };
  } catch { /* storage blocked or corrupt: start fresh */ }
  return fresh();
};

let state = load();
const subs = new Set();

export const getState = () => state;

export const update = (fn) => {
  state = { ...state, ...fn(state) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
  subs.forEach((f) => f(state));
};

export const resetAll = () => { update(() => fresh()); };

export const useStore = () => {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); return () => subs.delete(set); }, []);
  return s;
};

// ---- time helpers -------------------------------------------------------

export const todayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const clock = (d = new Date()) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

const until = (m) => {
  const diff = m - nowMins();
  if (diff <= -1) return Math.abs(diff) < 60 ? Math.abs(diff) + ' min late' : 'Late';
  if (diff < 1) return 'Now';
  if (diff < 60) return 'in ' + diff + ' min';
  return 'in ' + Math.floor(diff / 60) + ' h';
};

export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
export const longDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

// Today's doses for a person. Doses more than an hour old count as taken on the
// watch (sample data); the first one still open is "due".
export const dosesFor = (st, p) => {
  const rec = (st.taken[todayKey()] || {})[p.id] || {};
  const now = nowMins();
  let dueFound = false;
  return p.doses.map((d, i) => {
    const [time, name, how, kind] = d;
    if (kind === 'need') return { i, time, name, how, st: 'need', label: 'As needed' };
    const m = mins(time);
    if (rec[i]) return { i, time, name, how, st: 'taken', label: 'Taken ' + rec[i] };
    if (m < now - 60) {
      const t = m + 4;
      return { i, time, name, how, st: 'taken', label: 'Taken ' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0') };
    }
    if (!dueFound) { dueFound = true; return { i, time, name, how, st: 'due', label: until(m) }; }
    return { i, time, name, how, st: 'later', label: until(m) };
  });
};

export const markTaken = (pid, i) => update((s) => {
  const day = todayKey(), t = { ...s.taken };
  t[day] = { ...(t[day] || {}), [pid]: { ...((t[day] || {})[pid] || {}), [i]: clock() } };
  return { taken: t };
});

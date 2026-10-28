import { useEffect, useState } from 'react';

// Settings that belong to this phone only (selected person, units, alert switches).
const KEY = 'mydoc.prefs';

const fresh = () => ({
  sel: 0,
  settings: { range: true, doses: true, summary: true, quiet: false, unit: 'mg', theme: 'light', shareVitals: true },
  serotoninWarn: true,
  summarySeen: ''
});

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return { ...fresh(), ...saved, settings: { ...fresh().settings, ...saved.settings } };
  } catch { /* storage blocked or corrupt: start fresh */ }
  return fresh();
};

let state = load();
const subs = new Set();

export const update = (fn) => {
  state = { ...state, ...fn(state) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
  subs.forEach((f) => f(state));
};

export const useStore = () => {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); return () => subs.delete(set); }, []);
  return s;
};

export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
export const longDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

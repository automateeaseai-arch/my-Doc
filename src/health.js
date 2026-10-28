// Shared health rules: normal ranges, how readings are summarised, dose status.
// Used by the phone app and the watch simulator.

export const METRICS = {
  sugar: { title: 'Blood sugar', short: 'SUGAR', unit: 'mg/dL', icon: 'drop', min: 40, max: 200, lo: 70, hi: 140,
    normText: 'Normal 70–140', chartTitle: 'Daily average', act: 'Remind {him} to take medication', done: 'Reminder sent to {her} watch' },
  bp: { title: 'Blood pressure', short: 'BP', unit: 'mmHg', icon: 'gauge', min: 80, max: 180, lo: 90, hi: 140,
    normText: 'Target below 140/90', chartTitle: 'Top number (systolic), daily average', act: 'Remind {him} to take medication', done: 'Reminder sent to {her} watch' },
  hr: { title: 'Heart rate', short: 'HEART', unit: 'beats/min', icon: 'heart', min: 40, max: 160, lo: 50, hi: 110,
    normText: 'Normal 50–110 at rest', chartTitle: 'Resting heart rate, daily average', act: 'Send a check-in to {her} watch', done: 'Check-in sent to {her} watch' },
  o2: { title: 'Oxygen (SpO2)', label: 'Oxygen', short: 'SpO2', unit: '%', cardUnit: 'SpO2', icon: 'o2', min: 85, max: 100, lo: 94, hi: 101, noHigh: true,
    normText: 'Normal 94–100%', chartTitle: 'Blood oxygen, daily average', act: 'Send a check-in to {her} watch', done: 'Check-in sent to {her} watch' }
};
export const ORDER = ['sugar', 'bp', 'hr', 'o2'];

export const statusOf = (k, v) => { const m = METRICS[k]; return v > m.hi ? 'High' : v < m.lo ? 'Low' : 'Normal'; };
export const showValue = (k, r) => (k === 'bp' ? r.v + '/' + r.v2 : String(r.v));
export const sugarText = (v, unit) => (unit === 'mmol' ? (v / 18).toFixed(1) : String(v));
export const sugarUnit = (unit) => (unit === 'mmol' ? 'mmol/L' : 'mg/dL');

export const CONDITIONS = ['Anxiety / mood swings', 'Hypertension', 'Diabetes', 'Migraine', 'Psychosis', 'Stroke'];
export const AVATARS = [['#FDECEE', '#A81C2B'], ['#E3F5F3', '#0B7A75'], ['#FFF1DB', '#8A5300'], ['#E8ECF7', '#2F4A8A']];
export const initials = (name) => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

// ---- time -------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const clock = (d = new Date()) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const daysBack = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// "Today, 12:10", "Yesterday, 19:45", "Fri, 19:30"
export const when = (at) => {
  const d = new Date(at), today = dayKey(), key = dayKey(d);
  const day = key === today ? 'Today' : key === dayKey(daysBack(1)) ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short' });
  return day + ', ' + clock(d);
};
export const ago = (at) => {
  if (!at) return 'never';
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' d ago';
};

const until = (m) => {
  const diff = m - nowMins();
  if (diff <= -1) return Math.abs(diff) < 60 ? Math.abs(diff) + ' min late' : 'Missed';
  if (diff < 1) return 'Now';
  if (diff < 60) return 'in ' + diff + ' min';
  return 'in ' + Math.floor(diff / 60) + ' h';
};

// Today's doses with their status. A dose more than an hour late counts as missed
// (it can still be marked taken); the first open dose is "due".
export const doseStatus = (doses = [], log = {}) => {
  const now = nowMins();
  let dueFound = false;
  return doses.map((d) => {
    const base = { id: d.id, time: d.need ? '—' : d.time, name: d.name, how: d.how };
    if (d.need) return { ...base, st: 'need', label: 'As needed' };
    if (log[d.id]) return { ...base, st: 'taken', label: 'Taken ' + log[d.id] };
    const m = mins(d.time);
    if (m < now - 60) return { ...base, st: 'missed', label: 'Missed' };
    if (!dueFound) { dueFound = true; return { ...base, st: 'due', label: until(m) }; }
    return { ...base, st: 'later', label: until(m) };
  });
};

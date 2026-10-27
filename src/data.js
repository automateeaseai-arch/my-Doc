// Sample data for the people Chinedu cares for. Readings come from their watches
// in the real product; here they are fixed so the app can be tried without one.

export const METRICS = {
  sugar: { title: 'Blood sugar', short: 'SUGAR', unit: 'mg/dL', icon: 'drop', min: 40, max: 200, lo: 80, hi: 140,
    normText: 'Normal 80–140', chartTitle: 'Daily average', act: 'Remind {him} to take medication', done: 'Reminder sent to {her} watch' },
  bp: { title: 'Blood pressure', short: 'BP', unit: 'mmHg', icon: 'gauge', min: 80, max: 180, lo: 90, hi: 140,
    normText: 'Target below 140/90', chartTitle: 'Top number (systolic), daily average', act: 'Remind {him} to take medication', done: 'Reminder sent to {her} watch' },
  hr: { title: 'Heart rate', short: 'HEART', unit: 'beats/min', icon: 'heart', min: 40, max: 160, lo: 60, hi: 100,
    normText: 'Normal 60–100 at rest', chartTitle: 'Resting heart rate, daily average', act: 'Send a check-in to {her} watch', done: 'Check-in sent to {her} watch' },
  o2: { title: 'Oxygen (SpO2)', label: 'Oxygen', short: 'SpO2', unit: '%', cardUnit: 'SpO2', icon: 'o2', min: 85, max: 100, lo: 95, hi: 100, noHigh: true,
    normText: 'Normal 95–100%', chartTitle: 'Blood oxygen, daily average', act: 'Send a check-in to {her} watch', done: 'Check-in sent to {her} watch' }
};

export const PEOPLE = [
  {
    id: 'mn', name: 'Mama Nkechi', ini: 'MN', bg: '#FDECEE', fg: '#A81C2B', her: 'her', him: 'her', she: 'she',
    conds: ['Diabetes', 'Hypertension'], phone: '0802 000 0000', watch: true, battery: 64,
    address: '12 Allen Avenue, Ikeja', shortAddress: '12 Allen Ave, Ikeja', week: '92% on time',
    note: '1 missed dose this week: Atorvastatin, Sun 21:00', missed: true,
    contacts: [{ name: 'Cathlyn', ini: 'C', rel: 'Granddaughter', phone: '0803 000 0000' }],
    vitals: {
      sugar: { now: 180, show: '180', vals: [118, 126, 110, 132, 121, 150, 180], rows: [['Today, 12:10', '180 mg/dL', 1], ['Today, 08:02', '150 mg/dL', 1], ['Yesterday, 19:45', '122 mg/dL']] },
      bp: { now: 128, show: '128/82', vals: [134, 129, 142, 126, 131, 124, 128], rows: [['Today, 12:10', '128/82'], ['Today, 08:00', '131/84'], ['Fri, 19:30', '142/91', 1]] },
      hr: { now: 84, show: '84', vals: [72, 78, 81, 76, 88, 92, 84], rows: [['Today, 12:10', '84 bpm'], ['Today, 08:00', '79 bpm'], ['Yesterday, 17:20', '112 bpm', 1]] },
      o2: { now: 97, show: '97', vals: [98, 97, 96, 98, 97, 95, 97], rows: [['Today, 12:10', '97%'], ['Today, 08:00', '96%'], ['Yesterday, 22:40', '98%']] }
    },
    mini: ['sugar', 'bp', 'hr'],
    doses: [
      ['08:00', 'Amlodipine 5 mg', '1 tablet · for blood pressure'],
      ['08:00', 'Metformin 500 mg', '1 tablet · after breakfast'],
      ['13:00', 'Metformin 500 mg', '1 tablet · after lunch'],
      ['20:00', 'Metformin 500 mg', '1 tablet · after dinner'],
      ['21:00', 'Atorvastatin 20 mg', '1 tablet · at bedtime']
    ],
    summary: 'Blood sugar peaked at 180 at 12:10, back to 132 by 18:00.'
  },
  {
    id: 'po', name: 'Papa Obi', ini: 'PO', bg: '#E3F5F3', fg: '#0B7A75', her: 'his', him: 'him', she: 'he',
    conds: ['Hypertension'], phone: '0806 000 0000', watch: true, battery: 81,
    address: '4 Adeola Odeku Street, Victoria Island', shortAddress: '4 Adeola Odeku St, VI', week: '100% on time',
    note: 'No missed doses this week', missed: false,
    contacts: [{ name: 'Cathlyn', ini: 'C', rel: 'Granddaughter', phone: '0803 000 0000' }],
    vitals: {
      bp: { now: 122, show: '122/80', vals: [126, 124, 121, 128, 123, 120, 122], rows: [['Today, 12:05', '122/80'], ['Today, 07:30', '125/82'], ['Yesterday, 19:10', '121/79']] },
      hr: { now: 72, show: '72', vals: [70, 74, 71, 69, 73, 75, 72], rows: [['Today, 12:05', '72 bpm'], ['Today, 07:30', '68 bpm'], ['Yesterday, 19:10', '74 bpm']] },
      o2: { now: 98, show: '98', vals: [98, 97, 98, 99, 98, 97, 98], rows: [['Today, 12:05', '98%'], ['Today, 07:30', '97%'], ['Yesterday, 19:10', '98%']] },
      sugar: { now: 104, show: '104', vals: [98, 102, 110, 96, 105, 99, 104], rows: [['Today, 12:05', '104 mg/dL'], ['Today, 07:30', '95 mg/dL'], ['Yesterday, 19:10', '112 mg/dL']] }
    },
    mini: ['bp', 'hr', 'o2'],
    doses: [
      ['07:00', 'Amlodipine 10 mg', '1 tablet · for blood pressure'],
      ['19:00', 'Lisinopril 10 mg', '1 tablet · after dinner']
    ],
    summary: 'Blood pressure steady around 122/80.'
  },
  {
    id: 'y', name: 'Me (Yemi)', ini: 'Y', bg: '#FFF1DB', fg: '#8A5300', her: 'my', him: 'me', she: 'I', self: true,
    conds: ['Migraine'], phone: '0807 000 0000', watch: false,
    address: '9 Bode Thomas Street, Surulere', shortAddress: '9 Bode Thomas St, Surulere', week: '86% on time',
    note: 'Sumatriptan is taken only when a migraine starts, so it has no set time.', missed: false,
    contacts: [{ name: 'Chinedu', ini: 'CN', rel: 'Friend', phone: '0809 000 0000' }],
    vitals: {},
    mini: [],
    doses: [
      ['08:00', 'Propranolol 40 mg', '1 tablet · to prevent migraines'],
      ['20:00', 'Propranolol 40 mg', '1 tablet · after dinner'],
      ['—', 'Sumatriptan 50 mg', 'At the first sign of a migraine', 'need']
    ],
    summary: 'Serotonin in optimal range. Only 5 h 20 m sleep last night.', extraWarnings: 1
  }
];

export const CONDITIONS = ['Anxiety / mood swings', 'Hypertension', 'Diabetes', 'Migraine', 'Psychosis', 'Stroke'];

export const AVATARS = [['#FDECEE', '#A81C2B'], ['#E3F5F3', '#0B7A75'], ['#FFF1DB', '#8A5300'], ['#E8ECF7', '#2F4A8A']];

export const initials = (name) => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

export const statusOf = (m, v) => (v > m.hi ? 'High' : v < m.lo ? 'Low' : 'Normal');

// Blood sugar can be shown in mg/dL or mmol/L (Profile setting).
export const sugarText = (v, unit) => (unit === 'mmol' ? (v / 18).toFixed(1) : String(v));
export const sugarUnit = (unit) => (unit === 'mmol' ? 'mmol/L' : 'mg/dL');

export const ALERTS = [
  { id: 'a1', p: 'mn', kind: 'danger', title: 'Blood sugar is high', sub: 'Mama Nkechi · 180 mg/dL', time: '12:10', unread: true, to: '/p/mn/r/sugar' },
  { id: 'a2', p: 'mn', kind: 'warn', title: 'Dose due soon', sub: 'Mama Nkechi · Metformin 500 mg at 13:00', time: '12:15', unread: true, to: '/p/mn/meds' },
  { id: 'a3', p: 'y', kind: 'warn', title: 'Short sleep last night', sub: 'Me · 5 h 20 m · migraine risk higher', time: '07:00', unread: false, to: '/serotonin' },
  { id: 'a4', p: 'mn', kind: 'warn', title: 'Missed dose', sub: 'Mama Nkechi · Atorvastatin 20 mg', time: 'Sun', unread: false, to: '/p/mn/meds' },
  { id: 'a5', p: 'mn', kind: 'danger', title: 'Blood pressure was high', sub: 'Mama Nkechi · 142/91 mmHg', time: 'Fri', unread: false, to: '/p/mn/r/bp' }
];

// Readings outside the normal range for a person.
export const outOfRange = (p) => Object.entries(p.vitals).filter(([k, v]) => statusOf(METRICS[k], v.now) !== 'Normal').map(([k]) => k);
export const warningsOf = (p) => outOfRange(p).length + (p.missed ? 1 : 0) + (p.extraWarnings || 0);

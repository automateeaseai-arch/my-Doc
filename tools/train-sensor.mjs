// Trains the sensor engine's models on simulated people and writes src/sensor/model.json.
// Run: node tools/train-sensor.mjs   (a real product retrains on clinical study data)
import { writeFileSync } from 'node:fs';
import { processWindow, features, fitRidge, applyRidge, calibrate, accuracy, FS, WINDOW } from '../src/sensor/engine.js';
import { makePerson, SimSensor, rng } from '../src/sensor/simsensor.js';

const r = rng(42);
const sample = (person, cond, seed) => {
  const s = new SimSensor(person, cond, seed);
  s.read(FS * 2); // settle
  return processWindow(s.read(FS * WINDOW));
};
const randomCond = () => ({ sugar: r.range(55, 330), motion: r() < 0.7 ? r.range(0, 0.15) : r.range(0.15, 0.5), tempC: r.range(29, 36), sweat: r() < 0.6 ? 0 : r.range(0, 0.6), spo2Offset: r() < 0.2 ? -r.range(0, 8) : 0 });

// training: 400 people, 3 readings each
const X = [], y = [], R = [], S = [];
for (let i = 0; i < 400; i++) {
  const person = makePerson(1000 + i);
  for (let k = 0; k < 3; k++) {
    const c = randomCond(), w = sample(person, c, i * 10 + k);
    if (w.quality === 'poor') continue;
    X.push(features(w)); y.push(c.sugar); R.push(w.ratio); S.push(person.spo2 + c.spo2Offset);
  }
}
const sugar = fitRidge(X, y, 0.5);
// oxygen: straight line through the red/infrared ratio (the classic pulse-oximeter method)
const mr = R.reduce((a, b) => a + b) / R.length, ms = S.reduce((a, b) => a + b) / S.length;
const b = R.reduce((s, v, i) => s + (v - mr) * (S[i] - ms), 0) / R.reduce((s, v) => s + (v - mr) ** 2, 0);
const spo2 = { a: ms - b * mr, b };

// testing on 120 new people: before and after two finger-prick calibrations
const before = [], after = [], o2err = [];
let relSq = 0, relN = 0;
for (let i = 0; i < 120; i++) {
  const person = makePerson(50000 + i);
  const pairs = [90, 190].map((ref, k) => ({ raw: applyRidge(sugar, features(sample(person, { sugar: ref, motion: 0, tempC: 33, sweat: 0 }, 7000 + i * 5 + k))), ref }));
  const cal = calibrate(pairs, { calSd: 0.1 });
  for (let k = 0; k < 6; k++) {
    const c = { ...randomCond(), motion: r.range(0, 0.12) }, w = sample(person, c, 90000 + i * 10 + k);
    if (w.quality === 'poor') continue;
    const raw = applyRidge(sugar, features(w));
    before.push({ ref: c.sugar, est: raw });
    after.push({ ref: c.sugar, est: cal.a + cal.b * raw });
    relSq += ((cal.a + cal.b * raw - c.sugar) / c.sugar) ** 2; relN++;
    o2err.push(Math.abs(spo2.a + spo2.b * w.ratio - (person.spo2 + c.spo2Offset)));
  }
}
const accB = accuracy(before), accA = accuracy(after);
const sugarSd = Math.sqrt(before.reduce((s, p) => s + ((p.est - p.ref) / p.ref) ** 2, 0) / before.length);
const calSd = Math.sqrt(relSq / relN);
const round = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));
const model = round({
  version: 1, trainedOn: `${X.length} simulated readings from 400 simulated people`, created: new Date().toISOString().slice(0, 10),
  sugar, sugarSd, calSd, spo2,
  test: { people: 120, uncalibrated: accB, calibrated: accA, spo2MeanError: o2err.reduce((a, b) => a + b) / o2err.length }
});
writeFileSync(new URL('../src/sensor/model.json', import.meta.url), JSON.stringify(model, null, 1) + '\n');
console.log('training readings', X.length);
console.log('uncalibrated', accB, 'sd', sugarSd.toFixed(3));
console.log('calibrated  ', accA, 'sd', calSd.toFixed(3));
console.log('SpO2 mean error', model.test.spo2MeanError.toFixed(2), '%');

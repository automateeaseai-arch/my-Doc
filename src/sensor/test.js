// Accuracy test: many readings from the simulated sensor, compared with the true value,
// scored the way glucose meters are (MARD, ±15%, Clarke error grid).
import { processWindow, estimate, accuracy, FS, WINDOW } from './engine.js';
import { makePerson, SimSensor, rng } from './simsensor.js';

const pause = () => new Promise((r) => setTimeout(r, 0));

export async function runTest({ person, cond, cal, model, n = 120, onProgress }) {
  const r = rng(person.seed * 31 + 7), before = [], after = [];
  for (let i = 0; i < n; i++) {
    const ref = Math.round(r.range(55, 330));
    const s = new SimSensor(person, { ...cond, sugar: ref }, 1000 + i);
    s.read(FS);
    const e = estimate(processWindow(s.read(FS * WINDOW)), model);
    before.push({ ref, est: e.sugar == null ? null : Math.round(e.raw) });
    if (cal) after.push({ ref, est: e.sugar == null ? null : Math.round(cal.a + cal.b * e.raw) });
    if (i % 10 === 9) { onProgress && onProgress((i + 1) / n); await pause(); }
  }
  return { before, after, accBefore: accuracy(before), accAfter: cal ? accuracy(after) : null };
}

// Same test for each skin tone (no calibration), so bias by skin tone would show.
export async function testSkinTones({ cond, model, perTone = 30, onProgress }) {
  const out = [];
  for (let tone = 0; tone < 6; tone++) {
    const pairs = [];
    for (let i = 0; i < perTone; i++) {
      const person = makePerson(3000 + i, tone), ref = 60 + ((i * 37) % 260);
      const s = new SimSensor(person, { ...cond, sugar: ref }, 500 + i);
      s.read(FS);
      const e = estimate(processWindow(s.read(FS * WINDOW)), model);
      pairs.push({ ref, est: e.sugar == null ? null : e.raw });
    }
    out.push(accuracy(pairs));
    onProgress && onProgress((tone + 1) / 6);
    await pause();
  }
  return out;
}

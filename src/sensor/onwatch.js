// The sensor engine on the (simulated) patient watch: each sugar reading is estimated
// from 8 seconds of simulated light, calibrated with two finger-pricks at first use.
import { processWindow, estimate, calibrate, FS, WINDOW } from './engine.js';
import { makePerson, SimSensor } from './simsensor.js';
import model from './model.json';

const seedOf = (pid) => [...String(pid)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 100000;
const people = {};

function setup(pid) {
  if (people[pid]) return people[pid];
  const person = makePerson(seedOf(pid));
  let seed = 1;
  const read = (sugar, cal) => {
    const s = new SimSensor(person, { sugar, motion: 0.15, tempC: 33 }, seed++);
    s.read(FS);
    return estimate(processWindow(s.read(FS * WINDOW)), model, cal);
  };
  // set-up: finger-pricks before and after a meal
  const pairs = [95, 175].map((ref) => ({ raw: read(ref).raw, ref }));
  return (people[pid] = { read, cal: calibrate(pairs, model) });
}

// truth → { v, est: { pm, q } }, or null when the signal is too poor to estimate.
export function opticalSugar(pid, truth) {
  const p = setup(pid), e = p.read(truth, p.cal);
  if (e.sugar == null) return null;
  return { v: e.sugar, est: { pm: e.pm, q: e.quality } };
}

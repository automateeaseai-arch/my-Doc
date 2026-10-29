// Simulated optical wrist sensor: produces the light readings a real 12-wavelength
// sensor would, from a simulated person and a known ("true") blood sugar.
// Light follows Beer–Lambert: light = LED × e^(−absorbance), with each heartbeat
// pushing more blood (and its glucose) into the light path.
// Realistic problems are included: skin tone, hydration, fat, temperature, sweat,
// movement, sensor noise and person-to-person differences in the optics.
import { WAVELENGTHS, SPECTRA, FS } from './engine.js';

const N = WAVELENGTHS.length;

// Small seeded random generator, so tests and training are repeatable.
export function rng(seed = 1) {
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  u.normal = () => { let x = 0; while (!x) x = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u()); };
  u.range = (lo, hi) => lo + (hi - lo) * u();
  return u;
}

// Skin tone uses the Fitzpatrick scale (I = very light … VI = very dark).
export const SKIN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const melaninOf = (tone) => 0.15 + 0.22 * tone; // tone 0..5

// One simulated person: what makes their optics different from the next person's.
export function makePerson(seed, tone) {
  const r = rng(seed * 7919 + 13);
  return {
    seed,
    tone: tone ?? Math.floor(r() * 6),
    water: r.range(0.55, 0.75),       // tissue hydration
    lipid: r.range(0.1, 0.45),        // fat under the sensor
    path: r.range(0.85, 1.15),        // light path length (wrist size, strap)
    tilt: r.range(-0.12, 0.12),       // path changes with wavelength (scattering)
    perfusion: r.range(0.012, 0.03),  // how strongly blood pulses
    glucoseGain: r.range(0.75, 1.25), // how strongly glucose shows (person-specific)
    protein: r.range(-1, 1),          // other skin chemistry with a similar spectrum (person-specific)
    hr: r.range(62, 84),
    spo2: r.range(95, 99),
    gains: Array.from({ length: N }, () => r.range(0.7, 1.3)), // movement pickup per LED
    i0: WAVELENGTHS.map((w) => 1 - 0.0002 * (w - 530)) // LED brightness after factory calibration
  };
}

// conditions: { sugar (mg/dL, the truth), motion 0 (still) … 1 (walking) … 2 (running),
//               tempC (skin, 28–37), sweat 0 … 1 }
export class SimSensor {
  constructor(person, conditions = {}, seed = 1) {
    this.p = person;
    this.c = { sugar: 110, motion: 0, tempC: 33, sweat: 0, ...conditions };
    this.r = rng(seed);
    this.t = 0; this.phase = 0; this.walk = 0; this.drift = 0;
    this.blood = this.c.sugar; // tissue sugar lags blood sugar
  }
  set(conditions) { Object.assign(this.c, conditions); }

  // Next n samples of every channel.
  read(n = FS) {
    const { p, c, r } = this;
    const channels = Array.from({ length: N }, () => new Float64Array(n));
    const acc = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
    const mel = melaninOf(p.tone), dt = 1 / FS;
    const stepHz = c.motion > 1.4 ? 2.7 : 1.8;
    const sat = (p.spo2 + (c.spo2Offset || 0)) / 100;
    for (let i = 0; i < n; i++) {
      this.t += dt;
      const hr = p.hr + c.motion * 22 + (c.hrOffset || 0);
      this.phase = (this.phase + hr / 60 * dt) % 1;
      this.blood += (c.sugar - this.blood) * dt / 120; // sugar in the skin follows the blood over ~2 minutes
      this.drift += r.normal() * 0.00002;               // slow sensor drift
      const ph = this.phase;
      const wave = Math.exp(-(((ph - 0.15) / 0.07) ** 2)) + 0.35 * Math.exp(-(((ph - 0.45) / 0.09) ** 2)) - 0.26;
      // movement: steps plus random jolts
      this.walk += 2 * Math.PI * stepHz * dt;
      const m = c.motion;
      const ax = m * (0.35 * Math.sin(this.walk) + 0.08 * r.normal());
      const ay = m * (0.25 * Math.sin(this.walk * 2 + 0.6) + 0.08 * r.normal());
      const az = m * (0.15 * Math.cos(this.walk) + 0.06 * r.normal());
      acc[0][i] = ax; acc[1][i] = ay; acc[2][i] = az;
      // optical artefact: mostly follows the accelerometer, partly not (can't all be removed)
      const art = 0.012 * (ax + 0.6 * ay + 0.3 * az) + m * m * 0.003 * r.normal();
      for (let j = 0; j < N; j++) {
        const pathJ = p.path * (1 + p.tilt * (WAVELENGTHS[j] - 1000) / 700);
        const hbJ = sat * SPECTRA.hbo2[j] + (1 - sat) * SPECTRA.hb[j];
        const g = SPECTRA.glucose[j] * 0.03 * p.glucoseGain;
        const tissue = 0.4 + mel * SPECTRA.melanin[j] + p.water * SPECTRA.water[j] + p.lipid * SPECTRA.lipid[j]
          + g * this.blood / 100 * 0.6 + SPECTRA.waterTemp[j] * (c.tempC - 33) * 6
          + c.sweat * (0.25 * SPECTRA.water[j] + 0.08);
        const other = p.protein * SPECTRA.glucose[j] * 0.03 * 0.5;
        const pulse = p.perfusion * wave * (1 - 0.35 * c.sweat) * (hbJ * 3 + 0.8 * SPECTRA.water[j] + g * c.sugar / 100 * 2.2 + other);
        const absorb = pathJ * (tissue + pulse) + art * p.gains[j] + this.drift;
        const light = p.i0[j] * Math.exp(-absorb);
        channels[j][i] = light * (1 + 0.0004 * (1 + 2 * c.sweat) * r.normal());
      }
    }
    return { channels, acc, i0: p.i0, tempC: c.tempC + 0.1 * r.normal(), at: Date.now() };
  }
}

// Joins consecutive reads into the last WINDOW seconds.
export class Window {
  constructor(seconds, fs = FS) { this.size = seconds * fs; this.ch = null; this.acc = null; this.last = null; }
  push(f) {
    const cut = (old, add) => { const a = old ? Float64Array.from([...old, ...add]) : Float64Array.from(add); return a.length > this.size ? a.slice(a.length - this.size) : a; };
    this.ch = f.channels.map((c, j) => cut(this.ch && this.ch[j], c));
    this.acc = f.acc.map((c, j) => cut(this.acc && this.acc[j], c));
    this.last = f;
  }
  get full() { return this.ch && this.ch[0].length >= this.size; }
  frame() { return { channels: this.ch, acc: this.acc, i0: this.last.i0, tempC: this.last.tempC }; }
}

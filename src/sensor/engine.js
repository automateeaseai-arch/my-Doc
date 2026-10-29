// myDoc sensor engine: turns raw light readings from an optical (spectrophotometric)
// wrist sensor into heart rate, oxygen and an EXPERIMENTAL blood-sugar estimate.
//
// The pipeline is the same whatever the light comes from:
//   frame (light per wavelength + movement + skin temperature)
//   → clean (absorbance, detrend, cancel movement with the accelerometer)
//   → pulse (heart rate and signal quality from the pulse wave)
//   → spectrum (how much each wavelength changes with each heartbeat = blood only)
//   → features → model → estimate with ± and quality
//   → personal calibration from finger-prick readings.
// Sources: sim.js (simulated sensor, no hardware) or device.js (Bluetooth sensor).
// Not a medical device: estimates are for research and demonstration.

// Hypothetical 12-wavelength wrist module (LEDs + photodiodes), in nanometres.
// 530 green: pulse; 660/940 red/infrared: oxygen; 1450: water; 1550–1690: glucose bands.
export const WAVELENGTHS = [530, 660, 810, 880, 940, 1050, 1200, 1300, 1450, 1550, 1610, 1690];
export const GLUCOSE_BANDS = [1050, 1550, 1610, 1690];
export const FS = 50;            // samples per second
export const WINDOW = 8;         // seconds of signal per estimate

// Relative absorption of each tissue component at each wavelength (shapes follow
// published spectra; scales are simplified).
export const SPECTRA = {
  hbo2:    [0.90, 0.032, 0.20, 0.25, 0.29, 0.25, 0.12, 0.08, 0.05, 0.04, 0.04, 0.04],
  hb:      [0.90, 0.32, 0.20, 0.18, 0.17, 0.12, 0.08, 0.06, 0.05, 0.04, 0.04, 0.04],
  water:   [0.00, 0.00, 0.02, 0.05, 0.12, 0.08, 0.60, 0.30, 2.60, 1.60, 1.00, 0.80],
  melanin: [1.00, 0.60, 0.40, 0.35, 0.30, 0.25, 0.18, 0.15, 0.12, 0.10, 0.09, 0.08],
  lipid:   [0.00, 0.00, 0.01, 0.02, 0.04, 0.02, 0.30, 0.05, 0.10, 0.08, 0.10, 0.50],
  glucose: [0.00, 0.00, 0.00, 0.00, 0.05, 0.25, 0.10, 0.05, 0.20, 0.90, 1.00, 0.60],
  // Warmer skin shifts the water band (looks a little like glucose: why temperature is measured).
  waterTemp: [0, 0, 0, 0, 0.002, 0.001, 0.01, 0.005, -0.03, 0.04, 0.02, 0.01]
};
const N = WAVELENGTHS.length;
const GREEN = 0, RED = 1, IR = 4;

// ---- 1. clean ---------------------------------------------------------------------

const mean = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
function detrend(a) {
  const n = a.length, mx = (n - 1) / 2, my = mean(a);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (i - mx) * (a[i] - my); sxx += (i - mx) ** 2; }
  const b = sxy / sxx, out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] - my - b * (i - mx);
  return out;
}
function smooth(a, w = 3) {
  const out = new Float64Array(a.length), h = (w - 1) / 2;
  for (let i = 0; i < a.length; i++) { let s = 0, c = 0; for (let j = i - h; j <= i + h; j++) if (j >= 0 && j < a.length) { s += a[j]; c++; } out[i] = s / c; }
  return out;
}
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

// Least squares: solve (A'A + rI) x = A'y for small systems (Gaussian elimination).
export function solve(M, v) {
  const n = v.length, A = M.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}

// Movement shows up in the light; the accelerometer says how. Remove the part of each
// light channel that the accelerometer explains (adaptive noise cancelling).
function cancelMotion(chans, acc) {
  const refs = acc.map(detrend);
  if (refs.every((a) => dot(a, a) < 1e-8)) return chans; // wrist perfectly still
  const G = refs.map((a, i) => refs.map((b, j) => dot(a, b) + (i === j ? 1e-6 : 0)));
  return chans.map((x) => {
    const w = solve(G, refs.map((a) => dot(a, x)));
    const out = Float64Array.from(x);
    refs.forEach((a, j) => { for (let i = 0; i < out.length; i++) out[i] -= w[j] * a[i]; });
    return out;
  });
}

// ---- 2. pulse ---------------------------------------------------------------------

function heartRate(x) {
  const lo = Math.round(FS * 60 / 180), hi = Math.round(FS * 60 / 40), e = dot(x, x) || 1;
  let best = 0, lag = lo;
  const r = [];
  for (let L = lo; L <= hi; L++) { let s = 0; for (let i = 0; i + L < x.length; i++) s += x[i] * x[i + L]; r[L] = s / e * x.length / (x.length - L); }
  const peaks = [];
  for (let L = lo + 1; L < hi; L++) if (r[L] > r[L - 1] && r[L] >= r[L + 1]) peaks.push(L);
  for (const L of peaks) best = Math.max(best, r[L]);
  lag = peaks.find((L) => r[L] >= 0.85 * best) ?? lo; // first strong peak, not its double
  // refine the peak between samples
  const a = r[lag - 1] ?? r[lag], b = r[lag], c = r[lag + 1] ?? r[lag], d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0;
  return { bpm: 60 * FS / (lag + off), periodicity: Math.max(0, Math.min(1, best)) };
}

// ---- full pipeline on one window ------------------------------------------------------

// frame: { channels: [N][samples] light intensity, i0: [N] LED output (factory calibration),
//          acc: [3][samples] in g, tempC: skin temperature }
export function processWindow(frame) {
  const { channels, i0, acc, tempC } = frame;
  // Light → absorbance (Beer–Lambert): steady part (all tissue) and changing part.
  const dc = channels.map((c) => mean(c));
  const dcAbs = dc.map((d, j) => -Math.log(d / i0[j]));
  const ac = channels.map((c, j) => detrend(Array.from(c, (v) => -Math.log(v / dc[j]))));
  const accMag = acc.map(detrend);
  const motion = Math.sqrt(accMag.reduce((s, a) => s + dot(a, a) / a.length, 0));
  const clean = cancelMotion(ac, accMag).map((x) => smooth(x, 3));
  const pulse = clean[GREEN];
  const { bpm, periodicity } = heartRate(pulse);
  // Pulse spectrum: each wavelength's heartbeat change relative to green.
  // Only blood pulses, so this looks at blood and not skin, fat or bone.
  const pp = dot(pulse, pulse) || 1e-12;
  const amps = clean.map((x) => dot(x, pulse) / pp);
  // Leftover noise after removing the pulse shape, per channel (for quality).
  const resid = clean.map((x, j) => { let s = 0; for (let i = 0; i < x.length; i++) s += (x[i] - amps[j] * pulse[i]) ** 2; return Math.sqrt(s / x.length); });
  const pulseSize = Math.sqrt(pp / pulse.length);
  const snr = pulseSize / (mean(resid.slice(GLUCOSE_BANDS.length)) + 1e-12);
  const score = Math.max(0, Math.min(1, periodicity * 1.15 - motion * 1.2));
  const quality = score > 0.7 ? 'good' : score > 0.45 ? 'fair' : 'poor';
  return { dcAbs, amps, pulse, clean, bpm, periodicity, motion, snr, score, quality, tempC, ratio: amps[RED] / amps[IR] };
}

// Model input: pulse spectrum (blood), steady absorbance (tissue), temperature.
export const featureNames = [
  ...WAVELENGTHS.slice(1).map((w) => 'pulse ' + w + ' nm'),
  ...WAVELENGTHS.map((w) => 'tissue ' + w + ' nm'),
  'skin temperature'
];
export const features = (w) => [...w.amps.slice(1), ...w.dcAbs, w.tempC];

// ---- 3. model ------------------------------------------------------------------------

// Ridge regression on standardised features (trained by tools/train-sensor.mjs on
// simulated people; a real product retrains it on clinical data).
export function fitRidge(X, y, lambda = 1) {
  const d = X[0].length, mu = [], sd = [];
  for (let j = 0; j < d; j++) { const col = X.map((r) => r[j]); mu[j] = mean(col); sd[j] = Math.sqrt(mean(col.map((v) => (v - mu[j]) ** 2))) || 1; }
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j])), ym = mean(y);
  const G = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0) + (a === b ? lambda : 0)));
  const w = solve(G, Array.from({ length: d }, (_, a) => Z.reduce((s, r, i) => s + r[a] * (y[i] - ym), 0)));
  return { mu, sd, w, b: ym };
}
export const applyRidge = (m, x) => m.b + x.reduce((s, v, j) => s + m.w[j] * (v - m.mu[j]) / m.sd[j], 0);

// model: { sugar: ridge, sugarSd, spo2: { a, b } } (see model.json)
export function estimate(w, model, cal) {
  const spo2 = Math.min(100, Math.max(70, model.spo2.a + model.spo2.b * w.ratio));
  const out = { bpm: Math.round(w.bpm), spo2: Math.round(spo2), quality: w.quality, score: w.score, motion: w.motion };
  if (w.quality === 'poor') return { ...out, spo2: null, sugar: null, reason: w.motion > 0.3 ? 'Too much movement: hold still' : 'Weak signal: tighten the strap' };
  const raw = applyRidge(model.sugar, features(w));
  const c = cal || { a: 0, b: 1, sd: model.sugarSd, n: 0 };
  const sugar = Math.max(20, c.a + c.b * raw);
  // ± grows with poorer signal; relative error of the model applied to this level.
  const pm = Math.max(8, sugar * c.sd * (w.quality === 'good' ? 1 : 1.6));
  return { ...out, sugar: Math.round(sugar), raw, pm: Math.round(pm) };
}

// ---- 4. personal calibration ------------------------------------------------------------

// pairs: [{ raw, ref }] — the model's raw estimate next to a finger-prick reading.
// One reading corrects the offset; two or more far enough apart also correct the slope
// (pulled towards 1 so a couple of readings can't produce wild results).
export function calibrate(pairs, model) {
  if (!pairs.length) return null;
  const xs = pairs.map((p) => p.raw), ys = pairs.map((p) => p.ref), mx = mean(xs), my = mean(ys);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const prior = 3 * 40 * 40; // strength of "slope is 1" (as if 3 readings 40 mg/dL apart)
  const b = Math.min(1.6, Math.max(0.6, (sxy + prior) / (sxx + prior)));
  const a = my - b * mx;
  const rel = pairs.map((p) => (a + b * p.raw - p.ref) / p.ref);
  const fitSd = pairs.length > 2 ? Math.sqrt(rel.reduce((s, r) => s + r * r, 0) / (pairs.length - 2)) : null;
  // Expected error after calibration (learned in training), never below what the fit shows.
  const sd = Math.max(model.calSd, fitSd ?? 0, pairs.length === 1 ? model.calSd * 1.3 : 0);
  return { a, b, sd, n: pairs.length, at: Date.now() };
}

// ---- 5. accuracy (how glucose meters are judged) --------------------------------------------

// Clarke error grid: A = clinically accurate, B = benign, C–E = could lead to wrong treatment.
export function clarkeZone(ref, est) {
  if ((ref <= 70 && est <= 70) || (est <= 1.2 * ref && est >= 0.8 * ref)) return 'A';
  if ((ref >= 180 && est <= 70) || (ref <= 70 && est >= 180)) return 'E';
  if ((ref >= 70 && ref <= 290 && est >= ref + 110) || (ref >= 130 && ref <= 180 && est <= (7 / 5) * ref - 182)) return 'C';
  if ((ref >= 240 && est >= 70 && est <= 180) || (ref <= 175 / 3 && est <= 180 && est >= 70) || (ref >= 175 / 3 && ref <= 70 && est >= (6 / 5) * ref)) return 'D';
  return 'B';
}
// MARD (mean absolute relative difference) and the share within ±15% (or ±15 mg/dL below 100).
export function accuracy(pairs) {
  const ok = pairs.filter((p) => p.est != null);
  if (!ok.length) return null;
  const zones = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  let ard = 0, within = 0;
  for (const p of ok) {
    zones[clarkeZone(p.ref, p.est)]++;
    ard += Math.abs(p.est - p.ref) / p.ref;
    if (Math.abs(p.est - p.ref) <= (p.ref < 100 ? 15 : 0.15 * p.ref)) within++;
  }
  const n = ok.length, pct = (v) => Math.round((v / n) * 1000) / 10;
  return { n, skipped: pairs.length - n, mard: pct(ard), within15: pct(within), zones: Object.fromEntries(Object.entries(zones).map(([k, v]) => [k, pct(v)])) };
}

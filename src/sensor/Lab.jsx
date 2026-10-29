// Sensor Lab: shows the sensor engine working live, on the simulated sensor or a real
// Bluetooth sensor. Built for demos and judges; not part of the patient's daily app.
import { useEffect, useRef, useState } from 'react';
import { s, Seg, Logo, card, section } from '../ui.jsx';
import { WAVELENGTHS, GLUCOSE_BANDS, FS, WINDOW, processWindow, estimate, calibrate } from './engine.js';
import { makePerson, SimSensor, Window, SKIN } from './simsensor.js';
import { encode, decode, join, bluetoothAvailable, connectSensor } from './device.js';
import { runTest, testSkinTones } from './test.js';
import model from './model.json';

const TEAL = '#0B7A75', RED = '#D62839', INK = '#14202B', MUTED = '#5B6672', LINE = '#E4E8EC', AMBER = '#B86E00';
const MOVES = [['0', 'Still'], ['1', 'Walking'], ['2', 'Running']];
const label = 'font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: #5B6672';
const box = card + '; padding: 18px; display: flex; flex-direction: column; gap: 14px';
const smallBtn = 'height: 44px; padding: 0 16px; border-radius: 14px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1.5px solid #0B7A75; color: #0B7A75; background: #FFFFFF';
const mainBtn = 'height: 48px; padding: 0 18px; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; border: 0; color: #FFFFFF; background: #0B7A75';

// ---- drawing ------------------------------------------------------------------------

function Canvas({ draw, height = 120, deps, label: aria }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, dpr = window.devicePixelRatio || 1, w = c.clientWidth;
    c.width = w * dpr; c.height = height * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.clearRect(0, 0, w, height);
    draw(g, w, height);
  }, deps);
  return <canvas ref={ref} role="img" aria-label={aria} style={{ width: '100%', height, display: 'block' }} />;
}
function line(g, data, w, h, color, pad = 6) {
  if (!data || data.length < 2) return;
  let lo = Infinity, hi = -Infinity;
  for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  g.beginPath(); g.strokeStyle = color; g.lineWidth = 2; g.lineJoin = 'round';
  data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = pad + (1 - (v - lo) / span) * (h - 2 * pad); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
}

function Clarke({ pairs, color }) {
  const draw = (g, w, h) => {
    const m = 28, sx = (v) => m + (v / 400) * (w - m - 8), sy = (v) => h - m - (v / 400) * (h - m - 8);
    g.font = '11px Poppins, sans-serif'; g.fillStyle = MUTED; g.strokeStyle = LINE; g.lineWidth = 1;
    for (const v of [0, 100, 200, 300, 400]) { g.fillText(v, sx(v) - 8, h - 10); g.fillText(v, 2, sy(v) + 4); }
    g.fillText('lab value →', w - 76, h - m - 4);
    g.save(); g.translate(m + 12, 18); g.fillText('↑ estimate', 0, 0); g.restore();
    const L = (a, b, c, d) => { g.beginPath(); g.moveTo(sx(a), sy(b)); g.lineTo(sx(c), sy(d)); g.stroke(); };
    g.strokeStyle = '#B9C2CA';
    [[0, 0, 400, 400], [0, 70, 175 / 3, 70], [175 / 3, 70, 400 / 1.2, 400], [70, 84, 70, 400], [0, 180, 70, 180], [70, 180, 290, 400], [70, 0, 70, 56], [70, 56, 400, 320], [180, 0, 180, 70], [180, 70, 400, 70], [240, 70, 240, 180], [240, 180, 400, 180], [130, 0, 180, 70]].forEach((l) => L(...l));
    g.fillStyle = MUTED; g.font = 'bold 12px Poppins, sans-serif';
    [['A', 330, 360], ['A', 360, 320], ['B', 260, 380], ['B', 360, 220], ['C', 140, 380], ['C', 160, 20], ['D', 20, 120], ['D', 370, 120], ['E', 20, 360], ['E', 370, 20]].forEach(([t, x, y]) => g.fillText(t, sx(x), sy(y)));
    g.fillStyle = color;
    for (const p of pairs) if (p.est != null) { g.globalAlpha = 0.7; g.beginPath(); g.arc(sx(Math.min(400, p.ref)), sy(Math.min(400, Math.max(0, p.est))), 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  return <Canvas draw={draw} height={300} deps={[pairs]} label="Clarke error grid: each dot is one reading, lab value across, estimate up" />;
}

// ---- small pieces -----------------------------------------------------------------------

const Pill = ({ q }) => {
  const [bg, fg, t] = q === 'good' ? ['#E3F5F3', '#075955', 'Signal good'] : q === 'fair' ? ['#FFF1DB', '#8A5300', 'Signal fair'] : ['#FDECEE', '#A81C2B', 'Signal poor'];
  return <span style={{ ...s('padding: 4px 10px; border-radius: 10px; font-size: 12px; font-weight: 700; white-space: nowrap'), background: bg, color: fg }}>{t}</span>;
};
function Tile({ name, value, unit, note, color = INK }) {
  return (
    <div style={s('flex: 1 1 140px; min-width: 0; padding: 14px; border-radius: 18px; background: #F5F7F8; display: flex; flex-direction: column; gap: 2px')}>
      <span style={s('font-size: 12px; font-weight: 600; color: #5B6672')}>{name}</span>
      <span style={s('display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap')}><span style={{ ...s('font-size: 30px; font-weight: 700; line-height: 1.1'), color }}>{value}</span><span style={s('font-size: 13px; color: #5B6672')}>{unit}</span></span>
      {note && <span style={s('font-size: 12px; color: #5B6672; line-height: 1.4')}>{note}</span>}
    </div>
  );
}
function Slider({ id, name, value, min, max, step = 1, unit, onChange }) {
  return (
    <div style={s('display: flex; flex-direction: column; gap: 6px')}>
      <label htmlFor={id} style={s('display: flex; justify-content: space-between; font-size: 14px; font-weight: 600')}><span>{name}</span><span style={s('color: #0B7A75')}>{value} {unit}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={s('width: 100%; accent-color: #0B7A75')} />
    </div>
  );
}
const Score = ({ acc, title, color }) => !acc ? <span style={s('font-size: 14px; color: #A81C2B')}>No usable readings: the signal was too poor (try less movement).</span> : (
  <div style={s('flex: 1 1 200px; display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 18px; background: #F5F7F8')}>
    <span style={{ ...s('font-size: 13px; font-weight: 700'), color }}>{title}</span>
    <span style={s('font-size: 14px; line-height: 1.6')}>Average error (MARD) <b>{acc.mard}%</b><br />Within ±15% <b>{acc.within15}%</b><br />Clarke zone A <b>{acc.zones.A}%</b> · A+B <b>{Math.round((acc.zones.A + acc.zones.B) * 10) / 10}%</b>{acc.skipped ? <><br />Skipped (poor signal) <b>{acc.skipped}</b></> : null}</span>
  </div>
);

// ---- the page ---------------------------------------------------------------------------

export default function Lab() {
  const [seed, setSeed] = useState(1);
  const [tone, setTone] = useState(4);
  const [cond, setCond] = useState({ sugar: 120, motion: 0, tempC: 33, sweat: 0 });
  const [view, setView] = useState({ raw: [], pulse: [], amps: [], est: null, packets: 0 });
  const [pairs, setPairs] = useState([]);
  const [prick, setPrick] = useState('');
  const [test, setTest] = useState(null);
  const [tones, setTones] = useState(null);
  const [busy, setBusy] = useState('');
  const [device, setDevice] = useState(null);
  const [devErr, setDevErr] = useState('');
  const person = useRef(null), sensor = useRef(null), win = useRef(null), raws = useRef([]), seq = useRef(0), inbox = useRef([]);
  const cal = pairs.length ? calibrate(pairs, model) : null;
  const calRef = useRef(cal); calRef.current = cal;

  // new simulated person (or skin tone): new sensor, fresh window, calibration cleared
  useEffect(() => {
    person.current = makePerson(seed, tone);
    sensor.current = new SimSensor(person.current, cond, seed);
    win.current = new Window(WINDOW); raws.current = []; setPairs([]); setTest(null);
  }, [seed, tone]);
  useEffect(() => { sensor.current && sensor.current.set(cond); }, [cond]);

  // live loop: 5 times a second read new light, every second run the engine
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (device) { const fs = inbox.current.splice(0); if (fs.length) win.current.push(join(fs)); }
      else {
        // simulated sensor → myDoc protocol packets → decoder (same path as real hardware)
        const { packets, seq: next } = encode(sensor.current.read(FS / 5), seq.current);
        seq.current = next;
        win.current.push(join(packets.map((b) => decode(b))));
      }
      if (!win.current.full || ++n % 5) return;
      const f = win.current.frame(), w = processWindow(f);
      let e = estimate(w, model, calRef.current);
      if (e.sugar != null) {
        raws.current = [...raws.current, e.raw].slice(-5);
        const sorted = [...raws.current].sort((a, b) => a - b), raw = sorted[sorted.length >> 1], c = calRef.current || { a: 0, b: 1 };
        e = { ...e, raw, sugar: Math.round(Math.max(20, c.a + c.b * raw)) };
      }
      const last = (a) => Array.from(a.slice(a.length - FS * 4));
      setView({ raw: [0, 4, 10].map((j) => last(f.channels[j])), pulse: last(w.pulse), amps: w.amps, est: e, packets: seq.current });
    }, 200);
    return () => clearInterval(t);
  }, [device]);

  const set = (patch) => setCond((c) => ({ ...c, ...patch }));
  const e = view.est;
  const suggestPrick = () => String(Math.round(cond.sugar * (0.96 + 0.08 * Math.random()))); // meters are within about ±4%

  const addPrick = () => {
    const ref = Number(prick);
    if (!e || e.sugar == null || !(ref >= 30 && ref <= 500)) return;
    setPairs((p) => [...p, { raw: e.raw, ref, at: Date.now() }]); setPrick(''); setTest(null);
  };
  const doTest = async () => {
    setBusy('test'); setTest(null);
    try { setTest(await runTest({ person: person.current, cond, cal, model, onProgress: (x) => setBusy('test ' + Math.round(x * 100) + '%') })); } finally { setBusy(''); }
  };
  const doTones = async () => {
    setBusy('tones'); setTones(null);
    try { setTones(await testSkinTones({ cond: { motion: cond.motion, tempC: 33, sweat: 0 }, model, onProgress: (x) => setBusy('tones ' + Math.round(x * 100) + '%') })); } finally { setBusy(''); }
  };
  const connect = async () => {
    setDevErr('');
    try {
      const d = await connectSensor((f) => inbox.current.push(f), () => { setDevice(null); setDevErr('The sensor disconnected.'); });
      win.current = new Window(WINDOW); raws.current = []; setPairs([]); setDevice(d);
    } catch (err) { if (err.name !== 'NotFoundError') setDevErr(err.message); }
  };

  const ampDraw = (g, w, h) => {
    const a = view.amps.slice(1), max = Math.max(...a.map(Math.abs), 1e-9), bw = w / a.length;
    g.font = '10px Poppins, sans-serif';
    a.forEach((v, i) => {
      const wl = WAVELENGTHS[i + 1], bh = (Math.abs(v) / max) * (h - 30);
      g.fillStyle = GLUCOSE_BANDS.includes(wl) ? RED : TEAL;
      g.fillRect(i * bw + 3, h - 16 - bh, bw - 6, bh);
      g.fillStyle = MUTED; g.save(); g.translate(i * bw + bw / 2 - 10, h - 3); g.fillText(wl, 0, 0); g.restore();
    });
  };

  return (
    <div style={s('min-height: 100dvh; background: #F5F7F8')}>
      <main style={s('max-width: 960px; margin: 0 auto; padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box')}>
        <header style={s('display: flex; flex-direction: column; gap: 8px')}>
          <div style={s('display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap')}><Logo size="md" /><span style={s('font-size: 22px; font-weight: 700')}>Sensor Lab</span></div>
          <p style={s('margin: 0; font-size: 15px; line-height: 1.6; color: #5B6672; max-width: 680px')}>The software that will run myDoc's optical wrist sensor. Light at 12 wavelengths shines into the skin; the engine reads what comes back and works out heart rate, oxygen and an estimate of blood sugar. Until the hardware exists, a simulated sensor stands in for it.</p>
          <div role="note" style={s('padding: 10px 14px; border-radius: 14px; background: #FFF1DB; color: #8A5300; font-size: 13px; line-height: 1.5; max-width: 680px')}><b>Experimental.</b> Blood sugar from light is still research worldwide. Estimates here are not for medical decisions; a finger-prick test stays the reference.</div>
        </header>

        <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start')}>
          <section style={s(box)} aria-labelledby="h-live">
            <div style={s('display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap')}>
              <h2 id="h-live" style={s(section + '; margin: 0')}>Live readings</h2>
              {e && <Pill q={e.quality} />}
            </div>
            {!e ? <span style={s('font-size: 14px; color: #5B6672')}>Collecting the first {WINDOW} seconds of signal…</span> : <>
              <div style={s('display: flex; gap: 10px; flex-wrap: wrap')}>
                <Tile name="Heart rate" value={e.bpm} unit="bpm" />
                <Tile name="Oxygen" value={e.spo2 ?? '–'} unit="%" />
              </div>
              <div style={s('padding: 16px; border-radius: 18px; border: 1.5px solid #E4E8EC; display: flex; flex-direction: column; gap: 4px')}>
                <span style={s('font-size: 12px; font-weight: 700; color: #8A5300; letter-spacing: 0.4px')}>BLOOD SUGAR · ESTIMATED (EXPERIMENTAL)</span>
                {e.sugar == null ? <span style={s('font-size: 18px; font-weight: 600; color: #A81C2B')}>{e.reason}</span> : <>
                  <span style={s('display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap')}><span style={s('font-size: 40px; font-weight: 700; line-height: 1.1')}>≈ {e.sugar}</span><span style={s('font-size: 16px; color: #5B6672')}>± {e.pm} mg/dL</span></span>
                  <span style={s('font-size: 13px; color: #5B6672')}>{cal ? `Calibrated with ${cal.n} finger-prick reading${cal.n > 1 ? 's' : ''}` : 'Not calibrated yet: add finger-prick readings below'}{!device && <> · true value {cond.sugar} mg/dL. After a change, allow about 2 minutes: sugar in the skin lags the blood.</>}</span>
                </>}
              </div>
            </>}
            <span style={s(label)}>Light at the wrist (530, 940, 1610 nm)</span>
            <Canvas height={90} deps={[view]} label="Raw light at three wavelengths" draw={(g, w, h) => { const third = h / 3; view.raw.forEach((d, i) => { g.save(); g.translate(0, i * third); line(g, d, w, third, [TEAL, AMBER, RED][i], 3); g.restore(); }); }} />
            <span style={s(label)}>Cleaned pulse wave</span>
            <Canvas height={80} deps={[view]} label="Pulse wave after cleaning" draw={(g, w, h) => line(g, view.pulse.map((v) => -v), w, h, RED)} />
            <span style={s(label)}>Pulse spectrum (blood only)</span>
            <Canvas height={130} deps={[view]} label="How much each wavelength changes with each heartbeat; red bars are glucose bands" draw={ampDraw} />
            <span style={s('font-size: 12px; color: #5B6672; line-height: 1.5')}>Each bar: how much that colour of light changes with every heartbeat. Only blood pulses, so this looks past skin, fat and bone. Red bars are where glucose absorbs light.</span>
          </section>

          <div style={s('display: flex; flex-direction: column; gap: 16px')}>
            <section style={s(box)} aria-labelledby="h-src">
              <h2 id="h-src" style={s(section + '; margin: 0')}>Sensor</h2>
              <span style={s('font-size: 14px; line-height: 1.5')}>{device ? <>Connected: <b>{device.name}</b></> : <>Simulated 12-wavelength sensor · {FS} samples a second · sent through the myDoc sensor protocol ({view.packets} packets so far)</>}</span>
              {device ? <button type="button" onClick={() => { device.disconnect(); setDevice(null); }} style={s(smallBtn + '; align-self: flex-start')}>Use the simulated sensor</button>
                : bluetoothAvailable() ? <button type="button" onClick={connect} style={s(smallBtn + '; align-self: flex-start')}>Connect a real sensor (Bluetooth)</button>
                : <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>A real sensor connects over Bluetooth in Chrome on Android, Windows or Mac.</span>}
              {devErr && <span role="alert" style={s('font-size: 13px; color: #A81C2B')}>{devErr}</span>}
            </section>

            {!device && <section style={s(box)} aria-labelledby="h-person">
              <div style={s('display: flex; justify-content: space-between; align-items: center; gap: 8px')}>
                <h2 id="h-person" style={s(section + '; margin: 0')}>The person wearing it</h2>
                <button type="button" onClick={() => setSeed((x) => x + 1)} style={s(smallBtn + '; height: 36px; padding: 0 12px; font-size: 13px')}>New person</button>
              </div>
              <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>Simulated person #{seed}. Every person's skin, hydration and wrist differ, which is why calibration matters.</span>
              <div style={s('display: flex; flex-direction: column; gap: 6px')}>
                <span style={s('font-size: 14px; font-weight: 600')}>Skin tone (Fitzpatrick)</span>
                <Seg options={SKIN.map((t, i) => [String(i), t])} value={String(tone)} onChange={(v) => setTone(Number(v))} bg="#F5F7F8" h={36} />
              </div>
              <Slider id="lab-sugar" name="True blood sugar" value={cond.sugar} min={40} max={350} unit="mg/dL" onChange={(v) => set({ sugar: v })} />
              <div style={s('display: flex; flex-direction: column; gap: 6px')}>
                <span style={s('font-size: 14px; font-weight: 600')}>Movement</span>
                <Seg options={MOVES} value={String(cond.motion)} onChange={(v) => set({ motion: Number(v) })} bg="#F5F7F8" h={36} />
              </div>
              <Slider id="lab-temp" name="Skin temperature" value={cond.tempC} min={28} max={37} step={0.5} unit="°C" onChange={(v) => set({ tempC: v })} />
              <Slider id="lab-sweat" name="Sweat" value={Math.round(cond.sweat * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => set({ sweat: v / 100 })} />
            </section>}

            <section style={s(box)} aria-labelledby="h-cal">
              <h2 id="h-cal" style={s(section + '; margin: 0')}>Calibration</h2>
              <span style={s('font-size: 14px; line-height: 1.5; color: #5B6672')}>Take a finger-prick reading while wearing the sensor and enter it here. One reading fixes the offset; two or more at different levels (for example before and after a meal) fix the slope too.</span>
              <div style={s('display: flex; gap: 8px; flex-wrap: wrap')}>
                <label htmlFor="lab-prick" style={s('position: absolute; left: -9999px')}>Finger-prick reading in mg/dL</label>
                <input id="lab-prick" inputMode="numeric" placeholder="Finger-prick mg/dL" value={prick} onChange={(ev) => setPrick(ev.target.value.replace(/\D/g, '').slice(0, 3))} style={s('flex: 1 1 140px; min-width: 0; height: 44px; border: 1.5px solid #D5DBE0; border-radius: 14px; padding: 0 12px; font-size: 16px; font-family: inherit')} />
                <button type="button" disabled={!e || e.sugar == null || !prick} onClick={addPrick} style={s(mainBtn + '; height: 44px')}>Add reading</button>
              </div>
              {!device && <button type="button" onClick={() => setPrick(suggestPrick())} style={s('align-self: flex-start; border: 0; background: none; padding: 0; color: #0B7A75; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: underline')}>Simulate a finger-prick (true value ± meter error)</button>}
              {pairs.length > 0 && <div style={s('display: flex; flex-direction: column; gap: 4px; font-size: 13px')}>
                {pairs.map((p, i) => <span key={i}>Finger-prick {p.ref} mg/dL · sensor said {Math.round(p.raw)}</span>)}
                <button type="button" onClick={() => { setPairs([]); setTest(null); }} style={s('align-self: flex-start; border: 0; background: none; padding: 4px 0; color: #A81C2B; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer')}>Clear calibration</button>
              </div>}
            </section>
          </div>
        </div>

        {!device && <section style={s(box)} aria-labelledby="h-test">
          <h2 id="h-test" style={s(section + '; margin: 0')}>Accuracy test</h2>
          <span style={s('font-size: 14px; line-height: 1.5; color: #5B6672; max-width: 680px')}>Runs 120 readings for this person between 55 and 330 mg/dL, with the movement, temperature and sweat set above, and scores them the way glucose meters are judged. Calibrate first to compare before and after.</span>
          <div style={s('display: flex; gap: 8px; flex-wrap: wrap')}>
            <button type="button" disabled={!!busy} onClick={doTest} style={s(mainBtn)}>{busy.startsWith('test') ? 'Testing… ' + busy.slice(5) : 'Run accuracy test'}</button>
            <button type="button" disabled={!!busy} onClick={doTones} style={s(smallBtn + '; height: 48px')}>{busy.startsWith('tones') ? 'Testing… ' + busy.slice(6) : 'Compare skin tones'}</button>
          </div>
          {test && <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; align-items: start')}>
            <div style={s('display: flex; flex-direction: column; gap: 10px')}>
              <div style={s('display: flex; gap: 10px; flex-wrap: wrap')}>
                <Score acc={test.accBefore} title="Before calibration" color={AMBER} />
                {test.accAfter && <Score acc={test.accAfter} title={`After calibration (${cal ? cal.n : 0} readings)`} color={TEAL} />}
              </div>
              <span style={s('font-size: 12px; color: #5B6672; line-height: 1.5')}>For comparison, approved finger-prick meters must have 95% within ±15%; good continuous glucose monitors (with a needle under the skin) reach about 8–10% MARD. Zone A is accurate, B is off but harmless, C–E could lead to the wrong treatment.</span>
            </div>
            <div>
              <Clarke pairs={test.accAfter ? test.after : test.before} color={test.accAfter ? TEAL : AMBER} />
              <span style={s('font-size: 12px; color: #5B6672')}>Clarke error grid ({test.accAfter ? 'after' : 'before'} calibration)</span>
            </div>
          </div>}
          {tones && <div style={s('display: flex; flex-direction: column; gap: 6px')}>
            <span style={s('font-size: 14px; font-weight: 600')}>Average error by skin tone (30 people each, no calibration)</span>
            <div style={s('display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px')}>
              {tones.map((a, i) => <div key={i} style={s('padding: 10px 4px; border-radius: 12px; background: #F5F7F8; text-align: center; font-size: 13px')}><b>{SKIN[i]}</b><br />{a ? a.mard + '%' : '–'}</div>)}
            </div>
            <span style={s('font-size: 12px; color: #5B6672; line-height: 1.5')}>Optical sensors have often worked worse on darker skin. The engine compares wavelengths with each other during each heartbeat, so skin colour mostly cancels out. This is a simulation: real devices must prove it in trials with people of every skin tone.</span>
          </div>}
        </section>}

        <section style={s(box)} aria-labelledby="h-how">
          <h2 id="h-how" style={s(section + '; margin: 0')}>How the engine works</h2>
          <ol style={s('margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; line-height: 1.55')}>
            <li><b>Light in, light back.</b> 12 LEDs from green (530 nm) to near-infrared (1690 nm) shine into the wrist; photodiodes measure what returns, {FS} times a second.</li>
            <li><b>Clean.</b> Light is turned into absorbance, slow drift is removed, and the accelerometer cancels the part caused by movement.</li>
            <li><b>Find the pulse.</b> The green channel gives the pulse wave: heart rate, and a quality score that withholds estimates when the signal is poor.</li>
            <li><b>Look only at blood.</b> How each wavelength changes with every heartbeat gives a spectrum of the blood alone. Red against infrared gives oxygen (the same method as a hospital pulse oximeter).</li>
            <li><b>Estimate sugar.</b> A model reads the glucose bands (1050, 1550–1690 nm) while allowing for water, fat, skin tone and temperature, and gives a value with ± and quality.</li>
            <li><b>Calibrate to the person.</b> A few finger-prick readings correct for that person's skin and wrist.</li>
            <li><b>Send to myDoc.</b> On the watch, estimates join the patient's readings, so caregivers see them, marked as estimated.</li>
          </ol>
          <span style={s('font-size: 13px; color: #5B6672; line-height: 1.5')}>Model: {model.trainedOn}; tested on {model.test.people} new simulated people: {model.test.uncalibrated.mard}% average error before calibration, {model.test.calibrated.mard}% after two finger-prick readings; oxygen within {Math.round(model.test.spo2MeanError * 10) / 10}% on average.</span>
        </section>

        <section style={s(box)} aria-labelledby="h-limits">
          <h2 id="h-limits" style={s(section + '; margin: 0')}>Honest limits</h2>
          <ul style={s('margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; line-height: 1.55')}>
            <li>All numbers on this page come from a simulated sensor and simulated people. The real accuracy can only come from building the sensor and testing it against blood tests in a clinical study.</li>
            <li><b>Serotonin can't be measured through the skin with light</b> (it is mostly in the gut and blood platelets, at very low levels). myDoc's migraine support uses signals the watch can measure: sleep, heart rate variability, stress and missed medicine.</li>
            <li>Plugging in hardware: a sensor that speaks the myDoc sensor protocol (Bluetooth, documented in the code) connects with the button above; the same engine then runs on its data. A different sensor needs its own model trained on its data.</li>
          </ul>
        </section>

        <nav style={s('display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; font-weight: 600')}>
          <a href="./">Open the myDoc phone app</a>
          <a href="./watch.html">Open the watch simulator</a>
        </nav>
      </main>
    </div>
  );
}

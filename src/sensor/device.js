// myDoc sensor protocol v1: how a real sensor (custom hardware or a watch) sends its
// light readings to the app over Bluetooth Low Energy. The simulated sensor uses the
// same encoder, so the decoding path is exercised even without hardware.
//
// Service  a3c8f0e0-6d79-446f-6300-000000000000
//   info   …0001 (read)   version u8, channels u8, rate u8, wavelengths u16×channels
//   data   …0002 (notify) packets below
// Packet (little-endian): 'M' 'D', version u8, samples u8, sequence u16, skin temp i16 (0.01 °C),
//   then per sample: light u16×channels (fraction of the LED's own output × 65535),
//   accelerometer i16×3 (milli-g). 5 samples = 158 bytes, fits one BLE notification.
import { WAVELENGTHS, FS } from './engine.js';

export const SERVICE = 'a3c8f0e0-6d79-446f-6300-000000000000';
export const INFO = 'a3c8f0e0-6d79-446f-6300-000000000001';
export const DATA = 'a3c8f0e0-6d79-446f-6300-000000000002';
const HEADER = 8, PER_PACKET = 5;

export function encode(frame, seq = 0) {
  const n = frame.channels.length, total = frame.channels[0].length, out = [];
  for (let start = 0; start < total; start += PER_PACKET) {
    const k = Math.min(PER_PACKET, total - start), buf = new DataView(new ArrayBuffer(HEADER + k * (n * 2 + 6)));
    buf.setUint8(0, 77); buf.setUint8(1, 68); buf.setUint8(2, 1); buf.setUint8(3, k);
    buf.setUint16(4, seq++ & 0xffff, true); buf.setInt16(6, Math.round(frame.tempC * 100), true);
    let o = HEADER;
    for (let i = start; i < start + k; i++) {
      for (let j = 0; j < n; j++) { buf.setUint16(o, Math.max(0, Math.min(65535, Math.round(frame.channels[j][i] / frame.i0[j] * 65535))), true); o += 2; }
      for (let a = 0; a < 3; a++) { buf.setInt16(o, Math.max(-32768, Math.min(32767, Math.round(frame.acc[a][i] * 1000))), true); o += 2; }
    }
    out.push(buf.buffer);
  }
  return { packets: out, seq };
}

// One packet → a small frame (light as a fraction of each LED's output, so i0 = 1).
export function decode(buffer, n = WAVELENGTHS.length) {
  const v = new DataView(buffer);
  if (v.getUint8(0) !== 77 || v.getUint8(1) !== 68) throw new Error('Not a myDoc sensor packet');
  if (v.getUint8(2) !== 1) throw new Error('Unsupported sensor protocol version ' + v.getUint8(2));
  const k = v.getUint8(3), channels = Array.from({ length: n }, () => new Float64Array(k)), acc = [0, 1, 2].map(() => new Float64Array(k));
  let o = HEADER;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) { channels[j][i] = Math.max(1, v.getUint16(o, true)) / 65535; o += 2; }
    for (let a = 0; a < 3; a++) { acc[a][i] = v.getInt16(o, true) / 1000; o += 2; }
  }
  return { seq: v.getUint16(4, true), tempC: v.getInt16(6, true) / 100, channels, acc, i0: new Array(n).fill(1) };
}

// Packets → one frame (in order).
export function join(frames) {
  const n = frames[0].channels.length;
  const cat = (get) => { const parts = frames.map(get), out = new Float64Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  return { channels: Array.from({ length: n }, (_, j) => cat((f) => f.channels[j])), acc: [0, 1, 2].map((a) => cat((f) => f.acc[a])), i0: frames[0].i0, tempC: frames[frames.length - 1].tempC };
}

export const bluetoothAvailable = () => typeof navigator !== 'undefined' && !!navigator.bluetooth;

// Connect to a real sensor. onFrame receives decoded frames as they arrive.
export async function connectSensor(onFrame, onGone) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE] }] });
  device.addEventListener('gattserverdisconnected', () => onGone && onGone());
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(SERVICE);
  const info = new DataView((await (await svc.getCharacteristic(INFO)).readValue()).buffer);
  const n = info.getUint8(1), rate = info.getUint8(2);
  const wl = Array.from({ length: n }, (_, j) => info.getUint16(3 + j * 2, true));
  if (rate !== FS || wl.join() !== WAVELENGTHS.join()) throw new Error(`This sensor (${n} wavelengths, ${rate} Hz) needs a matching model`);
  const data = await svc.getCharacteristic(DATA);
  data.addEventListener('characteristicvaluechanged', (e) => onFrame(decode(e.target.value.buffer.slice(e.target.value.byteOffset, e.target.value.byteOffset + e.target.value.byteLength), n)));
  await data.startNotifications();
  return { name: device.name || 'myDoc sensor', disconnect: () => device.gatt.disconnect() };
}

// myDoc push service (Cloudflare Worker, free plan). Sends alerts to caregivers' phones
// even when the myDoc app is closed, using standard Web Push (encrypted, VAPID-signed).
//
// GET  /key   → the public key phones subscribe with
// POST /send  { pid, title, body, tag, url, urgent }  with  Authorization: Bearer <Firebase ID token>
//   The worker reads patients/{pid} and patients/{pid}/push as the caller (so Firestore's
//   own rules decide who may send), then pushes to every subscription of a current caregiver.
// The private key is the worker secret VAPID_JWK (created once by the GitHub workflow).

const ALLOWED = ['https://automateeaseai-arch.github.io', 'http://localhost'];
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ALLOWED.some((a) => o === a || o.startsWith(a + ':'));
  return { 'Access-Control-Allow-Origin': ok ? o : ALLOWED[0], 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' };
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });

const publicKey = (jwk) => b64u(concat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y)));

// ---- Firestore (REST, as the caller) -------------------------------------------------
const value = (v) => {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
  if ('mapValue' in v) return fields(v.mapValue.fields);
  return null;
};
const fields = (f = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, value(v)]));
async function firestore(env, token, path, method = 'GET') {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT}/databases/(default)/documents/${path}${method === 'GET' && path.split('/').length % 2 ? '?pageSize=300' : ''}`, { method, headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) { const e = new Error('firestore ' + r.status); e.status = r.status; throw e; }
  return r.json();
}

// ---- Web Push (RFC 8291 encryption, RFC 8292 VAPID) -------------------------------------
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}
async function encrypt(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const ua = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, body);
}
async function vapid(env, jwk, endpoint) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.CONTACT })));
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${publicKey(jwk)}`;
}
async function push(env, jwk, sub, message, urgent) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapid(env, jwk, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: urgent ? 'high' : 'normal' },
    body: await encrypt(sub, JSON.stringify(message))
  });
  return r.status;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    if (!env.VAPID_JWK) return json(req, { error: 'not-ready' }, 503);
    const jwk = JSON.parse(env.VAPID_JWK);
    if (url.pathname === '/key') return json(req, { key: publicKey(jwk) });
    if (url.pathname !== '/send' || req.method !== 'POST') return json(req, { error: 'not-found' }, 404);

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
    let m;
    try { m = await req.json(); } catch { return json(req, { error: 'bad-request' }, 400); }
    if (!token || !/^[\w-]{1,64}$/.test(m.pid || '')) return json(req, { error: 'bad-request' }, 400);
    let patient, subs;
    try {
      patient = fields((await firestore(env, token, 'patients/' + m.pid)).fields);
      subs = ((await firestore(env, token, `patients/${m.pid}/push`)).documents || []).map((d) => ({ path: d.name.split('/documents/')[1], ...fields(d.fields) }));
    } catch (e) { return json(req, { error: 'not-allowed' }, e.status === 401 || e.status === 403 ? 403 : 502); }
    // only people who are still caregivers (a removed caregiver's old subscription is skipped and deleted)
    const carers = new Set(patient.carers || []);
    // each caregiver's own alert settings (from the app's Profile), and quiet hours 22:00–06:00
    const wanted = (s) => {
      if (m.type === 'reading' && s.range === false) return false;
      if (m.type === 'dose' && s.doses === false) return false;
      if (s.quiet && m.type !== 'sos') { const h = new Date(Date.now() - (s.tz || 0) * 60000).getUTCHours(); if (h >= 22 || h < 6) return false; }
      return true;
    };
    const message = { title: String(m.title || 'myDoc').slice(0, 120), body: String(m.body || '').slice(0, 300), tag: String(m.tag || '').slice(0, 80), url: String(m.url || './').slice(0, 200), urgent: !!m.urgent };
    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      if (!carers.has(s.uid) || !s.endpoint || !s.keys) { await firestore(env, token, s.path, 'DELETE').catch(() => {}); return; }
      if (!wanted(s)) return;
      const status = await push(env, jwk, s, message, m.urgent).catch(() => 0);
      if (status === 404 || status === 410) await firestore(env, token, s.path, 'DELETE').catch(() => {}); // phone unsubscribed
      else if (status >= 200 && status < 300) sent++;
    }));
    return json(req, { sent, of: subs.length });
  }
};

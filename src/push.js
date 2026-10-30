// Alerts when myDoc is closed: Web Push through the myDoc push service (push/worker.js,
// Cloudflare's free plan). A caregiver's phone subscribes once; the subscription is saved
// under each person they look after (patients/{pid}/push/{uid_device}) with their alert
// settings. The watch asks the push service to notify after it raises an alert.
import * as be from './backend/index.js';

export const PUSH_URL = 'https://mydoc-push.automateeaseai.workers.dev';

export const pushSupported = () => be.online && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && location.protocol === 'https:';
// iPhone: only works once myDoc is added to the Home Screen.
export const needsHomeScreen = () => /iPhone|iPad/.test(navigator.userAgent) && !('PushManager' in window);

const deviceId = (endpoint) => [...endpoint].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function current() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Turn on: ask permission, subscribe, save under every person. Returns 'on' or a reason.
export async function enablePush(uid, people, settings) {
  if (!pushSupported()) return needsHomeScreen() ? 'homescreen' : 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'blocked';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { key } = await (await fetch(PUSH_URL + '/key')).json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(key) });
  }
  await savePush(uid, people, settings, sub);
  return 'on';
}

// Save (or refresh) this phone's subscription and alert settings under each person.
export async function savePush(uid, people, settings, sub) {
  sub = sub || (pushSupported() && Notification.permission === 'granted' ? await current() : null);
  if (!sub) return;
  const j = sub.toJSON();
  const doc = { uid, endpoint: j.endpoint, keys: j.keys, range: !!settings.range, doses: !!settings.doses, quiet: !!settings.quiet, tz: new Date().getTimezoneOffset(), at: Date.now() };
  await Promise.all(people.map((p) => be.setDoc(`patients/${p.id}/push/${uid}_${deviceId(j.endpoint)}`, doc).catch(() => {})));
}

export async function disablePush(uid, people) {
  const sub = pushSupported() ? await current() : null;
  if (!sub) return;
  const id = uid + '_' + deviceId(sub.endpoint);
  await Promise.all(people.map((p) => be.deleteDoc(`patients/${p.id}/push/${id}`).catch(() => {})));
  await sub.unsubscribe();
}
export const pushIsOn = async () => !!(pushSupported() && Notification.permission === 'granted' && (await current()));

// Watch side: notify the person's caregivers (best effort; the alert is saved either way).
export async function sendPush(pid, msg) {
  if (!be.online || !PUSH_URL) return;
  try {
    const token = await be.idToken();
    if (!token) return;
    await fetch(PUSH_URL + '/send', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, ...msg }) });
  } catch { /* offline: caregivers still see the alert when they open myDoc */ }
}

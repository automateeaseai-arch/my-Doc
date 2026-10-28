// "This phone only" backend: the same calls as firebase.js, kept in localStorage.
// Tabs of the same browser see each other's changes (BroadcastChannel), so the
// caregiver app and the watch simulator can be tested side by side on one device.

const DB_KEY = 'mydoc.db';
const USERS_KEY = 'mydoc.users';
const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mydoc') : null;

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };

let docs = read(DB_KEY, {});
const listeners = new Set();
const fire = () => { for (const l of listeners) l.check(); };
const changed = () => { write(DB_KEY, docs); fire(); chan && chan.postMessage('db'); };
const reload = () => { docs = read(DB_KEY, {}); fire(); };
if (chan) chan.onmessage = (e) => { if (e.data === 'db') reload(); else if (e.data === 'auth') authReload(); };
addEventListener('storage', (e) => { if (e.key === DB_KEY) reload(); });

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const merge = (a, b) => {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? merge(out[k], v) : v;
  return out;
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const getDoc = async (path) => { const d = docs[path]; return d ? { id: path.split('/').pop(), ...clone(d) } : null; };
export const setDoc = async (path, data, opts = {}) => { docs[path] = opts.merge ? merge(docs[path], clone(data)) : clone(data); changed(); };
// Like Firestore's updateDoc: replaces the named top-level fields, keeps the rest.
export const updateDoc = async (path, data) => { if (!docs[path]) throw new Error('not-found'); docs[path] = { ...docs[path], ...clone(data) }; changed(); };
export const addDoc = async (col, data) => { const id = newId(); await setDoc(col + '/' + id, data); return id; };
export const deleteDoc = async (path) => {
  for (const k of Object.keys(docs)) if (k === path || k.startsWith(path + '/')) delete docs[k];
  changed();
};

const runQuery = (col, q = {}) => {
  const depth = col.split('/').length + 1;
  let rows = Object.entries(docs)
    .filter(([k]) => k.startsWith(col + '/') && k.split('/').length === depth)
    .map(([k, v]) => ({ id: k.split('/').pop(), ...clone(v) }));
  if (q.where) {
    const [f, op, val] = q.where;
    rows = rows.filter((r) => (op === 'array-contains' ? (r[f] || []).includes(val) : op === '>=' ? r[f] >= val : r[f] === val));
  }
  if (q.orderBy) { const [f, dir] = q.orderBy; rows.sort((a, b) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
  if (q.limit) rows = rows.slice(0, q.limit);
  return rows;
};
export const getCol = async (col, q) => runQuery(col, q);

const watch = (compute, cb) => {
  const l = { last: undefined, check() { const v = compute(); const s = JSON.stringify(v); if (s !== l.last) { l.last = s; cb(v); } } };
  listeners.add(l);
  queueMicrotask(() => l.check());
  return () => listeners.delete(l);
};
export const watchDoc = (path, cb) => watch(() => (docs[path] ? { id: path.split('/').pop(), ...clone(docs[path]) } : null), cb);
export const watchCol = (col, q, cb) => watch(() => runQuery(col, q), cb);

// ---- accounts ---------------------------------------------------------------

let scope = 'app';
let current = null;
const authSubs = new Set();
const sessionKey = () => 'mydoc.session.' + scope;
const authReload = () => {
  const uid = read(sessionKey(), null);
  const users = read(USERS_KEY, {});
  const u = uid && Object.values(users).find((x) => x.uid === uid);
  const next = u ? { uid: u.uid, name: u.name, email: u.email, anon: !!u.anon } : null;
  if (JSON.stringify(next) !== JSON.stringify(current)) { current = next; authSubs.forEach((f) => f(current)); }
};
const setSession = (uid) => { write(sessionKey(), uid); authReload(); chan && chan.postMessage('auth'); };

const hash = async (s) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mydoc:' + s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const fail = (code) => { const e = new Error(code); e.code = code; throw e; };

export const init = (s) => { scope = s; authReload(); };
export const onAuth = (cb) => { authSubs.add(cb); queueMicrotask(() => cb(current)); return () => authSubs.delete(cb); };
export const signUp = async ({ name, email, password }) => {
  const users = read(USERS_KEY, {}), key = email.trim().toLowerCase();
  if (users[key]) fail('auth/email-already-in-use');
  const uid = 'u' + newId();
  users[key] = { uid, name: name.trim(), email: key, hash: await hash(password) };
  write(USERS_KEY, users);
  setSession(uid);
};
export const signIn = async ({ email, password }) => {
  const u = read(USERS_KEY, {})[email.trim().toLowerCase()];
  if (!u || u.hash !== (await hash(password))) fail('auth/invalid-credential');
  setSession(u.uid);
};
export const signInAnon = async () => {
  const users = read(USERS_KEY, {}), uid = 'w' + newId();
  users['watch:' + uid] = { uid, name: 'Watch', anon: true };
  write(USERS_KEY, users);
  setSession(uid);
};
export const signInGoogle = async () => fail('auth/operation-not-supported-in-this-environment');
export const resetPassword = async () => fail('auth/operation-not-supported-in-this-environment');
export const signOut = async () => setSession(null);
export const setName = async (name) => {
  const users = read(USERS_KEY, {});
  for (const u of Object.values(users)) if (current && u.uid === current.uid) u.name = name;
  write(USERS_KEY, users);
  authReload();
};
export const clearAll = () => { docs = {}; changed(); for (const k of [USERS_KEY, 'mydoc.session.app', 'mydoc.session.watch']) localStorage.removeItem(k); authReload(); };

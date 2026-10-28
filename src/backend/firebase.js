// Online backend (Firebase Auth + Firestore). Same calls as local.js.
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, updateProfile, signOut as fbSignOut
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, doc, collection, getDoc as fGet, getDocs, setDoc as fSet, updateDoc as fUpdate,
  addDoc as fAdd, deleteDoc as fDelete, onSnapshot, query, where, orderBy, limit
} from 'firebase/firestore';
import { firebaseConfig } from './config.js';

let auth, db;
// The phone app and the watch simulator use separate app names, so each keeps
// its own sign-in even when both are open in the same browser.
export const init = (scope) => {
  const app = initializeApp(firebaseConfig, scope);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
};

const user = (u) => (u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', anon: u.isAnonymous } : null);
// Firebase doesn't announce name changes, so they are passed on to listeners here.
const authSubs = new Set();
const announce = () => authSubs.forEach((cb) => cb(user(auth.currentUser)));
export const onAuth = (cb) => { authSubs.add(cb); const stop = onAuthStateChanged(auth, (u) => cb(user(u))); return () => { authSubs.delete(cb); stop(); }; };
export const signUp = async ({ name, email, password }) => {
  const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(u, { displayName: name.trim() });
  await u.reload();
  announce();
};
export const signIn = ({ email, password }) => signInWithEmailAndPassword(auth, email.trim(), password);
export const signInAnon = () => signInAnonymously(auth);
export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const signOut = () => fbSignOut(auth);
export const setName = async (name) => { await updateProfile(auth.currentUser, { displayName: name }); announce(); };
export const clearAll = () => {};

export const newId = () => doc(collection(db, '_')).id;
const snap = (s) => (s.exists() ? { id: s.id, ...s.data() } : null);
const q = (col, o = {}) => {
  const parts = [];
  if (o.where) parts.push(where(...o.where));
  if (o.orderBy) parts.push(orderBy(...o.orderBy));
  if (o.limit) parts.push(limit(o.limit));
  return query(collection(db, col), ...parts);
};
export const getDoc = async (path) => snap(await fGet(doc(db, path)));
export const setDoc = (path, data, opts = {}) => fSet(doc(db, path), data, opts.merge ? { merge: true } : {});
export const updateDoc = (path, data) => fUpdate(doc(db, path), data);
export const addDoc = async (col, data) => (await fAdd(collection(db, col), data)).id;
export const deleteDoc = (path) => fDelete(doc(db, path));
export const getCol = async (col, o) => (await getDocs(q(col, o))).docs.map(snap);
// A listener started just after its parent document was created can be refused
// before the server has saved that document, so refused listeners try again.
const keepWatching = (start, onFail) => {
  let stop = () => {}, timer, closed = false, wait = 1000;
  const run = () => {
    stop = start((e) => {
      console.warn('myDoc: cannot read yet', e.code);
      onFail();
      if (!closed && e.code === 'permission-denied' && wait <= 32000) { timer = setTimeout(run, wait); wait *= 2; }
    });
  };
  run();
  return () => { closed = true; clearTimeout(timer); stop(); };
};
export const watchDoc = (path, cb) => keepWatching((fail) => onSnapshot(doc(db, path), (s) => cb(snap(s)), fail), () => cb(null));
export const watchCol = (col, o, cb) => keepWatching((fail) => onSnapshot(q(col, o), (s) => cb(s.docs.map(snap)), fail), () => cb([]));

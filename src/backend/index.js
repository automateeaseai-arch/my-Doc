// Picks the online backend when Firebase settings are filled in, else "this phone only".
import { firebaseConfig } from './config.js';
import * as local from './local.js';

export const online = !!firebaseConfig.apiKey && !import.meta.env.VITE_LOCAL; // VITE_LOCAL=1 builds a this-phone-only copy for testing
let impl = local;

// Call once at start-up with 'app' (phone app) or 'watch' (watch simulator).
export async function start(scope) {
  if (online) impl = await import('./firebase.js');
  impl.init(scope);
}

const call = (name) => (...a) => impl[name](...a);
export const onAuth = call('onAuth');
export const signUp = call('signUp');
export const signIn = call('signIn');
export const signInAnon = call('signInAnon');
export const signInGoogle = call('signInGoogle');
export const resetPassword = call('resetPassword');
export const signOut = call('signOut');
export const idToken = call('idToken');
export const setName = call('setName');
export const clearAll = call('clearAll');
export const newId = call('newId');
export const getDoc = call('getDoc');
export const setDoc = call('setDoc');
export const updateDoc = call('updateDoc');
export const addDoc = call('addDoc');
export const deleteDoc = call('deleteDoc');
export const getCol = call('getCol');
export const watchDoc = call('watchDoc');
export const watchCol = call('watchCol');

// Plain-language messages for sign-in errors.
export const authMessage = (e) => ({
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/invalid-credential': 'That email and password don\'t match an account.',
  'auth/wrong-password': 'That email and password don\'t match an account.',
  'auth/user-not-found': 'That email and password don\'t match an account.',
  'auth/invalid-email': 'Check the email address.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/too-many-requests': 'Too many tries. Wait a minute, then try again.',
  'auth/network-request-failed': 'No internet connection. Check it and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/operation-not-supported-in-this-environment': 'This works once myDoc is connected online.'
}[e && e.code] || 'Something went wrong. Please try again.');

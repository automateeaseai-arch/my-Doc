// Checks the live push service end to end with a throwaway anonymous user:
// a patient record, a caregiver subscription (and a removed caregiver's), then /send.
const [url, apiKey, project] = process.argv.slice(2);
const fs = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const r = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, { method: 'POST', body: '{"returnSecureToken":true}', headers: { 'Content-Type': 'application/json' } })).json();
const H = { Authorization: 'Bearer ' + r.idToken, 'Content-Type': 'application/json' };
const pid = 'selftest' + Date.now(), S = (v) => ({ stringValue: v });
const put = (path, fields) => fetch(`${fs}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
const ok = (name, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) process.exitCode = 1; };
await put('patients/' + pid, { watchUid: S(r.localId), name: S('Self test'), carers: { arrayValue: { values: [S(r.localId)] } } });
const sub = (uid) => ({ uid: S(uid), endpoint: S('https://fcm.googleapis.com/fcm/send/selftest-not-a-real-phone'), keys: { mapValue: { fields: { p256dh: S('BOr2mYCnEchB7bBY4nLq0n8h0V5cB9Jx3k3s4V7pHWmQyJk0E2q9hZr5cQpOa8yYb2fQ3eW1u7mGqjXj8Wc5i0E'), auth: S('8eDyX_uCN0XRhSbY5hs7Hg') } } } });
await put(`patients/${pid}/push/carer`, sub(r.localId));
await put(`patients/${pid}/push/removed`, sub('someone-removed'));
const send = async (token, body) => { const x = await fetch(url + '/send', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Origin: 'https://automateeaseai-arch.github.io' }, body: JSON.stringify(body) }); return [x.status, await x.json().catch(() => null), x.headers.get('access-control-allow-origin')]; };
const [st, res, origin] = await send(r.idToken, { pid, type: 'reading', title: 'Self test', body: 'ignore' });
ok(`send as the watch: ${st} ${JSON.stringify(res)}`, st === 200 && res.of === 2);
ok('allowed from the app address', origin === 'https://automateeaseai-arch.github.io');
const left = await (await fetch(`${fs}/patients/${pid}/push`, { headers: H })).json();
ok('removed caregiver\'s subscription deleted', !(left.documents || []).some((d) => d.name.endsWith('/removed')));
const [st2] = await send('not-a-token', { pid, title: 'x' });
ok(`stranger refused: ${st2}`, st2 === 403);
for (const d of left.documents || []) await fetch(`https://firestore.googleapis.com/v1/${d.name}`, { method: 'DELETE', headers: H });
await fetch(`${fs}/patients/${pid}`, { method: 'DELETE', headers: H });
await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: r.idToken }) });
console.log('cleaned up');

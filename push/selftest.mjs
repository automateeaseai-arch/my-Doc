// Checks the live push service end to end with a throwaway anonymous user:
// a patient record, a caregiver subscription (and a removed caregiver's), then /send.
const [url, apiKey, project] = process.argv.slice(2);
const fs = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const r = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, { method: 'POST', body: '{"returnSecureToken":true}', headers: { 'Content-Type': 'application/json' } })).json();
const H = { Authorization: 'Bearer ' + r.idToken, 'Content-Type': 'application/json' };
const pid = 'selftest' + Date.now(), S = (v) => ({ stringValue: v });
const put = (path, fields) => fetch(`${fs}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
const ok = (name, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) process.exitCode = 1; };
// the watch creates its record with no caregivers, then accepts one (here: itself)
const mk = await fetch(`${fs}/patients?documentId=${pid}`, { method: 'POST', headers: H, body: JSON.stringify({ fields: { watchUid: S(r.localId), name: S('Self test'), carers: { arrayValue: {} } } }) });
ok(`record created: ${mk.status}`, mk.ok);
const carers = (list) => fetch(`${fs}/patients/${pid}?updateMask.fieldPaths=carers`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { carers: { arrayValue: { values: list.map(S) } } } }) });
await carers([r.localId]);
const sub = (endpoint) => ({ uid: S(r.localId), endpoint: S(endpoint), keys: { mapValue: { fields: { p256dh: S('BOr2mYCnEchB7bBY4nLq0n8h0V5cB9Jx3k3s4V7pHWmQyJk0E2q9hZr5cQpOa8yYb2fQ3eW1u7mGqjXj8Wc5i0E'), auth: S('8eDyX_uCN0XRhSbY5hs7Hg') } } } });
ok('subscription saved: ' + (await put(`patients/${pid}/push/phone`, sub('https://fcm.googleapis.com/fcm/send/selftest-not-a-real-phone'))).status, true);
await put(`patients/${pid}/push/odd`, sub('https://example.com/not-a-push-service'));
const send = async (token, body) => { const x = await fetch(url + '/send', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Origin: 'https://automateeaseai-arch.github.io' }, body: JSON.stringify(body) }); return [x.status, await x.json().catch(() => null), x.headers.get('access-control-allow-origin')]; };
const list = async () => ((await (await fetch(`${fs}/patients/${pid}/push`, { headers: H })).json()).documents || []).map((d) => d.name.split('/').pop());
const [st, res, origin] = await send(r.idToken, { pid, type: 'reading', title: 'Self test', body: 'ignore', url: 'https://example.com/elsewhere' });
ok(`send as the watch: ${st} ${JSON.stringify(res)}`, st === 200 && res.of === 2);
ok('allowed from the app address', origin === 'https://automateeaseai-arch.github.io');
ok('subscription to an unknown address removed', !(await list()).includes('odd'));
await carers([]);
await send(r.idToken, { pid, type: 'reading', title: 'Self test', body: 'ignore' });
ok('removed caregiver\'s subscription deleted', (await list()).length === 0);
const [st2] = await send('not-a-token', { pid, title: 'x' });
ok(`stranger refused: ${st2}`, st2 === 403);
const left = { documents: [] };
for (const d of left.documents || []) await fetch(`https://firestore.googleapis.com/v1/${d.name}`, { method: 'DELETE', headers: H });
await fetch(`${fs}/patients/${pid}`, { method: 'DELETE', headers: H });
await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: r.idToken }) });
console.log('cleaned up');

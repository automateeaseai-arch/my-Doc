// Prints a new VAPID private key (JWK) for the worker secret. Run once by the workflow.
const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const jwk = await crypto.subtle.exportKey('jwk', k.privateKey);
process.stdout.write(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y }));

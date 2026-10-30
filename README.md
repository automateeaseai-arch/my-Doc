# myDoc

Mobile web app (installable PWA) for caregivers: see the vitals and medication of the people you care for, get alerts, call for help and share their location. Built from the myDoc HiFi phone designs.

Live: https://automateeaseai-arch.github.io/my-Doc/ · Watch simulator: https://automateeaseai-arch.github.io/my-Doc/watch.html

## How it works

- **Phone app** (`index.html`): caregiver accounts, people, contacts, medicine, alerts.
- **Watch simulator** (`watch.html`): stands in for a smartwatch until there is hardware. Setup asks who wears it:
  - **Patient**: name, conditions and emergency contact; the watch then works on its own. Settings › Pair with a caregiver shows a code; whoever types it is asked for on the watch ("Allow … to see your health?"). Any number of caregivers; Settings › My caregivers removes them. Sends readings, doses taken, location, battery, SOS and alerts, as a real watch app would.
  - **Caregiver**: Settings › Link to my phone shows a code for the phone (Profile › Pair a watch). Shows the same people, readings, medicine and alerts as the phone; full-screen alerts; call, locate, 112; + adds a person by their watch's code (they accept on their watch).
- **Backend**: Firebase (Auth + Firestore) once `src/backend/config.js` is filled in. Until then everything runs "this phone only" (localStorage), and the app and simulator see each other in two tabs of the same browser.

## Firebase setup (once)

1. Firebase console → create project → add a Web app → copy its settings into `src/backend/config.js`.
2. Authentication → Sign-in method: enable **Email/Password**, **Google** and **Anonymous** (the watch signs in anonymously).
3. Authentication → Settings → Authorized domains: add `automateeaseai-arch.github.io`.
4. Firestore Database → create (production mode) → Rules: paste `firestore.rules` → Publish.

## Run it

```
npm install
npm run dev      # http://localhost:5173 (and /watch.html)
npm run build    # static files in dist/
```

## Publish

`tools/deploy-pages.sh` builds the app and pushes it to the `gh-pages` branch, served by GitHub Pages.

## Code map (`src/`)

| File | What it does |
|---|---|
| `backend/` | `index.js` picks Firebase or local; `firebase.js` and `local.js` offer the same calls; `config.js` holds the Firebase settings |
| `health.js` | Normal ranges, units, dose status, time helpers (shared by app and watch) |
| `live.js` | The caregiver's live data (people, today's doses, alerts) and actions (add person, medicine, mark taken, pair, remind) |
| `store.js` | Settings kept on this phone (selected person, units, alert switches) |
| `ui.jsx` | Router, shared parts, icons |
| `screens/` | Phone screens (start, home, person) |
| `watch/` | Watch simulator: `sim.js` (setup, pairing, readings, scenarios, SOS, dose reminders), `Watch.jsx` (patient faces + test controls), `Carer.jsx` (caregiver faces) |
| `index.css` | Motion (pulse, sheets, pop, tick draw); off for reduced motion |

## Data (Firestore)

- `patients/{id}`: name, conditions, contacts, medicine list, caregivers, linked watch, latest readings (`recent`), daily averages (`days`), location, SOS
- `patients/{id}/readings`, `/doselog/{YYYY-MM-DD}`, `/alerts`
- `codes/{6 digits}`: pairing handshake

## Alerts when the app is closed (`push/`, `src/push.js`)
Free, no card: a Cloudflare Worker (`push/worker.js`) at https://mydoc-push.automateeaseai.workers.dev sends standard Web Push.
- Caregiver: Profile → **Alerts when myDoc is closed**. The phone's subscription and alert settings are saved under each person (`patients/{pid}/push/{uid_device}`).
- Watch: after saving an alert it calls `/send` with its Firebase sign-in; the worker reads the person's record as the watch (Firestore rules decide), and notifies only current caregivers, skipping alert types they turned off and quiet hours (SOS always rings).
- Installed by `.github/workflows/push-worker.yml` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`); the signing key is created once as the worker secret `VAPID_JWK`; `push/selftest.mjs` checks the live service after each install.
- iPhone: works only after Share → Add to Home Screen (iOS 16.4+).

## Sensor engine (`src/sensor/`, page `lab.html`)
Software for an optical (spectrophotometric) wrist sensor, ready before the hardware exists. **Experimental: not for medical decisions.**
- `engine.js`: light at 12 wavelengths (530–1690 nm) → absorbance, drift removal, movement cancelled with the accelerometer → pulse wave (heart rate, signal quality) → pulse spectrum (blood only) → oxygen (red/infrared ratio) and a blood-sugar estimate with ± and quality → personal calibration from finger-pricks → accuracy scoring (MARD, ±15%, Clarke error grid).
- `simsensor.js`: simulated sensor and people (skin tone, hydration, fat, temperature, sweat, movement, noise, person-to-person optics).
- `device.js`: myDoc sensor protocol v1 over Bluetooth (service and packet format in the file). The simulator's data goes through the same encoder and decoder; "Connect a real sensor" uses Web Bluetooth.
- `model.json`: trained by `node tools/train-sensor.mjs` (1,200 simulated readings, 400 people). On 120 new simulated people: 15.8% average error before calibration, 7% after two finger-pricks; oxygen within 0.6%. These are simulated numbers; real accuracy needs the hardware and a clinical study.
- Watch simulator switch "Blood sugar from the optical sensor engine": sugar readings are estimated by the engine and stored with `est: { pm, q }`; the phone shows them as estimated.
- Serotonin cannot be measured through the skin with light; migraine support should use sleep, heart rate variability, stress and missed medicine.

## Limits today

- Alerts pop up only while the phone app is open (or in the background tab). Push notifications to a closed app need a small server (Firebase Cloud Functions, Blaze plan).
- Missed-dose alerts are raised by the watch, so only while the simulator is open.
- myDoc cannot contact 112 by itself: the emergency screen calls 112 and texts the emergency contact from the caregiver's phone.
- Serotonin is a preview with example values; no watch can measure it.
- The map is a drawing; Directions opens Google Maps at the real coordinates.

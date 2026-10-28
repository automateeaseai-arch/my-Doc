# myDoc

Mobile web app (installable PWA) for caregivers: see the vitals and medication of the people you care for, get alerts, call for help and share their location. Built from the myDoc HiFi phone designs.

Live: https://automateeaseai-arch.github.io/my-Doc/ · Watch simulator: https://automateeaseai-arch.github.io/my-Doc/watch.html

## How it works

- **Phone app** (`index.html`): caregiver accounts, people, contacts, medicine, alerts.
- **Watch simulator** (`watch.html`): stands in for the patient's smartwatch until there is hardware. It pairs with a 6-digit code and writes exactly what a real watch app will write: readings, doses taken, location, battery, SOS, alerts.
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
| `watch/` | Watch simulator: `sim.js` (pairing, readings, scenarios, SOS, dose reminders), `Watch.jsx` (watch faces from the designs + test controls) |
| `index.css` | Motion (pulse, sheets, pop, tick draw); off for reduced motion |

## Data (Firestore)

- `patients/{id}`: name, conditions, contacts, medicine list, caregivers, linked watch, latest readings (`recent`), daily averages (`days`), location, SOS
- `patients/{id}/readings`, `/doselog/{YYYY-MM-DD}`, `/alerts`
- `codes/{6 digits}`: pairing handshake

## Limits today

- Alerts pop up only while the phone app is open (or in the background tab). Push notifications to a closed app need a small server (Firebase Cloud Functions, Blaze plan).
- Missed-dose alerts are raised by the watch, so only while the simulator is open.
- myDoc cannot contact 112 by itself: the emergency screen calls 112 and texts the emergency contact from the caregiver's phone.
- Serotonin is a preview with example values; no watch can measure it.
- The map is a drawing; Directions opens Google Maps at the real coordinates.

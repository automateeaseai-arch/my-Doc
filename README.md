# myDoc

Mobile web app (installable PWA) for caregivers: see the vitals and medication of the people you care for, get alerts, call for help and share their location. Built from the myDoc HiFi phone designs.

Sample data only: no real watch connection, calls or messages yet. Everything the user changes (doses taken, people, contacts, settings) is saved on the phone.

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static files in dist/
```

## Publish

`tools/deploy-pages.sh` builds the app and pushes it to the `gh-pages` branch, served by GitHub Pages at https://automateeaseai-arch.github.io/my-Doc/ (Settings → Pages → Deploy from a branch → gh-pages).

## Code map (`src/`)

| File | What it does |
|---|---|
| `data.js` | Sample people, readings, normal ranges, alerts |
| `store.js` | Saved state (localStorage), today's dose status from the clock |
| `ui.jsx` | Hash router, shared parts (logo, nav, toggles), icons |
| `screens/start.jsx` | Welcome, Sign in, Set up a person (emergency contacts), Pair watch, Watch linked |
| `screens/home.jsx` | Home carousel, Alerts, Daily summary (pops up after 20:00), Profile |
| `screens/person.jsx` | Health parameters, reading detail, Call sheet, Locate, Sent, Medication, Serotonin |
| `index.css` | Motion: pulse, sheet slide-up, pop, tick draw, bar grow (off for reduced motion) |

## Safety in the test version

- Call buttons for people show a message; they don't dial the sample numbers.
- "Call 112" asks first, then dials the real 112.
- "Send to emergency services" sends nothing (the Sent screen says so).

## Not built yet

- The watch app (needs native code: Wear OS / watchOS).
- Real accounts, real readings and alerts from a server.

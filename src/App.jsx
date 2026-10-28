import { useEffect, useRef } from 'react';
import { useRoute, Toasts, toast, go } from './ui.jsx';
import { useStore } from './store.js';
import { useLive } from './live.js';
import { Splash, Welcome, SignIn, SignUp, About, Setup, Pair, Paired } from './screens/start.jsx';
import { Home, Alerts, Summary, Profile } from './screens/home.jsx';
import { Vitals, Reading, Call, Locate, Sent, Meds, Serotonin } from './screens/person.jsx';

function screen(route, live) {
  const [path, qs] = route.split('?');
  const query = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  if (!live.ready) return <Splash />;
  if (!live.user || live.user.anon) {
    if (parts[0] === 'signin') return <SignIn />;
    if (parts[0] === 'signup') return <SignUp />;
    return <Welcome />;
  }
  switch (parts[0]) {
    case 'about': return <About key={route} query={query} />;
    case 'setup': return query.get('edit') ? <Setup key={route} query={query} /> : <Pair key={route} query={query} mode="add" />;
    case 'pair': return <Pair key={route} query={query} />;
    case 'add': return <Pair key={route} query={query} mode="add" />;
    case 'paired': return <Paired query={query} />;
    case 'alerts': return <Alerts />;
    case 'summary': return <Summary />;
    case 'profile': return <Profile />;
    case 'p': {
      const p = live.people.find((x) => x.id === parts[1]);
      if (!p) return <Home />;
      if (parts[2] === 'r') return <Reading key={route} p={p} metric={parts[3]} />;
      if (parts[2] === 'call') return <Call p={p} />;
      if (parts[2] === 'locate') return <Locate p={p} />;
      if (parts[2] === 'sent') return <Sent p={p} />;
      if (parts[2] === 'meds') return <Meds key={p.id} p={p} />;
      if (parts[2] === 'serotonin') return <Serotonin p={p} />;
      return <Vitals p={p} />;
    }
    default: return <Home />;
  }
}

// New alerts that arrive while the app is open: a message on screen, a buzz,
// and a phone notification if the user allowed them.
function useAlertNotices(live, settings) {
  const seen = useRef(null);
  useEffect(() => {
    const all = live.people.flatMap((p) => p.alerts.filter((a) => !a.read).map((a) => ({ ...a, pid: p.id })));
    if (seen.current === null) { if (live.ready && live.user) seen.current = new Set(all.map((a) => a.pid + a.id)); return; }
    for (const a of all) {
      const key = a.pid + a.id;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      if (Date.now() - a.at > 10 * 60 * 1000) continue;
      if (a.type === 'reading' && !settings.range) continue;
      if (a.type === 'dose' && !settings.doses) continue;
      const h = new Date().getHours();
      if (settings.quiet && (h >= 22 || h < 6) && a.type !== 'sos') continue;
      toast(a.title + ' · ' + a.sub);
      if (navigator.vibrate) navigator.vibrate(a.type === 'sos' ? [400, 150, 400, 150, 400] : [200, 100, 200]);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(a.title, { body: a.sub, icon: 'icon-192.png', tag: key, requireInteraction: a.type === 'sos' });
          n.onclick = () => { window.focus(); go(a.type === 'sos' ? `/p/${a.pid}/locate` : '/alerts'); };
        } catch { /* some phones only allow notifications from the service worker */ }
      }
    }
  });
}

export default function App() {
  const route = useRoute();
  const live = useLive();
  const st = useStore();
  useAlertNotices(live, st.settings);
  return (
    <div className="md-app">
      <div key={route.split('?')[0]} className="md-page">{screen(route, live)}</div>
      <Toasts />
    </div>
  );
}

import { useRoute, Toasts } from './ui.jsx';
import { useStore } from './store.js';
import { Welcome, SignIn, Setup, Pair, Paired } from './screens/start.jsx';
import { Home, Alerts, Summary, Profile } from './screens/home.jsx';
import { Vitals, Reading, Call, Locate, Sent, Meds, Serotonin } from './screens/person.jsx';

function screen(route, st) {
  const [path, qs] = route.split('?');
  const query = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'welcome') return <Welcome />;
  if (parts[0] === 'signin') return <SignIn />;
  if (parts[0] === 'setup') return <Setup key={route} query={query} />;
  if (!st.signedIn) return <Welcome />;
  switch (parts[0]) {
    case 'pair': return <Pair key={route} query={query} />;
    case 'paired': return <Paired query={query} />;
    case 'alerts': return <Alerts />;
    case 'summary': return <Summary />;
    case 'profile': return <Profile />;
    case 'serotonin': return <Serotonin />;
    case 'p': {
      const p = st.people.find((x) => x.id === parts[1]);
      if (!p) return <Home />;
      if (parts[2] === 'r') return <Reading key={route} p={p} metric={parts[3]} />;
      if (parts[2] === 'call') return <Call p={p} />;
      if (parts[2] === 'locate') return <Locate p={p} />;
      if (parts[2] === 'sent') return <Sent p={p} />;
      if (parts[2] === 'meds') return <Meds key={p.id} p={p} />;
      return <Vitals p={p} />;
    }
    default: return <Home />;
  }
}

export default function App() {
  const route = useRoute();
  const st = useStore();
  return (
    <div className="md-app">
      <div key={route.split('?')[0]} className="md-page">{screen(route, st)}</div>
      <Toasts />
    </div>
  );
}

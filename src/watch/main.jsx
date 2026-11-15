import { createRoot } from 'react-dom/client';
import WatchPage from './Watch.jsx';
import { startSim } from './sim.js';
import '../index.css';

// A watch that was replaced or erased may have a write in flight; being refused then is expected.
window.addEventListener('unhandledrejection', (e) => { if (e.reason && e.reason.code === 'permission-denied') e.preventDefault(); });

startSim();
createRoot(document.getElementById('root')).render(<WatchPage />);

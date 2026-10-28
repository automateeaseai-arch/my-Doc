import { createRoot } from 'react-dom/client';
import WatchPage from './Watch.jsx';
import { startSim } from './sim.js';
import '../index.css';

startSim();
createRoot(document.getElementById('root')).render(<WatchPage />);

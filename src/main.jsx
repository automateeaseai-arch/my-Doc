import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { start } from './backend/index.js';
import { startLive } from './live.js';
import './index.css';

start('app').then(() => {
  startLive();
  createRoot(document.getElementById('root')).render(<App />);
});

// Offline copy (not on the dev server, and only where service workers are allowed).
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

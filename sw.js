// Offline copy: pages fresh first, everything else from the cache after the first visit.
const CACHE = 'mydoc-1793370808';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // live data and fonts go straight to the network
  const save = (res) => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(save)));
});

// Alerts from the myDoc push service (open or closed app). The open app shows the same
// alert with the same tag, so the phone keeps one notification.
self.addEventListener('push', (e) => {
  const m = e.data ? e.data.json() : { title: 'myDoc', body: 'New alert' };
  e.waitUntil(self.registration.getNotifications({ tag: m.tag }).then((shown) => {
    if (m.tag && shown.length) return; // the open app already showed it
    return self.registration.showNotification(m.title, { body: m.body, tag: m.tag || undefined, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: m.url || './' }, requireInteraction: !!m.urgent, vibrate: m.urgent ? [400, 150, 400, 150, 400] : [200, 100, 200] });
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const app = cs.find((c) => !c.url.includes('watch.html') && !c.url.includes('lab.html'));
    if (app) return app.navigate(url).then((c) => (c || app).focus()).catch(() => app.focus());
    return self.clients.openWindow(url);
  }));
});

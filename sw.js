/* ASTI — offline fallback; orders, admin and current catalog always use network. */
const CACHE = 'asti-shell-v3';
const FALLBACK = './offline.html';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.add(FALLBACK)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k === 'asti-v1' || k.startsWith('asti-shell-')) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || r.mode !== 'navigate' || /\/(admin\.html|api\/)/.test(u.pathname)) return;
  e.respondWith(fetch(r).catch(() => caches.match(FALLBACK)));
});

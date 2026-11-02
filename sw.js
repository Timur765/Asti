/* ASTI service worker: оболочка сайта работает офлайн, данные каталога и заказы — всегда из сети */
const VERSION = 'asti-v1';
const SHELL = ['./', 'index.html', 'catalog.html', 'product.html', 'css/style.css', 'js/config.js', 'js/common.js', 'js/index.js', 'js/catalog.js', 'js/product.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // никогда не кэшируем API, базу, хранилище и админку
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co') || url.pathname.endsWith('admin.html') || url.pathname.endsWith('admin.js')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))));
    return;
  }
  // статика: быстро из кэша и обновление в фоне
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => {
      if (r && (r.ok || r.type === 'opaque') && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.hostname))) {
        const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp));
      }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});

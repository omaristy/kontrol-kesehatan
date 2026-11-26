/* Service worker: aplikasi tetap bisa dibuka tanpa internet.
 * Ubah angka versi di bawah setiap kali Anda mengunggah pembaruan ke GitHub. */
const CACHE = 'asupan-v5';
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/config.js', './js/foods.js', './js/core.js', './js/ui.js', './js/views.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Jaringan dulu (selalu versi terbaru), cadangan dari cache bila offline atau lambat.
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google Apps Script tidak disentuh

  e.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then(function (r) { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(function () { return null; });
    const timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 3500); });
    const first = await Promise.race([net, timeout]);
    if (first) return first;
    const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    if (hit) return hit;
    const late = await net;
    return late || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});

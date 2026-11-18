// Guarda os arquivos do app para abrir mais rápido e funcionar sem internet.
const CACHE = 'moveis-v1';
const ARQUIVOS = ['./', 'index.html', 'app.js', 'engine.js', 'ar.js', 'manifest.webmanifest', 'icon.svg', 'vendor/three.min.js', 'vendor/xlsx.full.min.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});

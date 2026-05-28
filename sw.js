/* Peak Arcade service worker — network-first for pages (so updates ALWAYS show),
   cache-first for static assets. Versioned; old caches wiped on activate. */
const CACHE = 'peak-arcade-v40';
const SHELL = ['./', './index.html', './word.html', './privacy.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();   // 🆕 FORCE updates — new SW activates IMMEDIATELY (no waiting for a tap); page auto-reloads on controllerchange
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' ||
    (e.request.destination === 'document') ||
    /\.html($|\?)/.test(e.request.url);
  if (isPage) {
    // NETWORK-FIRST: always try the live page so new versions show immediately; cache as fallback
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // CACHE-FIRST for everything else (icons, manifest, etc.)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

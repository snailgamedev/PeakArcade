/* Peak Arcade service worker — pages: cache-served INSTANT with a network race
   (updates still show, but a dead/slow network never stalls the load),
   cache-first for static assets. Versioned; old caches wiped on activate. */
const CACHE = 'peak-arcade-v155';
const NET_TIMEOUT = 2200;  // ms a page-fetch may race before we serve the cached copy (offline = instant; slow net = max this)
/* SHELL: PAGES ONLY (tiny · installs fast even on cellular).
   The 9.2MB KJV/BBE bundles were pulled OUT of SHELL — they were making SW
   install download nearly 10MB before the page felt ready. Now they cache
   ONLY when the user actually requests a translation (fetch on demand · still
   gets cached by the cache-first handler below for the second visit). */
const SHELL = ['./', './index.html', './word.html', './privacy.html', './manifest.json', './icon.svg', './qr.svg', './practices.json'];

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
    // NETWORK-FIRST *with a fast cache fallback*: online → fresh page (updates still show);
    // offline/dead-slow net → the cached copy is served the instant the network looks dead,
    // so opening the app offline NEVER hangs waiting for a fetch to time out. (Build-order #1 fix.)
    e.respondWith((async () => {
      const cached = await caches.match(e.request) || await caches.match('./index.html');
      // browser KNOWS it's offline → don't even start a doomed fetch, serve cache now
      if (cached && self.navigator && self.navigator.onLine === false) return cached;
      const network = fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => null);
      if (cached) {
        // race the live fetch against a short timer — whichever's ready first wins, cache always backstops
        const timer = new Promise(r => setTimeout(() => r(null), NET_TIMEOUT));
        const winner = await Promise.race([network, timer]);
        return winner || cached;   // network won (fresh) OR timer/offline fired → instant cache
      }
      // first-ever visit, nothing cached yet → must wait on the network, shell as last resort
      return (await network) || caches.match('./index.html');
    })());
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

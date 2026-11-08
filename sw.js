// Sixcharge's service worker: the game keeps what it has loaded, so a second visit is quick and the game opens without a connection.
// Code and pages (html, js, css, json) are fetched from the network first and kept, so an update is never mixed with old code and an offline visit still has the last good copy.
// Pictures and sounds change rarely and weigh most (about 15 MB): they are served from the copy kept and refreshed in the background.
// Raise VERSION to throw everything away at a release.
const VERSION = 'sixcharge-v1';
const CODE = /\.(?:html|js|css|json|webmanifest)$|\/$/;

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.endsWith('/sw.js')) return;   // (fonts and other sites: the browser's own way)
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const kept = await cache.match(req, { ignoreSearch: false });
    const fetchAndKeep = async () => { const res = await fetch(req); if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {}); return res; };
    if (CODE.test(url.pathname)) {
      try { return await fetchAndKeep(); } catch { if (kept) return kept; throw new Error('offline and not kept'); }
    }
    if (kept) { fetchAndKeep().catch(() => {}); return kept; }   // (kept: shown now, refreshed for next time)
    return fetchAndKeep();
  })());
});

/* Offline support.

   The shell and the JSON bank are precached, so after one visit the app opens
   with no network at all. Audio is large, so it is cached the first time a clip
   is played (or in bulk from Settings) rather than forced onto a data plan. */

const VERSION = 'toefl-v1';
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;

const CORE = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',
  'icon.svg',
  'js/app.js',
  'js/data.js',
  'js/drill.js',
  'js/diagnostic.js',
  'js/progress.js',
  'js/quiz.js',
  'js/screens.js',
  'js/store.js',
  'js/ui.js',
  'js/vocab.js',
  'data/manifest.json',
  'data/vocab.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Add the content bank too, but never let one 404 abort the whole install.
    let bank = [];
    try {
      const manifest = await (await fetch('data/manifest.json', { cache: 'no-cache' })).json();
      bank = [
        ...manifest.reading.map((r) => `data/reading/${r.id}.json`),
        ...manifest.listening.flatMap((l) => [
          `data/listening/${l.id}.json`,
          `audio/${l.id}.times.json`,
        ]),
      ];
    } catch {}
    await Promise.all([...CORE, ...bank].map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin || !url.pathname.includes('/toefl/')) return;

  // Audio: cache-first and kept, because re-downloading a lecture is expensive.
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      // Range requests come back 206 and must not be cached as a whole file.
      if (response.ok && response.status === 200) cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  // Everything else: serve from cache, refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => null);
    if (hit) return hit;
    const fresh = await network;
    if (fresh) return fresh;
    if (request.mode === 'navigate') {
      return (await cache.match('index.html')) || Response.error();
    }
    return Response.error();
  })());
});

/* Bulk audio download, driven from Settings. */
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-audio') return;
  const urls = event.data.urls || [];
  event.waitUntil((async () => {
    const cache = await caches.open(MEDIA);
    let done = 0;
    for (const url of urls) {
      try {
        if (!(await cache.match(url))) {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response.ok) await cache.put(url, response.clone());
        }
      } catch {}
      done += 1;
      for (const client of await self.clients.matchAll()) {
        client.postMessage({ type: 'cache-audio-progress', done, total: urls.length });
      }
    }
  })());
});

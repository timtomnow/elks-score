// Minimal service worker for Elks Score.
//
// Its job is twofold:
//   1. Satisfy the PWA install criteria (a registered SW with a fetch handler)
//      so Android browsers offer "Install app" rather than a plain shortcut.
//   2. Provide a basic offline fallback for the app shell, without ever caching
//      live score data (those requests always go straight to the network).
//
// Bump CACHE_VERSION whenever the shell files below change, so old caches are
// dropped on the next visit.
const CACHE_VERSION = 'elks-score-v4';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './docs/help/index.json',
  './docs/help/getting-around.md',
  './docs/help/install-app.md',
  './docs/help/change-team.md',
  './docs/help/follow-live-game.md',
  './docs/help/recent-and-upcoming.md',
  './docs/help/open-box-score.md',
  './docs/help/filter-play-by-play.md',
  './docs/help/official-cfl-stats.md',
  './docs/help/read-standings.md',
  './docs/help/weekly-scoreboard.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever serve the app's own GET requests from cache. Everything else —
  // notably the CFL score feed on the worker origin — is always network-first
  // so scores are never stale.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Network-first for our own files, falling back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});

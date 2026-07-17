const CACHE_NAME = 'astrobeat-v1';

// We don't necessarily need to cache everything for it to be installable,
// but a basic fetch handler is often required.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through for now
  event.respondWith(fetch(event.request));
});

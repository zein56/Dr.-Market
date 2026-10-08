self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  // Just pass through for now, we only need a fetch handler to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});

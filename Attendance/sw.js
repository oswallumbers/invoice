const CACHE_NAME = 'oswal-store-v2'; // <-- Jab bhi update karein, isko v3, v4 karein
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install Event (Purana cache delete karega aur naya banayega)
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force new service worker to activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
});

// 2. Activate Event (Purana Cache Clean karega)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Delete old version
          }
        })
      );
    })
  );
  return self.clients.claim(); // Control open tabs immediately
});

// 3. Fetch Event
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});

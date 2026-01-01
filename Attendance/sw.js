self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('oswal-store').then((cache) => cache.addAll([
      './',                // Current Folder
      './index.html',      // Main File
      './manifest.json'    // Manifest File
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});

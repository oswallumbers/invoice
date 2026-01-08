const CACHE_NAME = 'oswal-attendance-v9'; // Version change kiya (v9)
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
  // Yahan se external links hata diye gaye hain (IMPORTANT)
];

// 1. Install Event
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch Event
self.addEventListener('fetch', (e) => {
  // Sirf http/https request ko handle karein
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(err => {
          console.log('Offline: File not in cache', err);
      });
    })
  );
});

// 4. Force Notification Click Handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then( windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// 5. Skip Waiting Message (Update Logic)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


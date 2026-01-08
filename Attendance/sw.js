const CACHE_NAME = 'oswal-attendance-v8'; // <-- Version change kar diya hai (v8)
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
  // Yahan se Tailwind aur FontAwesome ke link hata diye hain
  // Taki "Failed to fetch" ka error na aaye
];

// 1. Install Event (Files Cache karega)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activate Event (Purana Cache delete karega)
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

// 3. Fetch Event (Offline Support with Error Handling)
self.addEventListener('fetch', (e) => {
  // Sirf http/https request ko handle karein (chrome-extension bugs avoid karne ke liye)
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      // Agar cache me hai to wahi se do, nahi to network se lao
      return response || fetch(e.request).catch(err => {
          console.log('Network fetch failed:', err);
          // Agar internet nahi hai aur file cache me nahi hai, to error mat do
      });
    })
  );
});

// 4. Force Notification Click Handler (App open karne ke liye)
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

// 5. Skip Waiting Message (Update ke liye jaruri)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

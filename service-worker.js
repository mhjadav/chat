var cacheWhitelist = ['chat-v3', 'chatPWA-v1'];
var filesToCache = [
  '/',
  '/index.html',
  '/scripts/main.js',
  '/styles/main.css',
  '/images/firebase-logo.png',
  '/images/profile_placeholder.png'
];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheWhitelist[0]).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});


self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  console.log('[Service Worker] Fetch', e.request.url);
  //Some API response or some some url if want to add fresh data
  var dataUrl = 'https://chat.mojaave.com';
  if (e.request.url.indexOf(dataUrl) > -1) {
    e.respondWith(
      caches.open(cacheWhitelist[1]).then(function(cache) {
        return fetch(e.request).then(function(response){
          cache.put(e.request.url, response.clone());
          return response;
        });
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
      })
    );
  }
});

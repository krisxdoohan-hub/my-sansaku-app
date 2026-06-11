const CACHE_NAME = 'sansaku-cache-v0.0.0.8';

// 定義需要優先快取的核心靜態資源
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@phosphor-icons/web'
];

// 安裝階段：將核心資源寫入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 啟動階段：清除舊版本的快取，確保載入最新資源
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求階段：採取「網路優先，退回快取」策略 (Network First, fallback to cache)
// 確保盡量取得最新資料，離線時也能看見畫面
self.addEventListener('fetch', event => {
  // 忽略非 GET 請求（如對 Firebase 或 GAS 的 POST 請求）與擴充功能請求
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      // 若取得有效回應，順便更新快取
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseToCache);
      });
      return response;
    }).catch(() => {
      // 若網路斷線，則從快取中尋找資源
      return caches.match(event.request);
    })
  );
});

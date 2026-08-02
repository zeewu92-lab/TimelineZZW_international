// 極簡 Service Worker：只做兩件事——
// 1) 讓瀏覽器判定這是一個「可安裝」的 PWA（安裝條件之一就是要有已註冊、能攔截 fetch 的 SW）
// 2) 快取首頁殼層，離線或網路不穩時還能把 App 的介面打開（本機資料本來就存在 localStorage，
//    跟網路無關，所以離線時世界時鐘、時間軸等核心功能一樣能正常使用）
const CACHE_NAME = 'timeline-app-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 策略：network-first，抓得到就用最新版本並更新快取；抓不到（離線／被擋）才退回快取，
// 確保使用者永遠優先看到最新內容，只有真的連不上網路時才吃快取版本。
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
  );
});

const CACHE_NAME = 'coffee-erp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// تثبيت ملفات الكاش عشان الموقع يفتح بدون إنترنت
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// استرجاع الملفات من الكاش لو مفيش إنترنت
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // لو الملف موجود في الكاش، هاته.. لو مش موجود، حمله من النت
        return response || fetch(event.request);
      })
  );
});

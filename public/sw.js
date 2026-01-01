
const CACHE_NAME = "smart-tutor-v4";

// الأصول الأساسية المطلوب تخزينها فوراً
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/index.tsx",
  "/App.tsx",
  "/types.ts",
  "/main.tsx",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap",
  "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"
];

// تثبيت الـ SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Pre-caching assets...");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// استراتيجية التعامل مع الشبكة
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // تجاهل طلبات الـ API الخاصة بـ Gemini لكي لا تتعطل
  if (url.hostname.includes("generativelanguage.googleapis.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث الكاش في الخلفية لضمان الحداثة
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // تخزين المصادر الخارجية الجديدة (مثل الصور أو المكتبات)
        if (networkResponse.ok && (url.origin !== location.origin || event.request.destination === 'image')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    }).catch(() => {
      // الرد التلقائي عند الفشل التام في وضع الأوفلاين
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});

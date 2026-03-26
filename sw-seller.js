/* KhaiDee Seller — sw-seller.js */
const APP_VERSION  = '1.0.0';
const CACHE_SHELL  = `kd-seller-shell-v${APP_VERSION}`;
const CACHE_IMAGES = `kd-seller-images-v${APP_VERSION}`;
const CACHE_FONTS  = `kd-seller-fonts-v${APP_VERSION}`;

const SHELL_FILES = [
  '/Khaidee/',
  '/Khaidee/index.html',
  '/Khaidee/manifest-seller.json',
  '/Khaidee/seller-icon-192x192.png',
  '/Khaidee/seller-icon-512x512.png',
  '/Khaidee/offline.html'
];

const BYPASS_PATTERNS = [
  /supabase\.co/,
  /googleapis\.com\/v/,
  /chrome-extension:\/\//
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW-Seller] Install error:', err))
  );
});

self.addEventListener('activate', event => {
  const VALID = [CACHE_SHELL, CACHE_IMAGES, CACHE_FONTS];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (BYPASS_PATTERNS.some(p => p.test(request.url))) return;

  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_FONTS));
    return;
  }

  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_IMAGES));
    return;
  }

  if (url.pathname.startsWith('/Khaidee/')) {
    event.respondWith(
      cacheFirst(request, CACHE_SHELL)
        .catch(() => caches.match('/Khaidee/offline.html'))
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match('/Khaidee/offline.html')));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => null);
  return cached || fetchPromise;
}

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

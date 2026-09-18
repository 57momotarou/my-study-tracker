const CACHE_PREFIX = 'my-study-tracker-';
const CACHE = `${CACHE_PREFIX}v65`;
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './attendance.js',
  './render-today.js',
  './render-today-timetable.js',
  './render-today-cards.js',
  './render-settings.js',
  './render-schedule.js',
  './render-badges.js',
  './render-progress.js',
  './render-deadlines.js',
  './data-transfer.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await putInCache(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) await putInCache(request, response.clone());
  return response;
}

async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
  } catch (error) {
    // キャッシュ容量不足でも、オンライン取得したレスポンスはそのまま返す。
    console.warn('レスポンスをキャッシュできませんでした。', error);
  }
}

function isCacheable(response) {
  return response && (response.ok || response.type === 'opaque');
}

// ★ デプロイのたびにここのバージョンを上げてください (v1 → v2 → v3 ...)
const CACHE = 'my-study-tracker-v28';
const FILES = ['./', './index.html', './style.css', './app.js', './data.js', './manifest.json',
  './attendance.js', './render-today.js', './render-settings.js', './render-schedule.js',
  './render-badges.js', './render-progress.js', './render-deadlines.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage('RELOAD'));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

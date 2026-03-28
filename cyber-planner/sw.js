// ★ デプロイのたびにここのバージョンを上げてください (v1 → v2 → v3 ...)
const CACHE = 'cyber-planner-v4';
const FILES = ['./', './index.html', './style.css', './app.js', './data.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting(); // 即座にactivateへ進む
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // 全タブ・アプリを新SWの管理下に
      .then(() => {
        // 全クライアント（ホーム画面アプリ含む）にリロードを指示
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

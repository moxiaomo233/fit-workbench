// 教练常常在健身房信号差的地方翻资料，离线能开非常重要。
// 策略：一律「网络优先」，断网才回落到缓存 —— 这样每次更新都能立刻生效，
// 不会出现「明明改了，手机上还是旧版」（这个坑之前在 index.html 缓存上踩过一次）。
const CACHE = 'coach-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // 缓存应用外壳，保证断网时至少能打开界面读本地数据
      c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// 收到页面「立即激活」指令（用户点了刷新条），跳过等待，马上接管
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // COS 图片等外部请求交给网络，不缓存

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 复制一份进缓存，下次断网可用
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('./index.html'))
      )
  );
});

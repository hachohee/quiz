/* 똑똑핫초 — 네트워크 우선 서비스 워커 (오프라인일 때만 캐시 사용)
   v18: index.html·라디오 JSON 은 HTTP 캐시(GitHub Pages 10분)까지 건너뛰고
        항상 새 파일을 받아 옵니다. 고친 코드가 폰에 바로 내려오게. */
const CACHE = 'toeic-bts-v18';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './members/rm.jpg',
  './members/jin.jpg',
  './members/suga.jpg',
  './members/jhope.jpg',
  './members/jimin.jpg',
  './members/v.jpg',
  './members/jungkook.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 항상 새 파일을 받고(브라우저 HTTP 캐시도 무시), 성공한 것만 캐시에 남김 */
function fresh(req) {
  try {
    return fetch(req, { cache: 'no-store' });
  } catch (e) {
    return fetch(req);
  }
}

function networkFirst(req, fallbackJson) {
  return fresh(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.match(req).then((hit) => {
        if (hit) return hit;
        if (fallbackJson) {
          return new Response(fallbackJson, {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
        return caches.match('./index.html');
      })
    );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isDoc = req.mode === 'navigate' || path.endsWith('/') || path.endsWith('/index.html');

  /* 📻 회차 목록·📝 대본: 온라인이면 항상 새 JSON, 오프라인일 때만 캐시 */
  if (path.endsWith('/radio_episodes.json')) {
    event.respondWith(networkFirst(req, '{"programs":[]}'));
    return;
  }
  if (path.endsWith('/radio_transcripts.json')) {
    event.respondWith(networkFirst(req, '{}'));
    return;
  }
  /* 앱 화면(HTML): 네트워크 우선 + HTTP 캐시 무시 */
  if (isDoc) {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

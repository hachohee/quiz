/* 똑똑핫초 — 네트워크 우선 서비스 워커 (오프라인일 때만 캐시 사용) */
const CACHE = 'toeic-bts-v15';
const RADIO_JSON = './radio_episodes.json';
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

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')));
}

/* 📻 라디오 회차 목록: 온라인이면 항상 새 JSON, 오프라인일 때만 캐시.
   캐시도 없으면 index.html 대신 빈 JSON을 돌려줘 앱이 '불러오기 실패'로 처리하게 함 */
function networkFirstRadio(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.match(req).then(
        (hit) =>
          hit ||
          new Response('{"programs":[]}', {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          })
      )
    );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (new URL(req.url).pathname.endsWith('/radio_episodes.json')) {
    event.respondWith(networkFirstRadio(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

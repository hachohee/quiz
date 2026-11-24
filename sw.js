/* 똑똑핫초 — 네트워크 우선 서비스 워커 (오프라인일 때만 캐시 사용)
   v20: 영어 3채널(CNN·BBC News·6 Minute) 대본 타임스탬프를 지금 내려오는 음원 기준으로
        다시 정합(기본 0초 오프셋에서 초·중·후반 모두 0.5초 안쪽).
   v19: 대본 시트에 싱크 조절 바(-10/-1/0/+1/+10초) 추가.
   v21: 라디오 대본 각 문장 아래에 핵심 단어·숙어·표현 칩 + '💡 표현' 보기/숨기기 토글.
   v22: CNN(DAI) 음원의 '광고 길이 차이' 자동 보정 — 폰이 받은 오디오 길이와 대본 기준
        길이(audioDur)의 차이를 대본에 기록된 광고 지점(adBreaks)에 얹어 자막 시각을 맞춤.
   v18: index.html·라디오 JSON 은 HTTP 캐시(GitHub Pages 10분)까지 건너뛰고
        항상 새 파일을 받아 옵니다. 고친 코드가 폰에 바로 내려오게.
   v23: Day 12(2026-11-23) 토익 단어 7개·3초 문법 2문제·상식 '그린워싱' 반영.
   v24: 🎬 방송 4사 다큐 다시보기(KBS·MBC·SBS·EBS) 화면 추가 — 공식 유튜브 채널·영상 22편.
   v25: 시사·보도 / 교양·다큐 두 갈래 + 방송사 필터 + 최신순 · docs_episodes.json(RSS 매일 갱신) 읽기.
   v26: KBS 시사기획 창 복구 — [사사건건] 데일리 클립에 밀려 사라지던 회차를 공식 '[시사기획 창] 풀영상'
        재생목록에서 받고, KBS 시사 채널에선 [사사건건]을 빼고(9층 시사국·더 보다만), 다큐멘터리 3일을 따로 세움.
   v27: 💼뿌듯핫초(일) · 🏠행복핫초(집) · 📚똑똑핫초(공부) 3모드 통합 — 상단 전환 바 + hotcho_modes.js/.css
        + hotcho_news.json(세계·전국·강원 헤드라인) · hotcho_hub.json(카르텔워치) · hotcho_family.json(가족일정·찬우학업).
        기존 똑똑핫초 화면·퀴즈·공부방·라디오·localStorage 키는 그대로. */
const CACHE = 'toeic-bts-v28';
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
  './members/jungkook.jpg',
  './hotcho_modes.css',
  './hotcho_modes.js'
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
  /* 📰 시사·교양 최신 회차 목록: 온라인일 때만 새 JSON, 오프라인일 때만 캐시 */
  if (path.endsWith('/docs_episodes.json')) {
    event.respondWith(networkFirst(req, '{"episodes":[]}'));
    return;
  }
  /* 💼🏠 뿌듯·행복핫초 데이터: 온라인일 때 항상 새 JSON, 오프라인일 때만 캐시 */
  if (path.endsWith('/hotcho_news.json') || path.endsWith('/hotcho_hub.json') || path.endsWith('/hotcho_family.json')) {
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

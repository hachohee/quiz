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
        기존 똑똑핫초 화면·퀴즈·공부방·라디오·localStorage 키는 그대로.
   v28: 앱 이름 '핫초하트' · v29: '핫초홧팅'.
   v30: 🔓 BTS 도감 '멤버 모두 열기' 버튼(잠긴 멤버만 열고 기존 기록은 보존).
        ⚙️ 내 기록 백업을 '기기 옮기기'로 확장 — tmq_*·hotcho_* 전체를 기록 코드(복사/붙여넣기)나
        JSON 한 파일로 폰↔태블릿에 그대로 옮김.
   v31: 📡 뿌듯핫초 '언론·정책 모니터' — 정책브리핑·국가데이터처·입법예고·춘천시 보도자료·강원/전국 언론을
        한 목록으로(hotcho_monitor.json, 하루 몇 번 자동 갱신). 갈래 탭 + 관심 키워드 필터 + 아이템으로 담기.
   v32: 메뉴를 전부 버튼(탭 전환)으로 — 💼 실시간 뉴스·언론·정책 모니터·카르텔워치·아이템 구상·기사작성,
        🏠 가족일정·찬우학업·냉파·백업/이동에서 고른 한 칸만 보임. 🛰 옥토 구조 이식:
        언론 모니터(일일브리핑 = 날짜별 달력·문단 요약·기타 출처·보도 흐름 막대 / 뉴스데이터 누적·추가취재 제안)
        + 정책 모니터(오늘의 변화·정책브리핑·국회·국가데이터처·정책 히스토리·실시간 소식) — hotcho_briefings.json.
   v33: 🍳 행복핫초 → 냉파 탭에 1,018개 레시피 매칭 내장(recipes.json + fridge_engine.js, AI·키 없이 동작)
        + 🤖 Gemini AI 추천(선택, 무료 키는 hotcho_gemini_key_v1) · 재료는 hotcho_fridge_ing_v1에 자동 저장.
   v34: 📌 뿌듯핫초 → 실시간 뉴스 맨 위에 '오늘의 뉴스 브리핑' 카드 — 그날 하루 맥락 3~4줄 +
        취재기자·시민 시선의 '생각해 볼 문제' 1~2개(hotcho_news.json daily_brief). 없으면 조용히 숨김.
   v35: 🎬 뿌듯핫초 → '내 기사' 탭 — 2014~2026년 KBS 보도 목록 474편(my_articles.json)을
        연도·분류 칩 + 제목 검색 + 다시보기 링크로. 복직 뒤 앱에서 바로 새 기사를 쌓으면
        hotcho_my_articles_v1(백업·기기 이동 포함)에 저장됨.
   v36: 💰 행복핫초 → '재정' 탭 — 📒 노션 가계부 바로가기 · 💸 이번 달 예산/오늘 지출(게이지·삭제) ·
        ⏰ 마감일 D-day(체크·추가·삭제) · 🧮 예·적금/대출/ISA·연금 계산기.
        예산·지출·마감일은 hotcho_finance_v1(이 폰에만, 기기 옮기기 코드 포함) · 잔액·계좌/카드번호·
        기프티콘 바코드는 공개 저장소라 코드에도 데이터에도 넣지 않음.
        (hotcho_modes.js·css 는 index.html 에서 ?v=40 로 부름 — 버전을 올릴 때 APP_VER·CACHE·?v= 를 함께 올린다)
   v37: 💼 뿌듯핫초 메뉴 정리 — '🛰 언론·정책 모니터'를 풀어
        📰 '뉴스 · 언론모니터'(하위 3탭: 실시간 뉴스 | 일일브리핑 | 누적·추가취재, 📌 오늘의 뉴스 브리핑은 맨 위 그대로)
        + 🏛 '정책 모니터'(누르면 바로 정책 카드: 전체·오늘의 변화·정책브리핑·국회·국가데이터처·정책 히스토리·실시간 소식)로 나눔.
        카르텔워치·아이템 구상·기사작성·내 기사, 🏠행복핫초·📚똑똑핫초 기능·데이터·localStorage 키는 그대로.
        + [추가 취재 방향] 칸이 똑똑핫초 목록 카드용 .rep(display:flex) 스타일을 물려받아 제목이 좁은 칸에
          갇히던 것을 rep-b 로 고침(v38).
   v39: 🏛 정책 모니터에 '🏔 춘천·강원' 걸러 보기 탭 추가 — 정책을 낸 기관(org)이 춘천/강원인 카드만
        (전국 정책을 강원 신문이 받아쓴 기사까지 섞이지 않게 기관 기준, v40).
   v41: ⚙️ '내 기록 백업 · 기기 옮기기(전체)'를 🏠행복핫초 안이 아니라 📚똑똑·💼뿌듯·🏠행복
        세 모드 모두의 페이지 맨 아래 한 줄(접힘) 바(#hcShared)로 — 어느 모드에 있든 같은 자리에.
        저장 키(tmq_*·hotcho_*)·기록 코드·JSON 백업/복원 로직은 그대로. 🏠 메누의 '⚙️ 백업/이동 ↓'은
        그 바를 펴고 그 자리로 스크롤. (index.html ?v=41 · APP_VER v41)
   v42: 📅 똑똑핫초 본문 상단(히어로 바로 아래)에 '주간 공부 스케줄' 카드 — 2026-11-25(수) 시작 기준
        월~일 7일을 이번 주부터 보여 주고, 날짜를 누르면 공부 완료 체크(다시 누르면 해제).
        월·목 역사 / 화·금 경제 / 수·토 시사·영어 / 일 재테크·복습 + 매일 🎧 토익 10분,
        이번 주 N/M일·진행 바·접기 펼치기·지난 주/다음 주 이동.
        저장은 hotcho_study_schedule_v1(날짜별) — hotcho_ 접두사라 기기 옮기기 코드에 자동 포함.
        (index.html ?v=42 · APP_VER v42 · hotcho_modes.js·css?v=42)
   v43: 📅 주간 스케줄의 '1강' 자리에 2개월 공부방 실제 강의 이름 — 시작일(11/25 수)부터 그 트랙의
        몇 번째 회차인지 세어 1~12강을 돌리고 12강 넘으면 '2회독 1강'. 강의 이름은 공부방 목록이 만든
        ROOM 인덱스에서 그대로 가져옴(공부방을 고치면 스케줄도 같이 바뀜), 실제 영상 제목은 그 아래 한 줄.
        체크 저장 키(hotcho_study_schedule_v1)·접기 펼치기·주 이동은 v42 그대로.
        (index.html ?v=43 · APP_VER v43 · hotcho_modes.js·css?v=43)
   v44: 📊 💰 재정 탭 맨 위 '내 가계부 그래프' 잠금 카드 — 비밀번호를 넣으면 그 자리에서
        월별 수입 vs 순수지출 막대 + 11월 지출 비중 원그래프(SVG)를 그린다.
        숫자는 finance_charts.enc.json 에 PBKDF2-SHA256(60만 회)+AES-GCM-256 으로만 있고,
        복호화는 이 폰의 WebCrypto 안에서만(서버 전송 0). 비밀번호는 코드에 없다.
        '이 폰에 기억하기'를 켜면 비밀번호가 아니라 복호화된 숫자만 hotcho_fin_charts_v1 에 남고,
        🔒 잠그기를 누르면 그 숫자도 지운다.
        (index.html ?v=45 · APP_VER v45 · hotcho_modes.js·css?v=45 — v45 는 막대 값 라벨 외곽선만)
   v46: 📺 2개월 공부방 84강 전부를 '유튜브 검색'에서 '실제 영상 직링크'(watch?v=)로 교체 — 누르면 그 강의
        영상이 바로 열립니다. 강의마다 영상 ID(vid)를 넣고, 추천 채널(ch)도 실제 영상 채널로 맞춤.
        영상 확인이 안 된 강의만 예전처럼 제목 검색 링크로 남김(2026-11-25 기준 84강 전부 확인 완료).
        (index.html ?v=46 · APP_VER v46 · hotcho_modes.js·css?v=46)
   v47: 🔄 공부방 84강을 '최근 6개월(2026-05-25~11-25) 업로드' 영상으로 전면 최신화 —
        재테크·최신트렌드·시사상식·기초경제 48강 + 토익 12강 = 60강 전부를 2026년 6~11월 영상으로 교체
        (실제 업로드 날짜를 영상 페이지에서 확인). 세계사 12강은 2026 EBS 수능 개념 류성완 강의,
        한국사는 2021년 영상 1건만 2027 수능개념으로 교체. 과목별 커리큘럼·설명 문구도 2026 하반기 기준으로 정비.
        (index.html ?v=47 · APP_VER v47 · hotcho_modes.js·css?v=47) */
const CACHE = 'toeic-bts-v47';
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
  './hotcho_modes.js',
  './my_articles.json',
  './fridge_engine.js',
  './recipes.json'
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
  if (path.endsWith('/hotcho_news.json') || path.endsWith('/hotcho_hub.json') || path.endsWith('/hotcho_family.json')
      || path.endsWith('/hotcho_monitor.json') || path.endsWith('/hotcho_briefings.json')) {
    event.respondWith(networkFirst(req, '{}'));
    return;
  }
  /* 🎬 내 기사 목록: 고칠 때 바로 반영되게 온라인 우선, 오프라인이면 캐시 */
  if (path.endsWith('/my_articles.json')) {
    event.respondWith(networkFirst(req, '{"items":[]}'));
    return;
  }
  /* 🍳 냉파 레시피 데이터: 잘 안 바뀌는 큰 파일(전송 47KB)이라 캐시 먼저 — 새 판(v34+)에서 캐시 이름을 올리면 갱신됨 */
  if (path.endsWith('/recipes.json')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fresh(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => new Response('[]', { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } })))
    );
    return;
  }
  /* 앱 화면(HTML): 네트워크 우선 + HTTP 캐시 무시 */
  if (isDoc) {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

/* =====================================================================
   뿌듯핫초(일) · 행복핫초(집) — 통합 모드 화면
   ---------------------------------------------------------------------
   · 기존 똑똑핫초(index.html 안의 코드)는 건드리지 않습니다.
     이 파일은 자기 이름공간(hc*)만 씁니다. 저장 키도 hotcho_ 로 시작합니다.
   · 데이터: hotcho_news.json · hotcho_hub.json · hotcho_family.json (매일 갱신)
     + 이 폰의 localStorage(아이템·초안·메모·체크) + JSON 백업.
   · ⚙️ 백업 · 기기 옮기기: tmq_*(똑똑핫초)·hotcho_* 기록을 코드 글자 한 줄로
     복사·붙여넣기 해서 폰↔태블릿에 그대로 옮긴다.
   ===================================================================== */
(function () {
  'use strict';

  var STUDY_APP = 'https://hachohee.github.io/studywithfriends/';
  var FRIDGE_APP = 'https://mission-fridge.mission-fridge.workers.dev';
  var CARTEL_APP = 'https://hachohee.github.io/cartelwatch/';
  var NOTION_ARTICLES_URL = 'https://app.notion.com/p/f33ae0409ae9400babd69e72f7afdcd0';
  /* 📒 노션 '월별 가계부 · 내 돈 흐름' — 초희 로그인에서만 열리는 페이지라 주소만 둔다 */
  var NOTION_LEDGER_URL = 'https://app.notion.com/p/41ac701f951a81078ee1d60ab9b4c28f';

  var K = {
    items: 'hotcho_items_v1',
    drafts: 'hotcho_drafts_v1',
    article: 'hotcho_article_v1',
    home: 'hotcho_home_v1',
    mode: 'hotcho_mode_v1',
    mon: 'hotcho_mon_v1',
    ui: 'hotcho_ui_v1',
    frIng: 'hotcho_fridge_ing_v1',
    frPrio: 'hotcho_fridge_prio_v1',
    frKey: 'hotcho_gemini_key_v1',
    myart: 'hotcho_my_articles_v1',
    fin: 'hotcho_finance_v1',     /* 💰 재정 — 예산·지출·마감일(이 폰에만) */
    finCharts: 'hotcho_fin_charts_v1'  /* 📊 가계부 그래프 — 복호화된 숫자만(비밀번호는 저장 안 함) */
  };

  /* 언론·정책 모니터 — 갈래 표시용(JSON에 kinds가 없을 때 대신 씀) */
  var MON_KINDS = {
    press: { label: '정책·부처', emoji: '🏛' },
    law: { label: '입법', emoji: '⚖️' },
    assembly: { label: '국회', emoji: '🗳' },
    mods: { label: '통계', emoji: '📊' },
    local: { label: '지자체', emoji: '🏢' },
    gangwon: { label: '강원언론', emoji: '🗞' },
    nation: { label: '전국언론', emoji: '📰' }
  };
  var MON_ORDER = ['press', 'law', 'assembly', 'mods', 'local', 'gangwon', 'nation'];

  var CATS = ['강원', '전국', '탐사', '생활'];

  /* 💰 재정 — 카테고리·세율·처음 열 때 담아 두는 마감일(날짜와 이름만, 금액·바코드는 넣지 않음) */
  var FIN_CATS = ['식비', '아이', '생활', '기타'];
  var FIN_CAT_E = { '식비': '🍚', '아이': '🎒', '생활': '🧺', '기타': '🧾' };
  var FIN_INT_TAX = 0.154;   /* 이자소득세 = 소득세 14% + 지방소득세 1.4% */
  /* 계산기 처음 값(예시 숫자 — 초희 실제 값이 아니다) */
  var FIN_CALC_DEF = {
    hcFinSvMode: 'lump', hcFinSvAmt: '100', hcFinSvRate: '3.5', hcFinSvMon: '12',
    hcFinLoAmt: '3000', hcFinLoRate: '4.5', hcFinLoMon: '60',
    hcFinTxSal: '5000', hcFinTxPen: '600', hcFinTxIrp: '300', hcFinTxIsa: '300', hcFinTxIsaType: 'normal'
  };
  var FIN_SEED_DDAY = [
    { d: '2026-11-29', label: '편의점 할인권(CU) 마감' },
    { d: '2026-11-30', label: '스타벅스 1+1 종료' },
    { d: '2026-11-30', label: '춘천 입학축하금 신청 마감' },
    { d: '2026-12-12', label: '컴포즈 1+1 종료' },
    { d: '2026-12-20', label: '네이버페이 고객확인(KYC)' },
    { d: '2026-12-24', label: '이마트 상품권' }
  ];
  var STATUS = [
    { k: '아이디어', cls: 's-idea' },
    { k: '취재중', cls: 's-work' },
    { k: '작성중', cls: 's-write' },
    { k: '완료', cls: 's-done' }
  ];
  var CHECKS = [
    { k: 'gumon', label: '📒 구몬' },
    { k: 'dictation', label: '✍️ 받아쓰기' },
    { k: 'reading', label: '📖 독서' },
    { k: 'study', label: '📺 공부방' }
  ];
  var DRAFT_DEFS = {
    brief: {
      label: '단신',
      fields: [
        { k: 'title', label: '제목', rows: 1, ph: '예: ○○군, 수의계약 3건 쪼개기 의심' },
        { k: 'lead', label: '리드 (1~2문장)', rows: 3, ph: '누가·무엇을·언제·왜…' },
        { k: 'body', label: '본문 핵심 팩트', rows: 5, ph: '확인된 숫자와 사실만 한 줄에 하나씩' },
        { k: 'check', label: '취재원 / 확인사항', rows: 3, ph: '예: ○○군 계약담당 통화(11/24) · 공사내역서 요청' }
      ]
    },
    report: {
      label: '리포트',
      fields: [
        { k: 'title', label: '제목', rows: 1, ph: '예: 공사 3건으로 쪼갠 수의계약… 유권해석은' },
        { k: 'anchor', label: '앵커멘트', rows: 3, ph: '앵커가 읽는 2~3문장' },
        { k: 'body', label: '리포트 본문', rows: 6, ph: '기자 스탠딩 · 인터뷰 앞뒤 연결까지' },
        { k: 'memo', label: '인터뷰 / CG 메모', rows: 3, ph: '예: 인터뷰 △△△(○○대 교수) 12초 · CG 1 컷' }
      ]
    }
  };
  var READ_CHARS_PER_MIN = 330; /* 방송 원고 기준: 1분에 약 330자 */

  /* ------------------------------------------------------------ storage */
  function load(k, d) {
    try {
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch (e) { return d; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var S = {
    news: null,
    hub: null,
    family: null,
    newsTab: 'gangwon',
    workTab: 'brief',
    artTab: 'brief',
    items: load(K.items, []) || [],
    drafts: load(K.drafts, []) || [],
    /* 🎬 내 기사 — 서버 목록(my_articles.json) + 이 폰에서 추가한 기사 */
    myart: null,
    myArticles: load(K.myart, []) || [],
    maCat: 'all',
    maYear: 'all',
    maQ: '',
    maShown: 40,
    article: load(K.article, null) || { brief: {}, report: {} },
    home: load(K.home, null) || { memos: [], fridge: { memo: '', shop: [] }, checks: {} },
    editing: '',
    pickedNews: {},
    linkedItem: '',
    linkedUrl: '',
    /* 언론·정책 모니터 */
    mon: null,
    monTab: 'all',
    monKw: '',
    monOnly: false,
    monMg: false,
    monPicked: {},
    monKwCustom: [],
    /* 메뉴 버튼 전환 상태 + 일일브리핑 */
    brief: null,
    workSec: 'news',
    homeSec: 'events',
    newsSub: 'live',   /* 📰 뉴스·언론모니터 하위 탭 — live(실시간 뉴스) | daily(일일브리핑) | acc(누적·추가취재) */
    polTab: 'today',
    briefDate: '',
    calY: -1,
    calM: -1,
    trendKind: 'week',
    accTopic: '',
    accQ: ''
  };
  /* 지난번에 보던 메뉴를 그대로 열어 준다 */
  (function () {
    var u = load(K.ui, null) || {};
    ['workSec', 'homeSec', 'newsSub', 'polTab', 'trendKind'].forEach(function (k) {
      if (typeof u[k] === 'string' && u[k]) S[k] = u[k];
    });
    /* v37에서 '언론·정책 모니터'(monitor)를 뉴스 쪽으로 합쳤어요 → 저장돼 있던 자리는 뉴스 화면으로 */
    if (S.workSec === 'monitor') S.workSec = 'news';
  })();
  function saveUi() {
    save(K.ui, {
      workSec: S.workSec, homeSec: S.homeSec, newsSub: S.newsSub,
      polTab: S.polTab, trendKind: S.trendKind
    });
  }
  /* 관심 키워드는 이 폰에만 저장(hotcho_ 로 시작 → 백업·기기 옮기기에도 함께 감) */
  (function () {
    var m = load(K.mon, null) || {};
    S.monKwCustom = (m.kw || []).filter(function (x) { return typeof x === 'string' && x; });
    S.monPicked = m.picked || {};
    if (m.tab) S.monTab = m.tab;
    if (m.kwSel) S.monKw = m.kwSel;
    if (m.only) S.monOnly = true;
  })();
  if (!S.article.brief) S.article.brief = {};
  if (!S.article.report) S.article.report = {};
  if (!S.home.memos) S.home.memos = [];
  if (!S.home.fridge) S.home.fridge = { memo: '', shop: [] };
  if (!S.home.fridge.shop) S.home.fridge.shop = [];
  if (!S.home.checks) S.home.checks = {};

  /* 💰 재정 — 예산·지출·마감일은 이 폰(localStorage)에만. hotcho_ 로 시작하니
     ⚙️ 백업·기기 옮기기 코드에도 그대로 담긴다. 처음 한 번은 마감일 몇 개를 담아 둔다. */
  S.fin = (function () {
    var f = load(K.fin, null) || {};
    if (!f.budgets || typeof f.budgets !== 'object') f.budgets = {};
    if (!Array.isArray(f.spend)) f.spend = [];
    if (!Array.isArray(f.ddays)) f.ddays = [];
    if (!f.calcIn || typeof f.calcIn !== 'object') f.calcIn = {};
    if (!f.calc) f.calc = 'saving';
    if (!f.seeded) {
      /* 2027년에 처음 열면 이미 지난 쿠폰을 넣지 않는다 */
      if (kstToday() <= '2026-12-31') {
        for (var i = 0; i < FIN_SEED_DDAY.length; i++) {
          f.ddays.push({ id: uid(), d: FIN_SEED_DDAY[i].d, label: FIN_SEED_DDAY[i].label, done: false });
        }
      }
      f.seeded = 1;
      try { localStorage.setItem(K.fin, JSON.stringify(f)); } catch (e) {}
    }
    return f;
  })();
  function finSave() { save(K.fin, S.fin); }

  /* ------------------------------------------------------------ helpers */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function num(n) { return (n == null ? 0 : n).toLocaleString('ko-KR'); }

  /* 금액을 억·만원으로 읽기 쉽게 */
  function money(n) {
    n = Math.round(n || 0);
    var eok = Math.floor(n / 100000000);
    var man = Math.round((n % 100000000) / 10000);
    if (eok && man) return eok + '억 ' + num(man) + '만원';
    if (eok) return eok + '억원';
    if (man) return num(man) + '만원';
    return num(n) + '원';
  }
  /* 카드 숫자칸처럼 좁은 곳에 쓰는 짧은 금액 */
  function moneyShort(n) {
    n = Math.round(n || 0);
    var eok = Math.floor(n / 100000000);
    if (eok >= 1) return eok + '억';
    var man = Math.round(n / 10000);
    if (man >= 1) return num(man) + '만';
    return num(n);
  }

  /* 이 폰의 시간대와 상관없이 한국 시간 기준 오늘 */
  function kstToday() {
    var t = new Date(Date.now() + 9 * 3600 * 1000);
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDay(iso) {
    var p = String(iso || '').split('-');
    return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function dday(iso) {
    var today = kstToday();
    return Math.round((isoDay(iso) - isoDay(today)) / 86400000);
  }
  function ddayLabel(iso) {
    var d = dday(iso);
    if (d === 0) return '오늘';
    if (d === 1) return '내일';
    if (d > 0) return 'D-' + d;
    return 'D+' + Math.abs(d);
  }
  function dayLabel(iso) {
    var p = String(iso || '').split('-');
    var dt = new Date(Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1));
    var w = ['일', '월', '화', '수', '목', '금', '토'][dt.getUTCDay()];
    return (+p[1] || 0) + '/' + (+p[2] || 0) + ' (' + w + ')';
  }
  function nowStamp() {
    var t = new Date(Date.now() + 9 * 3600 * 1000);
    return pad(t.getUTCMonth() + 1) + '/' + pad(t.getUTCDate()) + ' ' + pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes());
  }

  var toastTimer = 0;
  function toast(msg) {
    var el = $('hcToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hcToast';
      el.className = 'hc-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 1900);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function fetchJSON(name) {
    var url = name + (name.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.json();
    });
  }

  /* ------------------------------------------------------------ mode bar */
  var MODES = ['work', 'home', 'study'];

  function setMode(mode, remember) {
    if (MODES.indexOf(mode) < 0) mode = 'study';
    var bar = $('hcBar');
    if (bar) {
      var tabs = bar.querySelectorAll('[data-hc-mode]');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('on', tabs[i].getAttribute('data-hc-mode') === mode);
      }
    }
    var study = $('hcStudy');
    var work = $('hcWork');
    var home = $('hcHome');
    if (study) study.style.display = (mode === 'study') ? '' : 'none';
    if (work) work.hidden = (mode !== 'work');
    if (home) home.hidden = (mode !== 'home');
    document.body.classList.toggle('hc-mode-alt', mode !== 'study');
    if (remember !== false) { try { localStorage.setItem(K.mode, mode); } catch (e) {} }
    try { window.scrollTo(0, 0); } catch (e) {}
    if (mode === 'work') { renderNewsBody(); renderMonitor(); renderCartel(); renderItems(); renderArticle(); renderMyArt(); renderDrafts(); if (S.workSec === 'policy') renderPolicy(); }
    if (mode === 'home') { renderEvents(); renderMemos(); renderKids(); renderShop(); renderSyncSummary(); }
  }

  /* ------------------------------------------------------------ 뉴스 */
  function renderNewsTabs() {
    var el = $('hcNewsTabs');
    if (!el) return;
    var cats = (S.news && S.news.categories) || {};
    var order = ['world', 'nation', 'gangwon'];
    var html = '';
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      var c = cats[key];
      var n = (c && c.items) ? c.items.length : 0;
      html += '<button type="button" data-news-tab="' + key + '" class="' + (S.newsTab === key ? 'on' : '') + '">' +
        (c && c.label ? esc(c.label) : { world: '세계', nation: '전국', gangwon: '강원' }[key]) +
        '<span class="n">' + (n || '') + '</span></button>';
    }
    el.innerHTML = html;
  }

  /* 📌 오늘의 뉴스 브리핑 — hotcho_news.json 의 daily_brief 를 그대로 그립니다.
     { date, context(줄 배열 또는 줄바꿈 문자열), questions: [..] } · 없으면 카드를 조용히 숨깁니다. */
  function briefLines(ctx) {
    if (ctx == null) return [];
    var arr = (Object.prototype.toString.call(ctx) === '[object Array]') ? ctx : String(ctx).split(/\n+/);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var s = String(arr[i] == null ? '' : arr[i]).replace(/\s+$/, '');
      if (s.replace(/\s/g, '')) out.push(s);
    }
    return out;
  }

  function renderDailyBrief() {
    var el = $('hcDailyBrief');
    if (!el) return;
    var b = S.news && S.news.daily_brief;
    var lines = b ? briefLines(b.context) : [];
    var qs = b ? briefLines(b.questions) : [];
    var date = b ? String(b.date || '').slice(0, 10) : '';
    if (!b || (!lines.length && !qs.length)) { el.hidden = true; el.innerHTML = ''; return; }
    var today = kstToday();
    var title = date ? date : today;
    var html = '<div class="hc-card-head"><h3>📌 오늘의 뉴스 브리핑</h3>' +
      '<span class="hc-tiny">' + esc(title) + (date && date !== today ? ' · 최근 정리본' : '') + '</span></div>';
    if (lines.length) {
      html += '<div class="hc-lines">';
      for (var i = 0; i < lines.length; i++) html += '<p class="hc-line">' + esc(lines[i]) + '</p>';
      html += '</div>';
    }
    if (qs.length) {
      html += '<div class="hc-q"><div class="hc-q-h">🤔 생각해 볼 문제</div><ol>';
      for (var j = 0; j < qs.length; j++) html += '<li>' + esc(qs[j]) + '</li>';
      html += '</ol></div>';
    }
    el.innerHTML = html;
    el.hidden = false;
  }

  function renderNews() {
    var listEl = $('hcNewsList');
    var updEl = $('hcNewsUpd');
    renderDailyBrief();
    if (!listEl) return;
    if (updEl) updEl.textContent = S.news && S.news.updated ? S.news.updated + ' 기준' : '불러오는 중…';
    renderNewsTabs();
    var cat = S.news && S.news.categories && S.news.categories[S.newsTab];
    var items = (cat && cat.items) || [];
    if (!items.length) {
      listEl.innerHTML = '<div class="hc-empty">뉴스를 불러오지 못했어요.<br>위의 <b>↻ 새로고침</b>을 눌러 보세요.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var picked = S.pickedNews[S.newsTab + ':' + it.link];
      html += '<div class="hc-news">' +
        '<a class="hc-news-t" href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + '</a>' +
        '<div class="hc-news-m"><span class="src">' + esc(it.source) + '</span><span class="tm">' + esc(it.when) + '</span>' +
        '<button type="button" class="hc-btn sm' + (picked ? ' picked' : '') + '" data-add-news="' + i + '">' +
        (picked ? '✓ 담았어요' : '💡 아이템으로 담기') + '</button></div></div>';
    }
    listEl.innerHTML = html;
  }

  function addNewsItem(idx) {
    var cat = S.news && S.news.categories && S.news.categories[S.newsTab];
    var it = cat && cat.items && cat.items[idx];
    if (!it) return;
    var catName = S.newsTab === 'gangwon' ? '강원' : '전국';
    var item = {
      id: uid(),
      title: it.title,
      cat: catName,
      status: '아이디어',
      facts: '',
      sources: '',
      url: it.link,
      from: it.source + ' · ' + it.when,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    S.items.unshift(item);
    save(K.items, S.items);
    S.pickedNews[S.newsTab + ':' + it.link] = 1;
    renderNews();
    renderItems();
    toast('아이템 구상에 담았어요 · 아래에서 다듬어 보세요');
  }

  /* ------------------------------------------------------------ 언론·정책 모니터 */
  /* hotcho_monitor.json — 정부·국회·통계·언론의 공개 출처를 하루 몇 번 모아 둔 목록.
     갈래(정책·부처 / 입법 / 국회 / 통계 / 지자체 / 강원언론 / 전국언론) × 관심 키워드로
     걸러 보고, 마음에 드는 항목을 누르면 그대로 [💡 아이템으로 담기] → [✍️ 기사로 쓰기]로 이어집니다. */
  var MON_LIMIT = 50;
  var monView = [];

  function monKinds() { return (S.mon && S.mon.kinds) || MON_KINDS; }

  function monKeywords() {
    var base = (S.mon && S.mon.keywords) || [];
    var all = base.concat(S.monKwCustom), out = [], seen = {};
    for (var i = 0; i < all.length; i++) {
      var k = String(all[i] == null ? '' : all[i]).trim();
      if (!k || seen[k]) continue;
      seen[k] = 1; out.push(k);
    }
    return out;
  }
  function isMyKw(k) { return S.monKwCustom.indexOf(k) >= 0; }

  /* 제목·요약·기관·분야에서 걸린 관심 키워드 */
  function monMatch(it) {
    var hay = [it.title, it.summary, it.org, it.field, it.source].join(' ');
    var kws = monKeywords(), out = [];
    for (var i = 0; i < kws.length; i++) if (hay.indexOf(kws[i]) >= 0) out.push(kws[i]);
    return out;
  }

  function saveMon() {
    save(K.mon, {
      kw: S.monKwCustom,
      picked: S.monPicked,
      tab: S.monTab,
      kwSel: S.monKw,
      only: S.monOnly
    });
  }

  function renderMonitor() {
    var listEl = $('hcMonList');
    if (!listEl) return;
    var upd = $('hcMonUpd'), tabsEl = $('hcMonTabs'), kwEl = $('hcMonKw'), srcEl = $('hcMonSrc');
    if (upd) upd.textContent = (S.mon && S.mon.updated) ? S.mon.updated + ' 수집' : '불러오는 중…';
    var items = (S.mon && S.mon.items) || [];

    /* ---- 갈래 탭 (전체 + 있는 갈래만) ---- */
    if (tabsEl) {
      var kinds = monKinds(), counts = {};
      for (var i = 0; i < items.length; i++) counts[items[i].kind] = (counts[items[i].kind] || 0) + 1;
      var th = '<button type="button" data-mon-tab="all" class="' + (S.monTab === 'all' ? 'on' : '') + '">전체<span class="n">' + items.length + '</span></button>';
      var order = MON_ORDER.filter(function (k) { return counts[k]; });
      for (var j = 0; j < order.length; j++) {
        var kk = order[j], meta = kinds[kk] || { label: kk };
        th += '<button type="button" data-mon-tab="' + kk + '" class="' + (S.monTab === kk ? 'on' : '') + '">' +
          (meta.emoji ? meta.emoji + ' ' : '') + esc(meta.label) + '<span class="n">' + counts[kk] + '</span></button>';
      }
      tabsEl.innerHTML = th;
    }

    /* ---- 관심 키워드 줄 (지금 자료에 걸린 것 + 내가 더한 것만) ---- */
    if (kwEl) {
      var kws = monKeywords(), kwHits = {};
      for (var a = 0; a < items.length; a++) {
        if (S.monTab !== 'all' && items[a].kind !== S.monTab) continue;
        var hh = monMatch(items[a]);
        for (var b = 0; b < hh.length; b++) kwHits[hh[b]] = (kwHits[hh[b]] || 0) + 1;
      }
      var show = kws.filter(function (k) { return kwHits[k] || isMyKw(k) || S.monKw === k; });
      show.sort(function (x, y) { return (kwHits[y] || 0) - (kwHits[x] || 0); });
      var kh = '<button type="button" class="hc-kw' + (S.monOnly ? ' on' : '') + '" data-mon-only="1">🔎 키워드만</button>';
      for (var q = 0; q < show.length; q++) {
        var kw = show[q];
        kh += '<button type="button" class="hc-kw' + (S.monKw === kw ? ' on' : '') + '" data-mon-kw="' + esc(kw) + '">' +
          esc(kw) + (kwHits[kw] ? '<span class="n">' + kwHits[kw] + '</span>' : '') +
          (isMyKw(kw) ? '<i data-mon-kwdel="' + esc(kw) + '" title="빼기">✕</i>' : '') + '</button>';
      }
      kh += '<button type="button" class="hc-kw add" data-mon-kwadd="1">＋ 내 키워드</button>';
      kwEl.innerHTML = kh;
    }

    /* ---- 목록 ---- */
    var view = [], only = S.monOnly || !!S.monKw;
    for (var n = 0; n < items.length; n++) {
      var it = items[n];
      if (S.monTab !== 'all' && it.kind !== S.monTab) continue;
      var hits = monMatch(it);
      if (S.monKw && hits.indexOf(S.monKw) < 0) continue;
      if (S.monOnly && !hits.length) continue;
      view.push({ it: it, hits: hits });
    }
    monView = view;

    if (!items.length) {
      listEl.innerHTML = '<div class="hc-empty">모니터 자료를 불러오지 못했어요.<br>위의 <b>↻ 새로고침</b>을 눌러 보세요.</div>';
    } else if (!view.length) {
      listEl.innerHTML = '<div class="hc-empty">' + (only ? '이 갈래·키워드에 걸린 항목이 없어요.<br>키워드를 한 번 더 눌러 풀어 보세요.' : '이 갈래에 새 소식이 없어요.') + '</div>';
    } else {
      var html = '';
      for (var v = 0; v < view.length && v < MON_LIMIT; v++) {
        var row = view[v], x = row.it, meta2 = monKinds()[x.kind] || { label: x.kind, emoji: '•' };
        var picked = !!S.monPicked[x.url];
        var tags = '';
        for (var t = 0; t < row.hits.length && t < 3; t++) tags += '<span class="hc-mon-tag">' + esc(row.hits[t]) + '</span>';
        html += '<div class="hc-mon">' +
          '<div class="hc-mon-top"><span class="hc-mon-kind k-' + esc(x.kind) + '">' + (meta2.emoji || '') + ' ' + esc(meta2.label) + '</span>' +
          (x.org ? '<span class="hc-mon-org">' + esc(x.org) + '</span>' : '') +
          '<span class="hc-mon-d">' + esc(monDay(x.date) + (x.time ? ' ' + x.time : '')) + '</span></div>' +
          '<div class="hc-mon-t">' + esc(x.title) + '</div>' +
          (x.summary ? '<div class="hc-mon-s">' + esc(x.summary) + '</div>' : '') +
          ((tags || x.status) ? '<div class="hc-mon-tags">' + tags +
            (x.status ? '<span class="hc-mon-due">' + esc(x.status) + '</span>' : '') + '</div>' : '') +
          '<div class="hc-mon-act">' +
          '<button type="button" class="hc-btn sm' + (picked ? ' picked' : '') + '" data-mon-add="' + v + '">' +
            (picked ? '✓ 담았어요' : '💡 아이템으로 담기') + '</button>' +
          '<a class="hc-btn sm ghost" href="' + esc(x.url) + '" target="_blank" rel="noopener">원문 ↗</a>' +
          '</div></div>';
      }
      if (view.length > MON_LIMIT) html += '<p class="hc-note">' + num(view.length - MON_LIMIT) + '건 더 있어요 — 갈래나 키워드로 좁혀 보세요.</p>';
      listEl.innerHTML = html;
    }

    /* ---- 출처·고지 ---- */
    if (srcEl) {
      var srcs = (S.mon && S.mon.sources) || [];
      var okList = [], badList = [];
      for (var s = 0; s < srcs.length; s++) (srcs[s].ok ? okList : badList).push(srcs[s].label);
      var sh = '';
      if (okList.length) sh += '출처: ' + esc(okList.join(' · '));
      if (badList.length) sh += (sh ? '<br>' : '') + '이번에 못 받은 곳: ' + esc(badList.join(' · ')) + ' (이전 자료 유지)';
      if (S.mon && S.mon.disclaimer) sh += (sh ? '<br>' : '') + esc(S.mon.disclaimer);
      srcEl.innerHTML = sh;
    }
  }

  /* 2026-11-24 → 11/24, 올해가 아니면 2026.11.24 */
  function monDay(iso) {
    var d = String(iso || '');
    if (!d) return '';
    var p = d.split('-');
    if (p.length !== 3) return d;
    var y = kstToday().slice(0, 4);
    return (p[0] === y ? (+p[1]) + '/' + (+p[2]) : d);
  }

  /* ============================================================ 메뉴 버튼 전환 */
  var WORK_SECS = ['news', 'policy', 'cartel', 'items', 'article', 'myart'];
  var HOME_SECS = ['events', 'kids', 'money', 'fridge'];
  /* ⚙️ 백업/이동은 11/24부터 세 모드 공통 맨 아래 바(#hcShared)로 나갔습니다.
     예전에 저장된 homeSec 이 'backup' 이어도 그 바를 열어 주기만 하게 처리. */

  function showWorkSec(sec) {
    if (WORK_SECS.indexOf(sec) < 0) sec = 'news';
    S.workSec = sec; saveUi();
    var menu = $('hcWorkMenu');
    if (menu) {
      var bs = menu.querySelectorAll('[data-work-sec]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-work-sec') === sec);
    }
    for (var j = 0; j < WORK_SECS.length; j++) {
      var el = $('hcSec-' + WORK_SECS[j]);
      if (el) el.hidden = (WORK_SECS[j] !== sec);
    }
    if (sec === 'news') renderNewsBody();
    if (sec === 'policy') renderPolicy();
    if (sec === 'cartel') renderCartel();
    if (sec === 'items') renderItems();
    if (sec === 'article') renderArticle();
    if (sec === 'myart') renderMyArt();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function showHomeSec(sec) {
    var jumpSync = (sec === 'backup');
    if (jumpSync) sec = 'events';
    if (HOME_SECS.indexOf(sec) < 0) sec = 'events';
    S.homeSec = sec; saveUi();
    var menu = $('hcHomeMenu');
    if (menu) {
      var bs = menu.querySelectorAll('[data-home-sec]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-home-sec') === sec);
    }
    for (var j = 0; j < HOME_SECS.length; j++) {
      var el = $('hcHSec-' + HOME_SECS[j]);
      if (el) el.hidden = (HOME_SECS[j] !== sec);
    }
    if (sec === 'events') { renderEvents(); renderMemos(); }
    if (sec === 'kids') renderKids();
    if (sec === 'money') renderMoney();
    if (sec === 'fridge') renderShop();
    if (jumpSync) { openSyncPanel(true); return; }
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ============================================================ 일일브리핑 데이터 */
  function briefDays() { return (S.brief && S.brief.days) || []; }
  function briefDay(date) {
    var ds = briefDays();
    for (var i = 0; i < ds.length; i++) if (ds[i].date === date) return ds[i];
    return null;
  }
  function briefLatest() {
    var ds = briefDays().slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return ds.length ? ds[0].date : '';
  }
  function briefAllItems() {
    var out = [], ds = briefDays();
    for (var i = 0; i < ds.length; i++) {
      var its = ds[i].items || [];
      for (var j = 0; j < its.length; j++) out.push(its[j]);
    }
    return out;
  }
  function briefPolicy() { return (S.brief && S.brief.policy) || []; }
  function dayAdd(iso, n) {
    var p = String(iso).split('-');
    var d = new Date(+p[0], (+p[1]) - 1, (+p[2]) + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function isPicked(url) {
    for (var i = 0; i < S.items.length; i++) if (S.items[i].url && S.items[i].url === url) return true;
    return false;
  }
  function srcLink(url, label) {
    if (!url) return '';
    return '<a class="hc-src-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a>';
  }

  /* ============================================================ 📰 뉴스 · 언론모니터 (하위 3탭) */
  /* 실시간 뉴스 · 일일브리핑(옛 언론 모니터) · 누적/추가취재를 한 메뉴 안에서 탭으로 오갑니다.
     🏛 정책 모니터는 따로 떼어 낸 메뉴라 renderPolicy()가 그립니다. */
  var NEWS_SUBS = [
    { k: 'live', l: '📰 실시간 뉴스' },
    { k: 'daily', l: '📅 일일브리핑' },
    { k: 'acc', l: '🔁 누적·추가취재' }
  ];

  function newsSubKey(k) {
    for (var i = 0; i < NEWS_SUBS.length; i++) if (NEWS_SUBS[i].k === k) return k;
    return 'live';
  }

  function renderNewsSeg() {
    var el = $('hcNewsSeg');
    if (!el) return;
    var h = '';
    for (var i = 0; i < NEWS_SUBS.length; i++) {
      var t = NEWS_SUBS[i];
      h += '<button type="button" data-news-sub="' + t.k + '" class="' + (S.newsSub === t.k ? 'on' : '') + '">' + t.l + '</button>';
    }
    el.innerHTML = h;
  }

  /* 지금 고른 하위 탭 한 칸만 그린다(달력·목록은 그때그때 새로) */
  function renderNewsBody() {
    S.newsSub = newsSubKey(S.newsSub);
    renderNewsSeg();
    var live = $('hcNewsPane-live'), daily = $('hcNewsPane-daily'), acc = $('hcNewsPane-acc');
    if (live) live.hidden = (S.newsSub !== 'live');
    if (daily) {
      daily.hidden = (S.newsSub !== 'daily');
      if (!daily.hidden) { daily.innerHTML = dailyHTML(); renderDailyParts(); }
    }
    if (acc) {
      acc.hidden = (S.newsSub !== 'acc');
      if (!acc.hidden) acc.innerHTML = accHTML();
    }
    renderNews();
  }

  /* ============================================================ 🏛 정책 모니터 (메뉴 하나) */
  function renderPolicy() {
    if (!$('hcPolTabs')) return;
    renderPolTabs();
    renderPolBody();
  }

  /* ---------- 📅 일일브리핑 ---------- */
  function dailyHTML() {
    var upd = (S.brief && S.brief.updated) ? esc(S.brief.updated) + ' 갱신' : '불러오는 중…';
    var cat = (S.news && S.news.categories) ? S.news.categories[S.newsTab] : null;
    var list = (cat && cat.items) || [];
    var head = '<div class="hc-live-top">';
    for (var i = 0; i < list.length && i < 3; i++) {
      head += '<a class="hc-live-a" href="' + esc(list[i].link) + '" target="_blank" rel="noopener">' +
        '<span class="src">' + esc(list[i].source) + '</span>' + esc(list[i].title) + '</a>';
    }
    if (!list.length) head += '<p class="hc-note">실시간 뉴스를 불러오지 못했어요. [↻ 새로고침]을 눌러 주세요.</p>';
    head += '</div>';

    return '' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📡 오늘의 실시간 헤드라인</h3><span class="hc-tiny" id="hcDailyUpd">' +
      ((S.news && S.news.updated) ? esc(S.news.updated) + ' 기준' : '') + '</span></div>' +
      head +
      '<div class="hc-row" style="margin-top:8px">' +
      '<button type="button" class="hc-btn sm" data-act="refresh">↻ 새로고침</button>' +
      '<button type="button" class="hc-btn sm ghost" data-news-sub="live">📰 실시간 뉴스 전체</button></div>' +
      '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📅 날짜별 브리핑</h3><span class="hc-tiny" id="hcCalUpd">' + upd + '</span></div>' +
      '<div id="hcCal">' + calHTML() + '</div>' +
      '</section>' +

      '<section class="hc-card" id="hcDayCard">' + dayHTML() + '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📊 보도 흐름</h3><span class="hc-tiny" id="hcTrendUpd"></span></div>' +
      '<div id="hcTrend">' + trendHTML() + '</div>' +
      '</section>';
  }

  /* 일일브리핑 안쪽 조각만 다시 그린다(달력·날짜·보도흐름) */
  function renderDailyParts() {
    var cal = $('hcCal');
    if (cal) cal.innerHTML = calHTML();
    var dayCard = $('hcDayCard');
    if (dayCard) dayCard.innerHTML = dayHTML();
    var tr = $('hcTrend');
    if (tr) tr.innerHTML = trendHTML();
  }

  var WEEK_NAME = ['일', '월', '화', '수', '목', '금', '토'];
  function calHTML() {
    var today = kstToday();
    if (S.calY < 0 || S.calM < 0) {
      var sel = S.briefDate || today;
      var sp = sel.split('-');
      S.calY = +sp[0]; S.calM = (+sp[1]) - 1;
    }
    var ds = briefDays(), has = {};
    for (var i = 0; i < ds.length; i++) has[ds[i].date] = 1;
    if (!S.briefDate) S.briefDate = has[today] ? today : briefLatest();

    var first = new Date(S.calY, S.calM, 1);
    var startW = first.getDay();
    var lastDay = new Date(S.calY, S.calM + 1, 0).getDate();
    var h = '<div class="hc-cal-head">' +
      '<button type="button" data-cal-nav="-1" aria-label="이전 달">‹</button>' +
      '<span>' + S.calY + '년 ' + (S.calM + 1) + '월</span>' +
      '<button type="button" data-cal-nav="1" aria-label="다음 달">›</button></div>' +
      '<div class="hc-cal">';
    for (var w = 0; w < 7; w++) h += '<div class="w">' + WEEK_NAME[w] + '</div>';
    for (var b = 0; b < startW; b++) h += '<div></div>';
    for (var d = 1; d <= lastDay; d++) {
      var iso = S.calY + '-' + pad(S.calM + 1) + '-' + pad(d);
      var cls = 'hc-cal-d' + (iso === S.briefDate ? ' on' : '') + (iso === today ? ' today' : '') + (has[iso] ? ' has' : '');
      h += '<button type="button" class="' + cls + '" data-cal-day="' + iso + '">' + d + '</button>';
    }
    h += '</div>';
    h += '<p class="hc-note">점이 있는 날은 브리핑이 쌓인 날이에요 · 누르면 그날 브리핑으로 바뀝니다</p>';
    return h;
  }

  /* 줄글을 빈 줄 기준 문단으로 나누고, 문단 주제와 같은 기사 링크를 그 문단 밑에 붙인다 */
  function splitNarrative(day) {
    var items = day.items || [], used = {};
    var blocks = String(day.narrative || '').split(/\n{2,}/);
    var out = blocks.map(function (block) {
      var header = (block.split('\n')[0] || '').replace(/^[^\p{L}\p{N}]+/u, '').split('—')[0].trim();
      var links = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].url && items[i].topic === header) { links.push(items[i]); used[items[i].id] = 1; }
      }
      return { block: block, links: links };
    });
    var left = [];
    for (var j = 0; j < items.length; j++) if (items[j].url && !used[items[j].id]) left.push(items[j]);
    return { blocks: out, leftover: left };
  }

  function dayHTML() {
    var date = S.briefDate || briefLatest();
    var day = briefDay(date);
    if (!day) {
      return '<div class="hc-card-head"><h3>📄 ' + esc(date ? monDay(date) + ' 브리핑' : '브리핑') + '</h3></div>' +
        '<div class="hc-empty">이 날짜에는 아직 브리핑이 없어요.<br>아침 자동 갱신이 돌면 여기에 쌓입니다.</div>';
    }
    var sp = splitNarrative(day), h = '';
    h += '<div class="hc-card-head"><h3>📄 ' + esc(day.label || monDay(day.date)) + ' 브리핑</h3>' +
      '<span class="hc-tiny">' + (day.items ? day.items.length + '건' : '') + '</span></div>';
    if (day.generated) h += '<p class="hc-note" style="margin:0 2px 10px">' + esc(day.generated) + '</p>';
    for (var i = 0; i < sp.blocks.length; i++) {
      var blk = sp.blocks[i];
      h += '<div class="hc-br-block"><p>' + esc(blk.block) + '</p>';
      if (blk.links.length) {
        h += '<ul class="hc-br-src">';
        for (var k = 0; k < blk.links.length; k++) {
          var it = blk.links[k];
          h += '<li>' + srcLink(it.url, it.source + ' 원문 보기') + '</li>';
        }
        h += '</ul>';
      }
      h += '</div>';
    }
    if (sp.leftover.length) {
      h += '<div class="hc-fold" style="border-top:1px solid rgba(255,255,255,.1)"><div class="hc-br-etc-h">기타 출처</div><ul class="hc-br-src">';
      for (var m = 0; m < sp.leftover.length; m++) {
        var lo = sp.leftover[m];
        h += '<li>' + srcLink(lo.url, '[' + lo.topic + '] ' + lo.title + ' — ' + lo.source) + '</li>';
      }
      h += '</ul></div>';
    }
    if (S.brief && S.brief.note) h += '<p class="hc-note">' + esc(S.brief.note) + '</p>';
    return h;
  }

  function trendCounts(kind) {
    var span = (kind === 'month') ? 30 : 7;
    var to = kstToday(), from = dayAdd(to, -(span - 1));
    var counts = {}, total = 0, all = briefAllItems();
    for (var i = 0; i < all.length; i++) {
      var d = all[i].date;
      if (!d || d < from || d > to) continue;
      total++;
      var t = all[i].topic || '기타';
      counts[t] = (counts[t] || 0) + 1;
    }
    var ent = [];
    for (var k in counts) ent.push([k, counts[k]]);
    ent.sort(function (a, b) { return b[1] - a[1]; });
    return { from: from, to: to, total: total, ent: ent };
  }

  function trendHTML() {
    var t = trendCounts(S.trendKind || 'week');
    var h = '<div class="hc-row" style="margin-bottom:10px">' +
      '<button type="button" class="hc-btn sm' + (S.trendKind === 'week' ? ' primary' : ' ghost') + '" data-trend="week">주간</button>' +
      '<button type="button" class="hc-btn sm' + (S.trendKind === 'month' ? ' primary' : ' ghost') + '" data-trend="month">월간</button>' +
      '<span class="hc-tiny" style="margin-left:auto;align-self:center">' + monDay(t.from) + '~' + monDay(t.to) + ' · ' + num(t.total) + '건</span>' +
      '</div>';
    if (!t.total) {
      return h + '<div class="hc-empty">이 기간에 쌓인 브리핑이 없어요.</div>';
    }
    var max = t.ent.length ? t.ent[0][1] : 1;
    h += '<div class="hc-bars">';
    for (var i = 0; i < t.ent.length; i++) {
      var w = Math.round((t.ent[i][1] / max) * 100);
      h += '<div class="hc-bar-row"><span class="lb">' + esc(t.ent[i][0]) + '</span>' +
        '<span class="tr"><i style="width:' + Math.max(w, 6) + '%"></i></span>' +
        '<span class="ct">' + t.ent[i][1] + '</span></div>';
    }
    h += '</div>';
    var top2 = t.ent.slice(0, 2).map(function (e) { return "'" + e[0] + "'(" + e[1] + '건)'; }).join(', ');
    h += '<p class="hc-note">' + (S.trendKind === 'month' ? '최근 30일' : '최근 7일') + ' 쌓인 브리핑 ' +
      num(t.total) + '건 기준 · 가장 많이 다룬 주제는 ' + esc(top2) + '예요.</p>';
    return h;
  }

  /* ---------- 🔁 뉴스데이터 누적 / 추가취재 제안 ---------- */
  function accTopics() {
    var all = briefAllItems(), cnt = {}, order = [];
    for (var i = 0; i < all.length; i++) {
      var ts = all[i].tags || [];
      for (var j = 0; j < ts.length; j++) {
        if (!cnt[ts[j]]) order.push(ts[j]);
        cnt[ts[j]] = (cnt[ts[j]] || 0) + 1;
      }
    }
    return { order: order, cnt: cnt };
  }

  function accHTML() {
    var t = accTopics();
    var all = briefAllItems();
    var chips = '<button type="button" class="hc-kw' + (S.accTopic ? '' : ' on') + '" data-acc-topic="">전체<span class="n">' + all.length + '</span></button>';
    for (var i = 0; i < t.order.length; i++) {
      var k = t.order[i];
      chips += '<button type="button" class="hc-kw' + (S.accTopic === k ? ' on' : '') + '" data-acc-topic="' + esc(k) + '">' +
        esc(k) + '<span class="n">' + t.cnt[k] + '</span></button>';
    }
    return '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🔁 뉴스데이터 누적</h3><span class="hc-tiny">' + all.length + '건</span></div>' +
      '<p class="hc-note" style="margin:0 2px 8px">지금까지 쌓인 브리핑 항목을 주제·검색어로 모아 봅니다. 카드마다 추가 취재 제안이 붙어 있어요.</p>' +
      '<div class="hc-mon-kws">' + chips + '</div>' +
      '<div class="hc-add-row"><input class="hc-input" id="hcAccQ" value="' + esc(S.accQ) + '" placeholder="제목·요약·취재제안 검색">' +
      '<button type="button" class="hc-btn primary" data-acc-search="1">검색</button></div>' +
      '</section><div id="hcAccList">' + accListHTML() + '</div>';
  }

  function accListHTML() {
    var q = String(S.accQ || '').trim();
    var all = briefAllItems(), rows = [];
    for (var i = 0; i < all.length; i++) {
      var x = all[i];
      if (S.accTopic && (x.tags || []).indexOf(S.accTopic) < 0) continue;
      if (q) {
        var hay = [x.title, x.summary, x.follow_up, x.topic, x.source].join(' ');
        if (hay.indexOf(q) < 0) continue;
      }
      rows.push(x);
    }
    rows.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    if (!rows.length) return '<div class="hc-empty">조건에 맞는 항목이 없어요.<br>주제를 풀거나 검색어를 지워 보세요.</div>';
    var h = '';
    for (var j = 0; j < rows.length; j++) {
      var it = rows[j];
      var picked = isPicked(it.url);
      h += '<div class="hc-acc">' +
        '<div class="hc-acc-top"><span class="hc-mon-tag">' + esc(it.topic) + '</span>' +
        '<span class="hc-acc-d">' + esc(monDay(it.date)) + ' · ' + esc(it.source) + '</span></div>' +
        '<div class="hc-acc-t">' + esc(it.title) + '</div>' +
        (it.summary ? '<div class="hc-acc-s"><b class="k">원문 사실</b>' + esc(it.summary) + '</div>' : '') +
        (it.follow_up ? '<div class="hc-follow"><b>추가 취재 제안</b><p>' + esc(it.follow_up) + '</p></div>' : '') +
        '<div class="hc-mon-act">' + srcLink(it.url, '원문 보기') +
        '<button type="button" class="hc-btn sm' + (picked ? ' picked' : '') + '" data-brief-add="' + esc(it.id) + '">' +
        (picked ? '✓ 담았어요' : '💡 아이템으로 담기') + '</button></div></div>';
    }
    return h;
  }

  /* ============================================================ 🏛 정책 모니터 (2단) */
  var POL_TABS = [
    { k: 'all', l: '전체' },
    { k: 'today', l: '오늘의 변화' },
    { k: 'press', l: '정책브리핑' },
    { k: 'assembly', l: '국회' },
    { k: 'mods', l: '국가데이터처' },
    { k: 'local', l: '🏔 춘천·강원' },
    { k: 'history', l: '정책 히스토리' },
    { k: 'live', l: '실시간 소식' }
  ];

  function renderPolTabs() {
    var el = $('hcPolTabs');
    if (!el) return;
    var h = '';
    for (var i = 0; i < POL_TABS.length; i++) {
      var t = POL_TABS[i];
      h += '<button type="button" data-pol-tab="' + t.k + '" class="' + (S.polTab === t.k ? 'on' : '') + '">' + t.l + '</button>';
    }
    el.innerHTML = h;
  }

  function polCards(filter) {
    var src = briefPolicy(), out = [], today = kstToday();
    for (var i = 0; i < src.length; i++) {
      var p = src[i];
      if (filter === 'all') out.push(p);
      else if (filter === 'today') { if (p.date === today) out.push(p); }
      else if (filter === 'local') { if (String(p.org || '').search(/춘천|강원/) >= 0) out.push(p); }
      else if (p.tab === filter) out.push(p);
    }
    out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return out;
  }

  function polCardHTML(p) {
    var picked = isPicked(p.url);
    return '<div class="hc-pol">' +
      '<div class="hc-pol-top">' +
      '<span class="hc-src s-' + esc(p.tab) + '">' + esc(p.source) + '</span>' +
      (p.field ? '<span class="hc-field-b">' + esc(p.field) + '</span>' : '') +
      '<span class="hc-pol-org">' + esc(p.org || '') + '</span>' +
      '<span class="hc-pol-d">' + esc(monDay(p.date)) + '</span></div>' +
      '<div class="hc-pol-t">' + esc(p.title) + '</div>' +
      (p.summary ? '<div class="hc-pol-blk"><b>[원문 사실]</b><p>' + esc(p.summary) + '</p></div>' : '') +
      (p.analysis ? '<div class="hc-pol-blk cmp"><b>[전후 비교·장단점]</b><p>' + esc(p.analysis) + '</p></div>' : '') +
      (p.reporting ? '<div class="hc-pol-blk rep-b"><b>[추가 취재 방향]</b><p>' + esc(p.reporting) + '</p></div>' : '') +
      '<div class="hc-mon-act">' + srcLink(p.url, '원문 보기') +
      '<button type="button" class="hc-btn sm' + (picked ? ' picked' : '') + '" data-pol-add="' + esc(p.id) + '">' +
      (picked ? '✓ 담았어요' : '💡 아이템으로 담기') + '</button></div></div>';
  }

  function renderPolBody() {
    var body = $('hcPolBody');
    if (!body) return;
    if (S.polTab === 'live') {
      body.innerHTML = '<section class="hc-card">' +
        '<div class="hc-card-head"><h3>📡 실시간 원문 소식</h3><span class="hc-tiny" id="hcMonUpd">불러오는 중…</span></div>' +
        '<div class="hc-seg wrap" id="hcMonTabs"></div>' +
        '<div class="hc-mon-kws" id="hcMonKw"></div>' +
        '<div class="hc-mon-list" id="hcMonList"></div>' +
        '<p class="hc-note" id="hcMonSrc"></p></section>';
      renderMonitor();
      return;
    }
    if (S.polTab === 'history') {
      var all = polCards('all');
      var h = '<section class="hc-card"><div class="hc-card-head"><h3>🗓 정책 히스토리</h3>' +
        '<span class="hc-tiny">' + all.length + '건</span></div>';
      for (var i = 0; i < all.length; i++) {
        var p = all[i];
        h += '<div class="hc-hist"><div class="hc-hist-d">' + esc(monDay(p.date)) + '</div>' +
          '<div class="hc-hist-b"><span class="hc-src s-' + esc(p.tab) + '">' + esc(p.source) + '</span>' +
          '<div class="hc-hist-t">' + esc(p.title) + '</div>' +
          '<div class="hc-hist-m">' + esc(p.org || '') + (p.field ? ' · ' + esc(p.field) : '') + '</div>' +
          srcLink(p.url, '원문 보기') + '</div></div>';
      }
      h += '</section>';
      body.innerHTML = h;
      return;
    }
    var list = polCards(S.polTab);
    var fallback = '';
    if (!list.length && S.polTab === 'today') {
      list = polCards('all');
      fallback = '<p class="hc-note" style="margin:0 2px 10px">오늘 새로 나온 항목은 아직 없어서, 최근 정책 카드를 보여 드려요.</p>';
    }
    if (!list.length) {
      body.innerHTML = '<div class="hc-empty">이 탭에 해당하는 정책 카드가 없어요.</div>';
      return;
    }
    var out = '';
    for (var j = 0; j < list.length; j++) out += polCardHTML(list[j]);
    if (S.polTab === 'today') {
      out = (fallback || ('<p class="hc-note" style="margin:0 2px 10px">' + esc(monDay(kstToday())) +
        ' 기준으로 새로 나온 정책·입법·통계·지자체 항목입니다. 카드마다 [원문 사실] · [전후 비교·장단점] · [추가 취재 방향]이 붙어 있어요.</p>')) + out;
    }
    body.innerHTML = out;
  }

  /* ---------- 아이템으로 담기 (브리핑·정책) ---------- */
  function addFromBrief(id) {
    var all = briefAllItems();
    for (var i = 0; i < all.length; i++) {
      var x = all[i];
      if (x.id !== id) continue;
      if (isPicked(x.url)) { toast('이미 아이템 구상에 담겨 있어요'); return; }
      var tags = x.tags || [];
      S.items.unshift({
        id: uid(), title: x.title,
        cat: (tags.indexOf('강원') >= 0 || x.topic === '강원 종합' || x.topic === '지방자치') ? '강원' : '전국',
        status: '아이디어', facts: x.summary || '', sources: x.follow_up || '',
        url: x.url, from: x.source + ' · ' + x.date,
        createdAt: Date.now(), updatedAt: Date.now()
      });
      save(K.items, S.items);
      renderItems(); renderMgBodyIfNeeded();
      toast('아이템 구상에 담았어요 · ✍️ 기사로 쓰기로 이어져요');
      return;
    }
  }

  function addFromPolicy(id) {
    var src = briefPolicy();
    for (var i = 0; i < src.length; i++) {
      var p = src[i];
      if (p.id !== id) continue;
      if (isPicked(p.url)) { toast('이미 아이템 구상에 담겨 있어요'); return; }
      S.items.unshift({
        id: uid(), title: p.title,
        cat: (p.tab === 'today' && (p.org || '').indexOf('춘천') >= 0) ? '강원' : '전국',
        status: '아이디어', facts: p.summary || '',
        sources: [p.reporting || '', p.org || ''].filter(Boolean).join(' · '),
        url: p.url, from: p.source + ' · ' + p.date,
        createdAt: Date.now(), updatedAt: Date.now()
      });
      save(K.items, S.items);
      renderItems(); renderMgBodyIfNeeded();
      toast('아이템 구상에 담았어요 · ✍️ 기사로 쓰기로 이어져요');
      return;
    }
  }

  /* 아이템으로 담은 뒤, 담긴 자리 화면만 새로 그린다 */
  function renderMgBodyIfNeeded() {
    if (S.workSec === 'news' && (S.newsSub === 'acc' || S.newsSub === 'daily')) renderNewsBody();
    else if (S.workSec === 'policy') renderPolBody();
  }

  function addMonitorItem(idx) {
    var row = monView[idx];
    if (!row) return;
    var it = row.it;
    for (var i = 0; i < S.items.length; i++) {
      if (S.items[i].url && S.items[i].url === it.url) {
        S.monPicked[it.url] = 1; saveMon(); renderMonitor();
        toast('이미 아이템 구상에 담겨 있어요');
        return;
      }
    }
    var cat = (it.kind === 'gangwon' || it.kind === 'local') ? '강원' : '전국';
    S.items.unshift({
      id: uid(),
      title: it.title,
      cat: cat,
      status: '아이디어',
      facts: it.summary || '',
      sources: [it.org, it.source].filter(Boolean).join(' · '),
      url: it.url,
      from: it.source + (it.date ? ' · ' + it.date : ''),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    save(K.items, S.items);
    S.monPicked[it.url] = 1;
    saveMon();
    renderMonitor();
    renderItems();
    toast('아이템 구상에 담았어요 · 아래에서 ✍️ 기사로 쓰기');
  }

  function addMonitorKeyword() {
    var inp = window.prompt('감시할 키워드를 적어 주세요 (예: 교육청, 재개발, 채용비리)');
    var k = String(inp == null ? '' : inp).trim();
    if (!k) return;
    if (monKeywords().indexOf(k) >= 0) { toast('이미 있는 키워드예요'); return; }
    S.monKwCustom.push(k);
    S.monKw = k; S.monOnly = false;
    saveMon(); renderMonitor();
    toast('“' + k + '” 키워드를 더했어요');
  }

  function removeMonitorKeyword(k) {
    S.monKwCustom = S.monKwCustom.filter(function (x) { return x !== k; });
    if (S.monKw === k) S.monKw = '';
    saveMon(); renderMonitor();
    toast('키워드를 뺐어요');
  }

  /* ------------------------------------------------------------ 카르텔워치 */
  function renderCartel() {
    var el = $('hcCartelCard');
    if (!el) return;
    var c = S.hub && S.hub.cartelwatch;
    if (!c || !c.collected) {
      el.innerHTML = '<div class="hc-card-head"><h3>🕵️ 카르텔워치</h3><span class="hc-tiny">요약 없음</span></div>' +
        '<div class="hc-empty">요약을 불러오지 못했어요.</div>' +
        '<a class="hc-open" href="' + CARTEL_APP + '" target="_blank" rel="noopener"><span class="e">🕵️</span><span class="b"><b>카르텔워치 열기</b><span>강원 공공계약 이상징후 감시</span></span><span class="go">›</span></a>';
      return;
    }
    var recent = c.recent || [];
    var html = '<div class="hc-card-head"><h3>🕵️ 카르텔워치</h3><span class="hc-tiny">' + esc(c.updated || '') + ' 수집분</span></div>' +
      '<div class="hc-stats">' +
      '<div class="hc-stat"><b>' + num(c.collected) + '</b><span>수집 계약 건</span></div>' +
      '<div class="hc-stat" title="' + esc(money(c.total_amount)) + '"><b>' + moneyShort(c.total_amount) + '</b><span>계약 총액</span></div>' +
      '<div class="hc-stat"><b>' + num(c.anomaly_count) + '</b><span>이상징후</span></div>' +
      '</div>' +
      '<div class="hc-tiny" style="font-size:11px;color:var(--muted2,#7f74b3);margin:-6px 2px 8px">총액 ' + money(c.total_amount) +
      (c.period && c.period.from ? ' · ' + esc(c.period.from) + '~' + esc(c.period.to) : '') + '</div>';
    if (recent.length) {
      html += '<div class="hc-tiny" style="font-size:11px;color:var(--muted2,#7f74b3);margin:0 2px 4px">최근 이상징후 ' + recent.length + '건</div>';
      for (var i = 0; i < recent.length; i++) {
        var a = recent[i];
        var typeCls = (a.type_label || '').indexOf('쪼개기') >= 0 ? 't-split' : 't-new';
        html += '<div class="hc-anom">' +
          '<div class="hc-anom-top"><span class="hc-badge ' + typeCls + '">' + esc(a.type_label) + '</span>' +
          (a.severity ? '<span class="hc-badge sev">위험도 ' + esc(a.severity) + '</span>' : '') +
          (a.amount ? '<span class="hc-badge sev">' + money(a.amount) + '</span>' : '') + '</div>' +
          '<div class="hc-anom-t">' + (a.url ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener" style="color:inherit">' + esc(a.title) + '</a>' : esc(a.title)) + '</div>' +
          '<div class="hc-anom-s">' + esc(a.summary) + '</div></div>';
      }
    }
    html += '<a class="hc-open" href="' + CARTEL_APP + '" target="_blank" rel="noopener" style="margin:12px 0 0"><span class="e">🕵️</span><span class="b"><b>카르텔워치 전체 보기</b><span>' + esc((c.period && c.period.from ? c.period.from + ' ~ ' + c.period.to : '최근 수집분')) + '</span></span><span class="go">›</span></a>';
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ 아이템 구상 */
  function statusInfo(k) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].k === k) return STATUS[i];
    return STATUS[0];
  }
  function nextStatus(k) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].k === k) return STATUS[(i + 1) % STATUS.length].k;
    return STATUS[0].k;
  }

  function renderItems() {
    var el = $('hcItemList');
    if (!el) return;
    var cnt = $('hcItemCnt');
    if (cnt) cnt.textContent = S.items.length ? S.items.length + '개' : '';
    if (!S.items.length) {
      el.innerHTML = '<div class="hc-empty">아직 담은 소재가 없어요.<br>위 뉴스에서 <b>💡 아이템으로 담기</b>를 눌러도 여기에 쌓여요.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < S.items.length; i++) {
      var it = S.items[i];
      var st = statusInfo(it.status);
      html += '<div class="hc-item">' +
        '<div class="hc-item-top"><div class="hc-item-t">' + esc(it.title) + '</div></div>' +
        '<div class="hc-item-tags"><span class="hc-tag">' + esc(it.cat || '강원') + '</span>' +
        '<span class="hc-tag ' + st.cls + '">' + esc(st.k) + '</span></div>' +
        (it.from ? '<div class="hc-item-memo"><span class="k">출처</span> ' + esc(it.from) + '</div>' : '') +
        (it.facts ? '<div class="hc-item-memo"><span class="k">팩트</span> ' + esc(it.facts) + '</div>' : '') +
        (it.sources ? '<div class="hc-item-memo"><span class="k">취재처</span> ' + esc(it.sources) + '</div>' : '') +
        (it.url ? '<div class="hc-item-memo"><a href="' + esc(it.url) + '" target="_blank" rel="noopener" style="color:#c4b5fd">🔗 원문 열기</a></div>' : '') +
        '<div class="hc-item-act">' +
        '<button type="button" class="hc-btn sm" data-item-write="' + it.id + '">✍️ 기사로 쓰기</button>' +
        '<button type="button" class="hc-btn sm" data-item-next="' + it.id + '">→ ' + esc(nextStatus(it.status)) + '</button>' +
        '<button type="button" class="hc-btn sm ghost" data-item-edit="' + it.id + '">수정</button>' +
        '<button type="button" class="hc-btn sm ghost danger" data-item-del="' + it.id + '">삭제</button>' +
        '</div></div>';
    }
    el.innerHTML = html;
  }

  function fillItemForm(it) {
    $('hcItemTitle').value = it ? it.title : '';
    $('hcItemCat').value = it ? (it.cat || '강원') : '강원';
    $('hcItemStatus').value = it ? (it.status || '아이디어') : '아이디어';
    $('hcItemFacts').value = it ? (it.facts || '') : '';
    $('hcItemSrc').value = it ? (it.sources || '') : '';
    S.editing = it ? it.id : '';
    $('hcItemAddBtn').textContent = it ? '💾 수정 저장' : '＋ 소재 추가';
    $('hcItemCancelBtn').hidden = !it;
    if (it) { $('hcItemTitle').focus(); }
  }

  function submitItem() {
    var title = ($('hcItemTitle').value || '').trim();
    if (!title) { toast('소재 제목을 적어 주세요'); $('hcItemTitle').focus(); return; }
    var rec = {
      title: title,
      cat: $('hcItemCat').value,
      status: $('hcItemStatus').value,
      facts: ($('hcItemFacts').value || '').trim(),
      sources: ($('hcItemSrc').value || '').trim()
    };
    if (S.editing) {
      for (var i = 0; i < S.items.length; i++) {
        if (S.items[i].id === S.editing) {
          for (var k in rec) S.items[i][k] = rec[k];
          S.items[i].updatedAt = Date.now();
          delete S.items[i].from; delete S.items[i].url;   /* 직접 고친 소재는 출처 표시를 지움 */
        }
      }
      toast('소재를 고쳤어요');
    } else {
      rec.id = uid();
      rec.createdAt = Date.now();
      rec.updatedAt = Date.now();
      S.items.unshift(rec);
      toast('소재를 담았어요');
    }
    save(K.items, S.items);
    fillItemForm(null);
    renderItems();
  }

  function writeArticleFromItem(id) {
    var it = null;
    for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) it = S.items[i];
    if (!it) return;
    var cur = S.article.brief || {};
    var has = (cur.title || cur.lead || cur.body || cur.check) ? true : false;
    if (has && cur.title !== it.title) {
      if (!window.confirm('지금 기사작성에 쓰고 있는 단신 내용을 이 소재로 바꿀까요?\n(필요하면 먼저 💾 초안 저장함에 넣어 두세요)')) return;
    }
    S.article.brief = {
      title: it.title,
      lead: '',
      body: (it.facts || ''),
      check: (it.sources || '')
    };
    S.linkedUrl = it.url || '';
    save(K.article, S.article);
    if (it.status === '아이디어') {
      it.status = '작성중';
      it.updatedAt = Date.now();
      save(K.items, S.items);
      renderItems();
    }
    S.linkedItem = it.title;
    S.artTab = 'brief';
    renderArticle();
    showWorkSec('article');
    var card = $('hcArticleCard');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('소재를 기사작성으로 옮겼어요');
  }

  /* ------------------------------------------------------------ 기사작성 */
  function renderArticle() {
    var tabsEl = $('hcArtTabs');
    var fieldsEl = $('hcArtFields');
    if (!tabsEl || !fieldsEl) return;
    tabsEl.innerHTML = ['brief', 'report'].map(function (k) {
      return '<button type="button" data-art-tab="' + k + '" class="' + (S.artTab === k ? 'on' : '') + '">' +
        (k === 'brief' ? '📄 단신' : '🎙️ 리포트') + '</button>';
    }).join('');

    var def = DRAFT_DEFS[S.artTab];
    var data = S.article[S.artTab] || {};
    var html = '';
    for (var i = 0; i < def.fields.length; i++) {
      var f = def.fields[i];
      var val = data[f.k] || '';
      html += '<div class="hc-field"><label>' + esc(f.label) + '</label>' +
        (f.rows > 1
          ? '<textarea class="hc-ta" rows="' + f.rows + '" data-art="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea>'
          : '<input class="hc-input" data-art="' + f.k + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '">') +
        '<div class="hc-count" data-count="' + f.k + '">' + val.length + '자</div></div>';
    }
    fieldsEl.innerHTML = html;
    var link = $('hcArtLink');
    if (link) {
      link.innerHTML = S.linkedItem
        ? '소재: ' + esc(S.linkedItem) + (S.linkedUrl ? ' · <a href="' + esc(S.linkedUrl) + '" target="_blank" rel="noopener" style="color:#c4b5fd">🔗 원문</a>' : '')
        : '';
    }
    updateArticleCount();
  }

  function updateArticleCount() {
    var el = $('hcArtCount');
    if (!el) return;
    var data = S.article[S.artTab] || {};
    var total = 0;
    for (var k in data) if (typeof data[k] === 'string') total += data[k].length;
    var bodyLen = (data.body || '').length + (data.anchor || '').length;
    var sec = Math.round((bodyLen / READ_CHARS_PER_MIN) * 60);
    var mm = Math.floor(sec / 60), ss = sec % 60;
    var est = (bodyLen && S.artTab === 'report') ? (' · 예상 방송 길이 약 ' + (mm ? mm + '분 ' : '') + ss + '초') : '';
    el.textContent = '전체 ' + num(total) + '자' + est;
  }

  function artText() {
    var def = DRAFT_DEFS[S.artTab];
    var data = S.article[S.artTab] || {};
    var lines = ['[' + def.label + ']'];
    for (var i = 0; i < def.fields.length; i++) {
      var f = def.fields[i];
      var v = (data[f.k] || '').trim();
      if (!v) continue;
      lines.push((i === 0 ? '' : f.label + ': ') + v);
    }
    if (lines.length === 1) return '';
    return lines.join('\n');
  }

  function saveDraft() {
    var text = artText();
    if (!text) { toast('먼저 내용을 적어 주세요'); return; }
    var data = S.article[S.artTab] || {};
    var title = (data.title || '').trim() || ('제목 없는 ' + DRAFT_DEFS[S.artTab].label);
    var d = {
      id: uid(),
      kind: S.artTab,
      title: title,
      fields: JSON.parse(JSON.stringify(data)),
      savedAt: Date.now()
    };
    S.drafts.unshift(d);
    if (S.drafts.length > 60) S.drafts.length = 60;
    save(K.drafts, S.drafts);
    renderDrafts();
    toast('초안 저장함에 넣었어요');
  }

  function renderDrafts() {
    var el = $('hcDraftList');
    if (!el) return;
    var cnt = $('hcDraftCnt');
    if (cnt) cnt.textContent = String(S.drafts.length);
    if (!S.drafts.length) { el.innerHTML = '<div class="hc-empty">저장한 초안이 없어요.</div>'; return; }
    var html = '';
    for (var i = 0; i < S.drafts.length; i++) {
      var d = S.drafts[i];
      var t = new Date(d.savedAt);
      var label = pad(t.getMonth() + 1) + '/' + pad(t.getDate()) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes());
      html += '<div class="hc-draft"><div style="flex:1;min-width:0">' +
        '<div class="t">' + esc(d.title) + '</div>' +
        '<div class="d">' + (d.kind === 'report' ? '🎙️ 리포트' : '📄 단신') + ' · ' + label + '</div></div>' +
        '<button type="button" class="hc-btn sm" data-draft-load="' + d.id + '">불러오기</button>' +
        '<button type="button" class="hc-btn sm ghost danger" data-draft-del="' + d.id + '">삭제</button></div>';
    }
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ 가족일정 */
  function renderEvents() {
    var el = $('hcEvList');
    if (!el) return;
    var upd = $('hcEvUpd');
    if (upd) upd.textContent = S.family && S.family.updated ? S.family.updated + ' 기준' : '';
    var note = $('hcEvNote');
    if (note) note.textContent = (S.family && S.family.note) || '';
    var evs = (S.family && S.family.events) || [];
    if (!evs.length) {
      el.innerHTML = '<div class="hc-empty">앞으로 2주 일정이 비어 있어요.<br>캘린더에 일정이 생기면 아침에 자동으로 채워져요.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      var dd = dday(ev.date);
      var today = dd === 0;
      html += '<div class="hc-ev">' +
        '<div class="hc-dd' + (today ? ' today' : '') + '"><b>' + esc(ddayLabel(ev.date)) + '</b><span>' + esc(dayLabel(ev.date)) + '</span></div>' +
        '<div class="hc-ev-b"><div class="hc-ev-t">' + esc(ev.title) + '</div>' +
        '<div class="hc-ev-m">' + (ev.allday ? '하루 종일' : esc(ev.time || '') + (ev.end ? '~' + esc(ev.end) : '')) +
        (ev.place ? ' · ' + esc(ev.place) : '') + '</div></div></div>';
    }
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ 집안 메모 */
  function renderMemos() {
    var el = $('hcMemoList');
    if (!el) return;
    var cnt = $('hcMemoCnt');
    var open = S.home.memos.filter(function (m) { return !m.done; }).length;
    if (cnt) cnt.textContent = open ? open + '개 남음' : '';
    if (!S.home.memos.length) { el.innerHTML = '<div class="hc-empty">집안일 메모를 적어 두면 체크하며 지워요.</div>'; return; }
    var list = S.home.memos.slice().sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.ts - a.ts; });
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      html += '<div class="hc-check"><input type="checkbox" data-memo-toggle="' + m.id + '"' + (m.done ? ' checked' : '') + '>' +
        '<span class="t' + (m.done ? ' done' : '') + '">' + esc(m.text) + '</span>' +
        '<button type="button" class="x" data-memo-del="' + m.id + '" aria-label="지우기">✕</button></div>';
    }
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ 찬우학업 */
  function renderKids() {
    var topEl = $('hcKidsTopics');
    var chkEl = $('hcKidsChecks');
    var dayEl = $('hcKidsDay');
    if (!topEl || !chkEl) return;
    var kids = S.family && S.family.kids;
    if (dayEl) dayEl.textContent = kids && kids.day ? 'Day ' + kids.day : '';
    if (!kids) {
      topEl.innerHTML = '<div class="hc-empty">오늘의 주제를 불러오지 못했어요.</div>';
    } else {
      var html = '';
      var topics = kids.topics || [];
      for (var i = 0; i < topics.length; i++) {
        html += '<div class="hc-topic"><span class="s">' + esc(topics[i].subject) + '</span><span class="v">' + esc(topics[i].topic) + '</span></div>';
      }
      if (kids.volume) html += '<div class="hc-topic"><span class="s">🧮 오늘 분량</span><span class="v">' + esc(kids.volume) + '</span></div>';
      topEl.innerHTML = html;
    }
    var today = kstToday();
    var rec = S.home.checks[today] || {};
    var ch = '';
    for (var j = 0; j < CHECKS.length; j++) {
      var c = CHECKS[j];
      ch += '<div class="hc-check"><input type="checkbox" data-check="' + c.k + '"' + (rec[c.k] ? ' checked' : '') + '>' +
        '<span class="t' + (rec[c.k] ? ' done' : '') + '">' + esc(c.label) + '</span></div>';
    }
    chkEl.innerHTML = ch;
  }

  /* ------------------------------------------------------------ 냉파 */
  function renderShop() {
    var el = $('hcShopList');
    var ta = $('hcFridgeMemo');
    if (ta && ta.value !== S.home.fridge.memo) ta.value = S.home.fridge.memo || '';
    if (!el) return;
    var list = S.home.fridge.shop || [];
    if (!list.length) { el.innerHTML = '<div class="hc-empty">장 볼 것을 적어 두세요.</div>'; return; }
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      html += '<div class="hc-check"><input type="checkbox" data-shop-toggle="' + s.id + '"' + (s.done ? ' checked' : '') + '>' +
        '<span class="t' + (s.done ? ' done' : '') + '">' + esc(s.text) + '</span>' +
        '<button type="button" class="x" data-shop-del="' + s.id + '" aria-label="지우기">✕</button></div>';
    }
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ 🍳 냉파 — 재료로 요리 찾기
     1,018개 레시피(recipes.json)를 이 앱 안에서 바로 매칭합니다. AI·인터넷 없이도 100% 동작.
     
     저장 키(기기 옮기기 hotcho_* 에 자동 포함):
       hotcho_fridge_ing_v1  — 마지막에 적은 재료
       hotcho_fridge_prio_v1 — '먼저 먹어야 할 재료'
       hotcho_gemini_key_v1  — 구글 Gemini 무료 키(선택) */
  var FR_TOP = ['대파', '계란', '양파', '두부', '김치', '감자', '당근', '밥', '돼지고기', '닭고기', '우유', '치즈', '버터', '밀가루', '마요네즈', '오이'];
  var FR_BASIC_TXT = '소금, 후추, 간장, 설탕, 식용유, 참기름, 고춧가루, 다진마늘, 고추장, 된장, 물, 식초, 맛술';
  /* 모델 이름이 바뀌거나 내 계정에서 막힐 때를 대비한 순서(2026-11 확인: 3.5-flash-lite → 200) */
  var FR_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
  var FR_PAGE = 20;

  var FR = {
    recipes: null, loading: false, fail: '',
    ing: '', prio: '', filter: 'all', q: '', shown: FR_PAGE, open: -1, results: [],
    ai: { busy: false, outHTML: '', err: '', editing: false, model: '' }
  };

  function rawGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function rawSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function frInit() {
    /* 저장해 둔 재료는 앞뒤 공백만 다듬어 그대로 살립니다(잃지 않게). */
    FR.ing = String(rawGet(K.frIng, '') || '').trim();
    FR.prio = String(rawGet(K.frPrio, '') || '').trim();
  }

  function frTokens() {
    return String(FR.ing || '').split(/[,\n;，、·\/]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function frHasChip(name) {
    var toks = frTokens();
    for (var i = 0; i < toks.length; i++) if (toks[i].replace(/\s+/g, '') === name) return true;
    return false;
  }

  function frSaveIng() {
    rawSet(K.frIng, FR.ing || '');
    rawSet(K.frPrio, FR.prio || '');
  }

  /* 냉파 탭에 들어올 때 */
  function frEnter() {
    var a = $('hcFrHeld'), b = $('hcFrPrio'), c = $('hcFrQ');
    if (a && document.activeElement !== a) a.value = FR.ing;
    if (b && document.activeElement !== b) b.value = FR.prio;
    if (c && document.activeElement !== c) c.value = FR.q;
    frRenderChips();
    frRenderAi();
    if (FR.recipes) frRender();
    else {
      frRenderCount();
      frRenderList();
      frLoad();
    }
  }

  function frLoad() {
    if (FR.recipes || FR.loading) return;
    if (!window.FridgeEngine) { FR.fail = '엔진을 못 읽었어요'; frRender(); return; }
    FR.loading = true;
    frRenderCount();
    frRenderList();
    fetch('recipes.json')
      .then(function (r) { if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status)); return r.json(); })
      .then(function (rows) {
        FR.recipes = window.FridgeEngine.parseRecipes(rows);
        FR.loading = false; FR.fail = '';
        var bd = $('hcFrBadge');
        if (bd) bd.textContent = '레시피 ' + FR.recipes.length.toLocaleString('ko-KR');
        frRender();
      })
      .catch(function (e) {
        FR.loading = false;
        FR.fail = '레시피를 못 받았어요 (' + String((e && e.message) || e) + ') — 인터넷이 되면 다시 열어 주세요';
        frRender();
      });
  }

  function frRenderChips() {
    var el = $('hcFrChips');
    if (!el) return;
    var h = '';
    for (var i = 0; i < FR_TOP.length; i++) {
      var on = frHasChip(FR_TOP[i]);
      h += '<button type="button" class="hc-fr-chip' + (on ? ' on' : '') + '" data-act="fr-chip" data-n="' + esc(FR_TOP[i]) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(FR_TOP[i]) + '</button>';
    }
    el.innerHTML = h;
  }

  function frRenderFilters() {
    var box = $('hcFrFilters');
    if (!box) return;
    var bs = box.querySelectorAll('[data-fr-f]');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-fr-f') === FR.filter);
  }

  function frRenderCount() {
    var el = $('hcFrCount');
    if (!el) return;
    if (!FR.recipes) {
      el.textContent = FR.loading ? '레시피 1,018개를 준비하고 있어요…' : (FR.fail || '레시피를 불러오는 중…');
      return;
    }
    if (!frTokens().length && !FR.q) {
      el.textContent = '재료를 적으면 만들 수 있는 요리를 찾아 드려요. (요리 이름으로만 찾아도 돼요)';
      return;
    }
    if (!FR.results.length) {
      el.textContent = FR.filter === 'ready'
        ? '지금 있는 재료로 바로 되는 요리가 없어요. “전체”로 바꾸면 부족한 재료를 알려 드려요.'
        : '조건에 맞는 요리가 없어요. 재료를 줄이거나 “전체”로 바꿔 보세요.';
      return;
    }
    var ready = 0;
    for (var i = 0; i < FR.results.length; i++) if (FR.results[i].missingCount === 0) ready++;
    el.textContent = '추천 ' + FR.results.length + '개 · 지금 바로 만들 수 있는 요리 ' + ready + '개';
  }

  function frRenderList() {
    var el = $('hcFrList');
    if (!el) return;
    if (!FR.recipes) {
      el.innerHTML = '<div class="hc-empty">' + esc(FR.loading ? '레시피 1,018개를 준비하고 있어요…' : (FR.fail || '준비 중…')) + '</div>';
      var mb0 = $('hcFrMore'); if (mb0) mb0.hidden = true;
      return;
    }
    if (!FR.results.length) {
      el.innerHTML = '<div class="hc-empty">' + (frTokens().length || FR.q ? '맞는 요리가 없어요.' : '위에 재료를 적거나 자주 쓰는 재료를 눌러 주세요.') + '</div>';
    } else {
      var h = '';
      var n = Math.min(FR.shown, FR.results.length);
      for (var i = 0; i < n; i++) h += frCardHTML(FR.results[i], i);
      el.innerHTML = h;
    }
    var mb = $('hcFrMore');
    if (mb) {
      if (FR.results.length > FR.shown) { mb.hidden = false; mb.textContent = '더 보기 (' + FR.shown + '/' + FR.results.length + ')'; }
      else mb.hidden = true;
    }
  }

  function frCardHTML(r, i) {
    var open = FR.open === i;
    var h = '<div class="hc-fr-card' + (open ? ' open' : '') + '">';
    h += '<button type="button" class="hc-fr-btn" data-act="fr-open" data-i="' + i + '" aria-expanded="' + (open ? 'true' : 'false') + '">';
    h += '<span class="hc-fr-nm">' + esc(r.recipe.name) +
      (i === 0 && r.missingCount === 0 && r.have.length >= 2 && !FR.q ? ' <span class="cr">👑 오늘 추천</span>' : '') + '</span>';
    h += '<span class="hc-fr-meta">⏱ ' + r.recipe.minutes + '분 · ' + esc(r.recipe.difficulty) +
      ' · 보유 ' + r.have.length + '개 · ' + (open ? '접기' : '조리법') + '</span>';
    h += '<span class="hc-fr-ing">';
    if (r.have.length) h += '<b class="have">보유 ' + esc(r.have.join(', ')) + '</b>';
    if (r.need.length) h += '<b class="need">' + (r.have.length ? ' · ' : '') + '부족 ' + esc(r.need.join(', ')) + '</b>';
    else if (r.have.length) h += ' <b class="have">· 재료 다 있어요!</b>';
    h += '</span></button>';
    if (open) {
      h += '<div class="hc-fr-steps">';
      if (r.recipe.steps.length) {
        h += '<ol>';
        for (var j = 0; j < r.recipe.steps.length; j++) h += '<li>' + esc(r.recipe.steps[j]) + '</li>';
        h += '</ol>';
      } else {
        h += '<p class="hc-fr-note">조리법이 짧게 정리돼 있지 않아요. 유튜브에서 확인해 보세요.</p>';
      }
      if (r.viaSub && r.viaSub.length) h += '<p class="hc-fr-note">대체 재료: ' + esc(r.viaSub.join(', ')) + '</p>';
      h += '<a class="hc-fr-yt" href="https://www.youtube.com/results?search_query=' +
        encodeURIComponent(r.recipe.name + ' 만드는 법') + '" target="_blank" rel="noopener noreferrer">▶ 유튜브에서 ' +
        esc(r.recipe.name) + ' 만드는 법</a></div>';
    }
    h += '</div>';
    return h;
  }

  function frRender() {
    frRenderFilters();
    frRenderChips();
    if (FR.recipes) {
      FR.results = window.FridgeEngine.recommend(FR.recipes, FR.ing, FR.prio, {
        query: FR.q, onlyReady: FR.filter === 'ready', maxMinutes: FR.filter === 'quick' ? 15 : 0,
        /* 재료를 적었으면 그 재료가 하나라도 드는 요리만(1,018개를 다 늘어놓지 않게).
           요리 이름으로만 찾을 땐 이름이 걸린 요리를 모두 보여 줍니다. */
        allowEmpty: frTokens().length === 0
      });
    } else {
      FR.results = [];
    }
    frRenderCount();
    frRenderList();
  }

  function frToggleChip(name) {
    var toks = frTokens(), at = -1;
    for (var i = 0; i < toks.length; i++) if (toks[i].replace(/\s+/g, '') === name) { at = i; break; }
    if (at >= 0) toks.splice(at, 1); else toks.push(name);
    FR.ing = toks.join(', ');
    var el = $('hcFrHeld');
    if (el) el.value = FR.ing;
    FR.shown = FR_PAGE; FR.open = -1;
    frSaveIng();
    frRender();
  }

  /* ---------- 🤖 Gemini AI 추천(선택) ---------- */
  function frKey() { return String(rawGet(K.frKey, '') || '').trim(); }

  function frRenderAi() {
    var box = $('hcFrAiKey');
    if (!box) return;
    var key = frKey(), h = '';
    if (!key || FR.ai.editing) {
      h += '<div class="hc-fr-ai-in"><input class="hc-input" id="hcFrAiKeyIn" type="password" placeholder="AIza… (붙여넣기)" autocomplete="off" spellcheck="false" enterkeyhint="done"></div>';
      h += '<div class="hc-row" style="margin-top:8px"><button type="button" class="hc-btn primary sm" data-act="fr-ai-save">🔑 키 저장</button>' +
        '<a class="hc-btn ghost sm" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">무료 키 발급 ↗</a>' +
        (key ? '<button type="button" class="hc-btn ghost sm" data-act="fr-ai-cancel">취소</button>' : '') + '</div>';
      h += '<p class="hc-fr-note">키를 넣으면 구글 Gemini가 1,018개에 없는 다른 요리도 제안해 줘요. 키는 이 폰에만 저장되고 기기 옮기기에도 따라가요. <b>키가 없어도 위 1,018개 추천은 그대로 동작해요.</b></p>';
    } else {
      h += '<p class="hc-fr-note" style="margin-top:0">🔑 키 저장됨 <b>…' + esc(key.slice(-4)) + '</b> · 이 폰에만 저장 · 기기 옮기기에 포함</p>';
      h += '<div class="hc-row"><button type="button" class="hc-btn primary sm" data-act="fr-ai-run"' + (FR.ai.busy ? ' disabled' : '') + '>🤖 AI 추천 받기</button>' +
        '<button type="button" class="hc-btn ghost sm" data-act="fr-ai-key">🔑 키 바꾸기</button>' +
        '<button type="button" class="hc-btn ghost sm danger" data-act="fr-ai-del">지우기</button></div>';
    }
    box.innerHTML = h;
    var out = $('hcFrAiOut');
    if (out) {
      if (FR.ai.busy) out.innerHTML = '<div class="hc-empty">🤖 AI가 재료를 보고 요리를 고르는 중… (5~15초)</div>';
      else out.innerHTML = (FR.ai.err ? '<p class="hc-fr-note err">' + esc(FR.ai.err) + '</p>' : '') + (FR.ai.outHTML || '');
    }
  }

  function frAiPrompt() {
    var toks = frTokens();
    var p = [];
    p.push('너는 냉장고 재료로 한국 집밥을 추천하는 요리 도우미야.');
    p.push('보유 재료: ' + (toks.length ? toks.join(', ') : '(없음)'));
    if (FR.prio) p.push('먼저 먹어야 할 재료: ' + FR.prio);
    p.push('집에 있다고 가정할 기본 양념: ' + FR_BASIC_TXT);
    p.push('조건: 지금 바로 만들 수 있는 요리 3~5가지, 20분 안쪽 위주, 초보도 가능한 가정식, 요리 이름은 실제로 쓰는 한국어 이름.');
    p.push('출력은 아래 형식의 JSON 배열만. 설명·인사말·코드블록 표시 없이 JSON만.');
    p.push('[{"name":"요리 이름","minutes":15,"have":["보유 재료"],"need":["더 필요한 재료"],"steps":["1단계","2단계","3단계"]}]');
    return p.join('\n');
  }

  function frAiErrMsg(status, msg) {
    if (status === 400) return '키가 올바르지 않거나 요청이 거부됐어요. 키를 다시 확인해 주세요.';
    if (status === 403) return '이 키로는 쓸 수 없어요 (Generative Language API 사용 설정 필요).';
    if (status === 429) return '무료 사용량을 다 썼어요. 1분 뒤(또는 내일) 다시 시도해 주세요.';
    if (status >= 500) return '구글 AI가 잠시 바쁘대요. 조금 뒤 다시 시도해 주세요.';
    return 'AI 오류: ' + String(msg || ('HTTP ' + status)).slice(0, 140);
  }

  function frAiRun() {
    var key = frKey();
    if (!key) { FR.ai.editing = true; frRenderAi(); return; }
    if (!frTokens().length) {
      toast('먼저 냉장고 재료를 적어 주세요');
      var el = $('hcFrHeld'); if (el) { try { el.scrollIntoView({ block: 'center' }); el.focus(); } catch (e) {} }
      return;
    }
    if (FR.ai.busy) return;
    FR.ai.busy = true; FR.ai.err = ''; FR.ai.outHTML = '';
    frRenderAi();
    frAiCall(key, 0);
  }

  function frAiCall(key, mi) {
    var model = FR_MODELS[mi];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
    var body = {
      contents: [{ role: 'user', parts: [{ text: frAiPrompt() }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) {}
        if (!res.ok) {
          var msg = (data && data.error && data.error.message) || txt.slice(0, 160);
          if ((res.status === 404 || /not found|not supported|unsupported/i.test(String(msg))) && mi + 1 < FR_MODELS.length) {
            return frAiCall(key, mi + 1);
          }
          throw new Error(frAiErrMsg(res.status, msg));
        }
        var cand = data && data.candidates && data.candidates[0];
        var text = cand && cand.content && cand.content.parts
          ? cand.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
        if (!text) {
          if (cand && cand.finishReason) throw new Error('AI가 답을 끝까지 못 만들었어요 (' + cand.finishReason + '). 다시 시도해 주세요.');
          throw new Error('AI가 답을 비워 보냈어요. 다시 시도해 주세요.');
        }
        FR.ai.model = model;
        FR.ai.outHTML = frAiRenderResult(text);
        FR.ai.busy = false;
        frRenderAi();
      });
    }).catch(function (e) {
      if (!FR.ai.busy) return;   /* 이미 성공한 뒤라면 건드리지 않음 */
      FR.ai.busy = false;
      FR.ai.err = (e && e.message) || 'AI 추천에 실패했어요. 조금 뒤 다시 시도해 주세요.';
      frRenderAi();
    });
  }

  function frAiPickJSON(text) {
    var s = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    var a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a >= 0 && b > a) {
      try {
        var arr = JSON.parse(s.slice(a, b + 1));
        if (arr && arr.length) return arr;
      } catch (e) {}
    }
    return null;
  }

  function frAiRenderResult(text) {
    var arr = frAiPickJSON(text);
    if (!arr) {
      return '<div class="hc-fr-ai-txt">' + esc(String(text).slice(0, 1600)).replace(/\n/g, '<br>') + '</div>';
    }
    var h = '<div class="hc-fr-ai-head">🤖 AI 추천 ' + arr.length + '가지</div><div class="hc-fr-list">';
    for (var i = 0; i < Math.min(arr.length, 6); i++) {
      var it = arr[i] || {};
      var name = String(it.name || it.title || ('추천 ' + (i + 1)));
      var mins = it.minutes || it.time || '';
      var have = Array.isArray(it.have) ? it.have : [];
      var need = Array.isArray(it.need) ? it.need : [];
      var steps = Array.isArray(it.steps) ? it.steps : [];
      h += '<div class="hc-fr-card open ai"><div class="hc-fr-ai-c">';
      h += '<div class="hc-fr-nm">' + esc(name) + '</div>';
      h += '<div class="hc-fr-meta">' + (mins ? '⏱ ' + esc(String(mins)) + '분' : '⏱ 시간 미정') + '</div>';
      h += '<div class="hc-fr-ing">';
      if (have.length) h += '<b class="have">보유 ' + esc(have.join(', ')) + '</b>';
      if (need.length) h += '<b class="need">' + (have.length ? ' · ' : '') + '부족 ' + esc(need.join(', ')) + '</b>';
      else if (have.length) h += ' <b class="have">· 재료 다 있어요!</b>';
      h += '</div>';
      if (steps.length) {
        h += '<ol class="hc-fr-ai-steps">';
        for (var j = 0; j < steps.length; j++) h += '<li>' + esc(String(steps[j])) + '</li>';
        h += '</ol>';
      }
      h += '<a class="hc-fr-yt" href="https://www.youtube.com/results?search_query=' +
        encodeURIComponent(name + ' 만드는 법') + '" target="_blank" rel="noopener noreferrer">▶ 유튜브에서 만드는 법</a>';
      h += '</div></div>';
    }
    h += '</div><p class="hc-fr-note">AI가 만든 참고용 제안이에요. 재료 상태·알레르기·익힘 정도는 직접 확인해 주세요.</p>';
    return h;
  }

  function frAct(act, t) {
    if (act === 'fr-chip') { frToggleChip(t.getAttribute('data-n')); return; }
    if (act === 'fr-f') {
      FR.filter = t.getAttribute('data-fr-f') || 'all';
      FR.shown = FR_PAGE; FR.open = -1;
      frRender();
      return;
    }
    if (act === 'fr-open') {
      var i = parseInt(t.getAttribute('data-i'), 10);
      FR.open = (FR.open === i ? -1 : i);
      frRenderList();
      if (FR.open >= 0) {
        var cards = $('hcFrList') ? $('hcFrList').querySelectorAll('.hc-fr-card') : null;
        if (cards && cards[FR.open]) { try { cards[FR.open].scrollIntoView({ block: 'nearest' }); } catch (e) {} }
      }
      return;
    }
    if (act === 'fr-more') { FR.shown += FR_PAGE; frRenderList(); return; }
    if (act === 'fr-ai-save') {
      var inp = $('hcFrAiKeyIn');
      var k = (inp && inp.value || '').trim().replace(/^["']|["']$/g, '');
      if (k.length < 20 || k.indexOf(' ') >= 0) { toast('키를 다시 확인해 주세요'); if (inp) inp.focus(); return; }
      rawSet(K.frKey, k);
      FR.ai.editing = false; FR.ai.err = '';
      if (inp) inp.value = '';
      frRenderAi();
      toast('키를 저장했어요 — AI 추천 받기를 눌러 보세요');
      return;
    }
    if (act === 'fr-ai-key') { FR.ai.editing = true; frRenderAi(); return; }
    if (act === 'fr-ai-cancel') { FR.ai.editing = false; frRenderAi(); return; }
    if (act === 'fr-ai-del') {
      try { localStorage.removeItem(K.frKey); } catch (e) {}
      FR.ai.editing = false; FR.ai.err = ''; FR.ai.outHTML = '';
      frRenderAi();
      toast('키를 지웠어요');
      return;
    }
    if (act === 'fr-ai-run') { frAiRun(); return; }
  }

  /* ------------------------------------------------------------ 백업 · 기기 옮기기 */
  /* 똑똑핫초(tmq_*) + 뿌듯·행복핫초(hotcho_*) 기록을 한 번에 담는다.
     기기마다 다른 '화면 취향'(보던 모드·소리)만 빼고 나머지는 전부 옮긴다. */
  var SYNC_PREFIX = ['tmq_', 'hotcho_'];
  var SYNC_LOCAL = ['hotcho_mode_v1', 'tmq_sound_v1'];   /* 이 기기에서만 쓰는 설정 */
  var CODE_RAW = 'HOTCHO-SYNC-1:';    /* 압축 없이 */
  var CODE_GZIP = 'HOTCHO-SYNC-G1:';  /* gzip 압축(있으면 이쪽) */

  function syncableKey(k) {
    if (!k || SYNC_LOCAL.indexOf(k) >= 0) return false;
    for (var i = 0; i < SYNC_PREFIX.length; i++) if (k.indexOf(SYNC_PREFIX[i]) === 0) return true;
    return false;
  }
  function collectStore() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!syncableKey(k)) continue;
        var v = localStorage.getItem(k);
        if (v == null) continue;
        out[k] = v;
      }
    } catch (e) {}
    return out;
  }
  function summarizeStore(store) {
    function j(k, d) { try { var v = store[k]; return (v == null ? d : JSON.parse(v)) || d; } catch (e) { return d; } }
    var deck = j('tmq_btsdeck_v1', {});
    var wrong = j('tmq_wrong_v1', {});
    var items = j('hotcho_items_v1', []);
    var drafts = j('hotcho_drafts_v1', []);
    var myart = j('hotcho_my_articles_v1', []);
    var fin = j('hotcho_finance_v1', {});
    var keys = 0, bytes = 0;
    for (var k in store) {
      if (!Object.prototype.hasOwnProperty.call(store, k)) continue;
      keys++; bytes += String(store[k]).length + k.length;
    }
    return {
      deck: (deck && typeof deck === 'object') ? Object.keys(deck).length : 0,
      wrong: (wrong && typeof wrong === 'object') ? Object.keys(wrong).length : 0,
      items: (items && items.length) || 0,
      drafts: (drafts && drafts.length) || 0,
      myart: (myart && myart.length) || 0,
      spend: (fin && fin.spend && fin.spend.length) || 0,
      dday: (fin && fin.ddays && fin.ddays.length) || 0,
      keys: keys,
      kb: Math.max(1, Math.round(bytes / 1024))
    };
  }
  function summaryText(st) {
    return 'BTS ' + st.deck + '/7 · 오답 ' + st.wrong + '개 · 소재 ' + st.items + '개 · 초안 ' + st.drafts + '개 · 내 기사 ' + (st.myart || 0) + '편 · 지출 ' + (st.spend || 0) + '건 · 마감일 ' + (st.dday || 0) + '개 · 저장 항목 ' + st.keys + '개 (' + st.kb + 'KB)';
  }

  /* 코드 글자 ↔ 기록: base64(가능하면 gzip) */
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function gzipB64(str) {
    if (typeof CompressionStream === 'undefined' || typeof Response === 'undefined') {
      return Promise.reject(new Error('no-compression'));
    }
    var stream = new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf), bin = '';
      for (var i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return btoa(bin);
    });
  }
  function gunzipB64(b64) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no-decompression'));
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  function makeSyncCode() {
    var json = JSON.stringify(collectStore());
    return gzipB64(json).then(
      function (b64) { return CODE_GZIP + b64; },
      function () { return CODE_RAW + utf8ToB64(json); }
    );
  }
  /* 붙여넣은 글자 → 기록 묶음. JSON 파일 내용을 그대로 붙여도 받아 준다. */
  function readSyncCode(text) {
    try { return readSyncCodeIn(text); }
    catch (e) { return Promise.reject(e); }
  }
  function readSyncCodeIn(text) {
    var raw = String(text == null ? '' : text).trim();
    var t = raw.replace(/\s+/g, '');
    if (!t) return Promise.reject(new Error('empty'));
    if (t.indexOf(CODE_GZIP) === 0) {
      return gunzipB64(t.slice(CODE_GZIP.length)).then(function (s) { return pickStore(JSON.parse(s)); });
    }
    if (t.indexOf(CODE_RAW) === 0) {
      return Promise.resolve(pickStore(JSON.parse(b64ToUtf8(t.slice(CODE_RAW.length)))));
    }
    try { return Promise.resolve(pickStore(JSON.parse(raw))); }
    catch (e) { return Promise.reject(new Error('format')); }
  }
  function pickStore(d) {
    if (!d || typeof d !== 'object') throw new Error('format');
    if (d.store && typeof d.store === 'object') return d.store;   /* 백업 파일(JSON) 통째로 */
    var out = {}, n = 0;
    for (var k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
      if (!syncableKey(k)) continue;
      if (typeof d[k] !== 'string') continue;
      out[k] = d[k]; n++;
    }
    if (!n) throw new Error('format');
    return out;
  }

  function applyStore(store) {
    var applied = 0, removed = 0, cur = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (syncableKey(k)) cur.push(k);
      }
    } catch (e) {}
    for (var c = 0; c < cur.length; c++) {
      if (!Object.prototype.hasOwnProperty.call(store, cur[c])) {
        try { localStorage.removeItem(cur[c]); removed++; } catch (e) {}
      }
    }
    for (var key in store) {
      if (!Object.prototype.hasOwnProperty.call(store, key)) continue;
      if (!syncableKey(key)) continue;
      try { localStorage.setItem(key, String(store[key])); applied++; } catch (e) {}
    }
    return { applied: applied, removed: removed };
  }

  /* 옮기기 전에 무엇이 바뀌는지 확인받고, 옮긴 뒤에는 화면을 새로 고쳐
     도감·공부방 진도·오답노트·아이템·초안·메모를 한 번에 다시 읽게 한다. */
  function confirmApplyStore(store, label) {
    var st = summarizeStore(store);
    if (!st.keys) { toast('옮길 기록이 없어요'); return false; }
    var msg = '이 기기의 기록을 ' + label + ' 내용으로 바꿀까요?\n\n' +
      '· BTS 도감 ' + st.deck + '/7\n' +
      '· 오답 ' + st.wrong + '개 · 소재 ' + st.items + '개 · 초안 ' + st.drafts + '개\n' +
      '· 저장 항목 ' + st.keys + '개 (' + st.kb + 'KB)\n\n' +
      '이 기기에 지금 있는 기록은 지워져요.';
    if (!window.confirm(msg)) return false;
    var r = applyStore(store);
    toast('기록 ' + r.applied + '개를 옮겼어요 · 화면을 새로 고칩니다');
    setTimeout(function () { try { location.reload(); } catch (e) {} }, 1200);
    return true;
  }

  function copySyncCode() {
    toast('기록 코드 만드는 중…');
    makeSyncCode().then(function (code) {
      return copyText(code).then(function (ok) {
        var kb = Math.max(1, Math.round(code.length / 1024));
        if (ok) {
          toast(code.length > 6000
            ? '기록 코드를 복사했어요 (' + kb + 'KB) — 길어서 카톡에선 잘릴 수 있어요. 메모·메일로 보내 주세요'
            : '기록 코드를 복사했어요 (' + kb + 'KB) — 카톡·메모로 보내세요');
        } else {
          openSyncBox(code);
          toast('복사가 안 됐어요 — 아래 칸의 코드를 길게 눌러 복사해 주세요');
        }
      });
    }, function () { toast('기록 코드를 만들지 못했어요 — 백업 파일을 써 주세요'); });
  }
  function openSyncBox(prefill) {
    var det = $('hcSyncDetails'); if (det) det.open = true;   /* 접힌 채로는 칸이 안 보이니 펴 준다 */
    var box = $('hcSyncBox'); if (!box) return;
    box.hidden = false;
    var ta = $('hcSyncText');
    if (ta) {
      ta.value = prefill || '';
      if (!prefill && navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) {
          if (ta && !ta.value && t) ta.value = String(t).trim();
        }, function () {});
      }
      try { ta.focus(); } catch (e) {}
    }
    var info = $('hcSyncInfo');
    if (info && prefill) info.innerHTML = '위 코드를 전부 선택해 복사한 뒤, 옮길 기기에서 [📥 기록 코드 붙여넣기]에 넣어 주세요.<br>코드가 길면 카톡이 중간에 자를 수 있으니 메모·메일이 안전해요.';
  }
  function applySyncText() {
    var ta = $('hcSyncText');
    var text = ta ? ta.value : '';
    if (!text || !text.trim()) { toast('기록 코드를 먼저 붙여넣어 주세요'); return; }
    toast('코드 확인 중…');
    readSyncCode(text).then(function (store) {
      if (!store || !Object.keys(store).length) { toast('기록이 비어 있는 코드예요'); return; }
      if (!confirmApplyStore(store, '붙여넣은 코드')) toast('그대로 두었어요');
    }, function () {
      toast('코드를 읽지 못했어요 — 처음부터 다시 복사해 주세요');
    });
  }
  function renderSyncSummary() {
    var el = $('hcSyncSummary'); if (!el) return;
    el.textContent = '이 기기에 지금 있는 기록 — ' + summaryText(summarizeStore(collectStore()));
  }

  function exportAll() {
    var data = {
      app: 'hotcho-hub',
      version: 2,
      exportedAt: new Date().toISOString(),
      items: S.items,
      drafts: S.drafts,
      article: S.article,
      home: S.home,
      store: collectStore()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '핫초-백업-' + kstToday().replace(/-/g, '') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('백업 파일을 내려받았어요 (전체 기록)');
  }

  function importAll(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(String(reader.result));
        if (!d || (!d.store && !d.items && !d.drafts && !d.home)) throw new Error('형식이 달라요');
        /* 새 백업(v2): 전체 기록을 그대로 옮긴다 */
        if (d.store && typeof d.store === 'object') {
          confirmApplyStore(d.store, '백업 파일');
          return;
        }
        if (!window.confirm('지금 기록을 백업 파일 내용으로 바꿀까요?\n(아이템 ' + ((d.items || []).length) + '개 · 초안 ' + ((d.drafts || []).length) + '개)')) return;
        if (d.items) S.items = d.items;
        if (d.drafts) S.drafts = d.drafts;
        if (d.article) S.article = d.article;
        if (d.home) {
          S.home = d.home;
          if (!S.home.fridge) S.home.fridge = { memo: '', shop: [] };
          if (!S.home.fridge.shop) S.home.fridge.shop = [];
          if (!S.home.checks) S.home.checks = {};
        }
        save(K.items, S.items); save(K.drafts, S.drafts); save(K.article, S.article); save(K.home, S.home);
        renderItems(); renderDrafts(); renderArticle(); renderMemos(); renderKids(); renderShop(); renderSyncSummary();
        toast('불러왔어요');
      } catch (e) {
        toast('백업 파일을 읽지 못했어요');
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================ 🎬 내 기사 */
  var MA_PAGE = 40;
  var MA_CAT_ORDER = ['교육', '지방자치행정', '지역경제', '의료보건', '사회안전', '날씨재난', '환경재해', '문화축제', '정치선거', '기타'];

  function maNorm(s) { return String(s || '').replace(/[^0-9a-z가-힣]/g, '').toLowerCase(); }
  function maDate(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : String(d || ''); }
  function maCatCls(c) { var i = MA_CAT_ORDER.indexOf(c); return 'hc-ma-cat c' + (i < 0 ? 10 : i + 1); }

  /* 서버 목록 + 이 폰에서 추가한 기사 합치기 (같은 날 같은 제목은 내가 적은 것 우선) */
  function maAll() {
    var base = (S.myart && S.myart.items) || [];
    var out = [], seen = {}, i;
    for (i = 0; i < S.myArticles.length; i++) {
      var m = S.myArticles[i];
      out.push({ date: m.date, title: m.title, cat: m.cat || '기타', url: m.url || '', rerun: m.rerun || 0, prog: m.prog || '', mine: true, id: m.id });
      seen[maNorm(m.title) + '|' + m.date] = 1;
    }
    for (i = 0; i < base.length; i++) {
      var b = base[i];
      if (seen[maNorm(b.title) + '|' + b.date]) continue;
      out.push({ date: b.date, title: b.title, cat: b.cat || '기타', url: b.url || '', rerun: b.rerun || 0, prog: b.prog || '' });
    }
    out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.title < b.title ? 1 : -1)); });
    return out;
  }

  function maFiltered() {
    var all = maAll(), out = [], q = maNorm(S.maQ);
    for (var i = 0; i < all.length; i++) {
      var it = all[i];
      if (S.maYear !== 'all' && it.date.slice(0, 4) !== S.maYear) continue;
      if (S.maCat !== 'all' && it.cat !== S.maCat) continue;
      if (q && maNorm(it.title).indexOf(q) < 0) continue;
      out.push(it);
    }
    return out;
  }

  function maItemHTML(it) {
    var url = esc(it.url || '');
    return '<div class="hc-ma">' +
      '<div class="hc-ma-top">' +
      '<span class="hc-ma-d">' + esc(maDate(it.date)) + '</span>' +
      '<span class="' + maCatCls(it.cat) + '">' + esc(it.cat) + '</span>' +
      (it.prog ? '<span class="hc-ma-prog">' + esc(it.prog) + '</span>' : '') +
      (it.rerun ? '<span class="hc-ma-re">재방송 ' + num(it.rerun) + '회</span>' : '') +
      (it.mine ? '<span class="hc-ma-mine">내가 추가</span>' : '') +
      '</div>' +
      (url
        ? '<div class="hc-ma-body"><a class="hc-ma-t" href="' + url + '" target="_blank" rel="noopener">' + esc(it.title) + '</a>' +
          '<a class="hc-ma-go" href="' + url + '" target="_blank" rel="noopener">다시보기 ↗</a></div>'
        : '<div class="hc-ma-body"><span class="hc-ma-t">' + esc(it.title) + '</span>' +
          '<span class="hc-ma-nolink">링크 없음</span></div>') +
      '</div>';
  }

  function renderMyLocal() {
    var el = $('hcMaMine');
    if (!el) return;
    if (!S.myArticles.length) {
      el.innerHTML = '<div class="hc-empty">아직 직접 추가한 기사가 없어요.<br>위 [＋ 새 기사 추가]에서 담으면 여기에 쌓여요.</div>';
      return;
    }
    var h = '<div class="hc-ma-minehead">내가 추가한 기사 ' + num(S.myArticles.length) + '편</div>';
    for (var i = 0; i < S.myArticles.length; i++) {
      var m = S.myArticles[i];
      h += '<div class="hc-ma-minerow"><span class="hc-ma-d">' + esc(maDate(m.date)) + '</span>' +
        '<span class="hc-ma-mt">' + esc(m.title) + '</span>' +
        '<button type="button" class="hc-ma-del" data-ma-del="' + esc(m.id) + '" aria-label="지우기">✕</button></div>';
    }
    el.innerHTML = h;
  }

  function renderMyArt() {
    var kpi = $('hcMaKpi');
    if (!kpi) return;
    var yrs = $('hcMaYears'), cats = $('hcMaCats'), list = $('hcMaList'), cnt = $('hcMaCnt'), upd = $('hcMaUpd'), more = $('hcMaMore');
    var all = maAll(), years = {}, catN = {}, i;
    for (i = 0; i < all.length; i++) {
      var y = all[i].date.slice(0, 4);
      years[y] = (years[y] || 0) + 1;
      catN[all[i].cat] = (catN[all[i].cat] || 0) + 1;
    }
    var range = all.length ? maDate(all[all.length - 1].date) + ' ~ ' + maDate(all[0].date) : '';
    if (upd) upd.textContent = (S.myart && S.myart.updated) ? S.myart.updated + ' 기준' : '이 폰 기록만';
    kpi.innerHTML = '<div class="hc-ma-big"><b>' + num(all.length) + '</b>편</div>' +
      '<div class="hc-ma-sub">' + esc(range) + (S.myArticles.length ? ' · 내가 추가 ' + num(S.myArticles.length) + '편' : '') + '</div>';

    var ykeys = Object.keys(years).sort().reverse();
    var yh = '<button type="button" data-ma-year="all" class="' + (S.maYear === 'all' ? 'on' : '') + '">전체<span class="n">' + num(all.length) + '</span></button>';
    for (i = 0; i < ykeys.length; i++) {
      yh += '<button type="button" data-ma-year="' + ykeys[i] + '" class="' + (S.maYear === ykeys[i] ? 'on' : '') + '">' + ykeys[i] + '<span class="n">' + num(years[ykeys[i]]) + '</span></button>';
    }
    if (yrs) yrs.innerHTML = yh;

    var ch = '<button type="button" data-ma-cat="all" class="' + (S.maCat === 'all' ? 'on' : '') + '">전체 분류<span class="n">' + num(all.length) + '</span></button>';
    for (i = 0; i < MA_CAT_ORDER.length; i++) {
      var k = MA_CAT_ORDER[i];
      if (!catN[k]) continue;
      ch += '<button type="button" data-ma-cat="' + k + '" class="' + (S.maCat === k ? 'on' : '') + '">' + k + '<span class="n">' + num(catN[k]) + '</span></button>';
    }
    if (cats) cats.innerHTML = ch;

    var f = maFiltered();
    if (cnt) cnt.textContent = num(f.length) + '편';
    if (!list) return;
    if (!f.length) {
      list.innerHTML = '<div class="hc-empty">조건에 맞는 기사가 없어요.<br>검색어를 지우거나 다른 분류를 골라 보세요.</div>';
      if (more) more.hidden = true;
      renderMyLocal();
      return;
    }
    var show = Math.min(f.length, S.maShown || MA_PAGE), h = '';
    for (i = 0; i < show; i++) h += maItemHTML(f[i]);
    list.innerHTML = h;
    if (more) {
      more.hidden = !(f.length > show);
      more.textContent = '더 보기 (' + num(f.length - show) + '편) — 누적 ' + num(show) + '/' + num(f.length);
    }
    renderMyLocal();
  }

  function addMyArticle() {
    var di = $('hcMaDate'), ti = $('hcMaTitle'), ci = $('hcMaCat'), ui = $('hcMaUrl');
    var d = (di && di.value) || '';
    var t = ((ti && ti.value) || '').replace(/^\s+|\s+$/g, '');
    var c = (ci && ci.value) || '기타';
    var u = ((ui && ui.value) || '').replace(/^\s+|\s+$/g, '');
    if (!t) { toast('기사 제목을 적어 주세요'); if (ti) ti.focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('방송 날짜를 골라 주세요'); if (di) di.focus(); return; }
    if (u && !/^https?:\/\//i.test(u)) { toast('다시보기 주소는 http로 시작해야 해요'); if (ui) ui.focus(); return; }
    S.myArticles.unshift({ id: uid(), date: d, title: t, cat: c, url: u, rerun: 0, ts: Date.now() });
    save(K.myart, S.myArticles);
    if (ti) ti.value = '';
    if (ui) ui.value = '';
    S.maYear = 'all'; S.maCat = 'all'; S.maQ = ''; S.maShown = MA_PAGE;
    var q = $('hcMaQ'); if (q) q.value = '';
    renderMyArt();
    toast('내 기사에 담았어요 · 이 폰에 저장');
  }

  /* ============================================================ 💰 재정 (v36)
     초희 승인: 🏠 행복핫초 → 💰 재정 (4개 기능)
       ① 노션 가계부 바로가기  ② 이번 달 예산 · 오늘 지출  ③ 마감일 D-day  ④ 이자/대출/절세 계산기
     · 공개 저장소라 통장 잔액·순자산·계좌/카드번호·기프티콘 바코드는 코드에도 JSON에도 넣지 않는다.
     · 숫자는 이 폰의 localStorage(hotcho_finance_v1)에만 저장되고, hotcho_ 접두사라
       ⚙️ 백업·기기 옮기기 코드·파일에도 그대로 담긴다. */
  function finMonthKey(d) { return String(d || kstToday()).slice(0, 7); }
  function finMonthName(mk) { var p = String(mk).split('-'); return p[0] + '년 ' + (+p[1]) + '월'; }
  function finNum(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function finWon(n) { return num(Math.round(n || 0)) + '원'; }
  function finDiffDays(fromIso, toIso) {
    function t(s) { var p = String(s).split('-'); return Date.UTC(+p[0], (+p[1]) - 1, +p[2]); }
    return Math.round((t(toIso) - t(fromIso)) / 86400000);
  }
  function finDaysLeftInMonth(today) {
    var p = String(today || kstToday()).split('-');
    var last = new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate();
    return Math.max(1, last - (+p[2]) + 1);
  }
  function finBudget(mk) { return +S.fin.budgets[mk] || 0; }
  function finMonthSpend(mk) {
    var out = [], a = S.fin.spend || [];
    for (var i = 0; i < a.length; i++) if (finMonthKey(a[i].d) === mk) out.push(a[i]);
    return out;
  }
  function finIn(id, d) {
    var ci = S.fin.calcIn || {};
    if (d == null) d = FIN_CALC_DEF[id];
    return (ci[id] == null || ci[id] === '') ? (d == null ? '' : d) : ci[id];
  }

  /* ============================================================ 📊 가계부 그래프 (v44)
     초희 요청(11/25): 💰 재정 탭 맨 위에 '내 가계부 그래프 보기' 잠금 카드.
       · 공개 저장소(hachohee/quiz)라 숫자는 절대 평문으로 두지 않는다.
         finance_charts.enc.json = PBKDF2-SHA256(60만 회) + AES-GCM-256 암호문.
       · 비밀번호는 코드·저장소 어디에도 없다. 이 폰에서 WebCrypto 로만 풀린다.
       · 성공하면 ① 월별 수입 vs 순수지출 막대 ② 11월 지출 비중 원그래프를 SVG 로 그린다.
       · '이 폰에 기억하기'를 켜면 비밀번호가 아니라 **복호화된 숫자만** localStorage에 남는다.
         (비밀번호를 저장하지 않는 이유: 다른 곳과 같은 번호를 쓸 수 있어서) */
  var FIN_CHARTS_SRC = './finance_charts.enc.json';
  var CHART_DATA = null;        /* 복호화된 가계부 숫자 — 메모리에만 */
  var CHART_BUSY = false;
  var CHART_PIE_COLORS = ['#8b5cf6', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#fb923c',
    '#a3e635', '#22d3ee', '#c084fc', '#f87171', '#fde047', '#38bdf8', '#94a3b8'];

  function finChartLoad() {
    try { return JSON.parse(localStorage.getItem(K.finCharts) || 'null'); } catch (e) { return null; }
  }
  function finChartSave(data) {
    try { localStorage.setItem(K.finCharts, JSON.stringify(data)); } catch (e) {}
  }
  function finChartForget() {
    try { localStorage.removeItem(K.finCharts); } catch (e) {}
  }
  function finChartB64(s) {
    var bin = atob(String(s || '').replace(/\s+/g, '')), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function finChartErr(msg) {
    var el = $('hcFinChartErr');
    if (!el) { if (msg) toast(msg); return; }
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function finChartBusy(on) {
    var b = $('hcFinChartOpenBtn');
    if (b) { b.disabled = !!on; b.textContent = on ? '푸는 중…' : '열기'; }
    var inp = $('hcFinChartPw');
    if (inp) inp.disabled = !!on;
  }

  /* 암호문 풀기 — 서버로 아무것도 보내지 않는다(전부 이 폰 안에서) */
  function finChartDecrypt(pw) {
    if (!(window.crypto && crypto.subtle && crypto.subtle.importKey)) {
      return Promise.reject(new Error('이 브라우저는 암호 풀기를 지원하지 않아 (주소가 https 인지 확인해줘)'));
    }
    return fetch(FIN_CHARTS_SRC + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('암호 파일을 못 받았어 (' + r.status + ')');
        return r.json();
      })
      .then(function (env) {
        var salt = finChartB64(env.salt), iv = finChartB64(env.iv), ct = finChartB64(env.ct);
        var bytes = new TextEncoder().encode(pw);
        return crypto.subtle.importKey('raw', bytes, { name: 'PBKDF2' }, false, ['deriveKey'])
          .then(function (base) {
            return crypto.subtle.deriveKey(
              { name: 'PBKDF2', salt: salt, iterations: env.iter || 600000, hash: 'SHA-256' },
              base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
          })
          .then(function (key) {
            return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
          })
          .then(function (buf) {
            return JSON.parse(new TextDecoder().decode(buf));
          });
      })
      .catch(function (e) {
        if (e && (e.name === 'OperationError' || e.name === 'DataError')) {
          throw new Error('비밀번호가 맞지 않아');
        }
        throw e;
      });
  }

  function finChartUnlock() {
    var inp = $('hcFinChartPw');
    if (!inp || CHART_BUSY) return;
    var pw = (inp.value || '').trim();
    finChartErr('');
    if (!pw) { finChartErr('비밀번호를 넣어줘'); inp.focus(); return; }
    CHART_BUSY = true; finChartBusy(true);
    finChartDecrypt(pw).then(function (data) {
      CHART_BUSY = false; finChartBusy(false);
      CHART_DATA = data;
      var rem = $('hcFinChartRemember');
      if (!rem || rem.checked) finChartSave(data); else finChartForget();
      renderFinCharts();
      toast('가계부 그래프를 열었어 · 이 폰에서만 보여');
    }).catch(function (e) {
      CHART_BUSY = false; finChartBusy(false);
      finChartErr((e && e.message) ? e.message : '열리지 않았어 — 비밀번호를 확인해줘');
      if (inp) { try { inp.select(); } catch (err) {} }
    });
  }

  function finChartLock() {
    CHART_DATA = null; finChartForget(); renderFinCharts();
    toast('가계부 그래프를 다시 잠갔어 · 이 폰에 남긴 숫자도 지웠어');
  }

  function finChartMan(v) { return String(Math.round((+v || 0) / 10000)); }

  /* ① 월별 막대 — 순수 지출(분홍) vs 들어온 돈(초록) */
  function finChartBarSvg(data) {
    var rows = (data && data.monthly) || [];
    if (!rows.length) return '';
    var W = 340, H = 186, padL = 24, padR = 4, padT = 18, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var max = 0;
    for (var i = 0; i < rows.length; i++) max = Math.max(max, +rows[i].pure || 0, +rows[i].inc || 0);
    var top = Math.max(1000000, Math.ceil(max / 500000) * 500000);
    var y = function (v) { return padT + plotH - (Math.max(0, +v || 0) / top) * plotH; };
    var slot = plotW / rows.length;
    var bw = Math.max(5, Math.min(9, slot * 0.32));
    var s = '<svg class="hc-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="월별 수입과 순수 지출 막대그래프">';
    /* 가로 눈금 50만원 간격 */
    for (var g = 0; g <= top; g += 500000) {
      var gy = y(g).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="rgba(255,255,255,' + (g === 0 ? '.22' : '.07') + ')" stroke-width=".8"/>';
      s += '<text x="' + (padL - 3) + '" y="' + (+gy + 2.1) + '" font-size="5.4" fill="#8f85bd" text-anchor="end">' + Math.round(g / 10000) + '</text>';
    }
    var janAt = -1, firstYear = String(rows[0].m).slice(2, 4);
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j], cx = padL + slot * j + slot / 2;
      var px = cx - bw - 1, ix = cx + 1;
      var ph = padT + plotH - y(r.pure), ih = padT + plotH - y(r.inc);
      s += '<rect x="' + px.toFixed(1) + '" y="' + y(r.pure).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.8, ph).toFixed(1) + '" rx="1.2" fill="#fb7185"/>';
      if ((+r.inc || 0) > 0) {
        s += '<rect x="' + ix.toFixed(1) + '" y="' + y(r.inc).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.8, ih).toFixed(1) + '" rx="1.2" fill="#34d399"/>';
        if (+r.inc >= 200000) {
          s += '<text x="' + (ix + bw / 2).toFixed(1) + '" y="' + (y(r.inc) - 2).toFixed(1) + '" font-size="5" fill="#a7f3d0" text-anchor="middle" stroke="#160f2b" stroke-width="1.5" paint-order="stroke">' + finChartMan(r.inc) + '</text>';
        }
      }
      s += '<text x="' + (px + bw / 2).toFixed(1) + '" y="' + (y(r.pure) - 2).toFixed(1) + '" font-size="5" fill="#e6e1f7" text-anchor="middle" stroke="#160f2b" stroke-width="1.5" paint-order="stroke">' + finChartMan(r.pure) + '</text>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (padT + plotH + 11) + '" font-size="5.6" fill="#b9b0e0" text-anchor="middle">' + String(r.m).slice(5) + '</text>';
      if (String(r.m).slice(5) === '01' && janAt < 0) janAt = j;
    }
    /* 연도 줄 */
    var mid25 = padL + (slot * (janAt < 0 ? rows.length : janAt)) / 2;
    s += '<text x="' + mid25.toFixed(1) + '" y="' + (padT + plotH + 21) + '" font-size="5.2" fill="#8f85bd" text-anchor="middle">20' + firstYear + '년</text>';
    if (janAt >= 0) {
      var mid26 = padL + slot * janAt + (slot * (rows.length - janAt)) / 2;
      s += '<text x="' + mid26.toFixed(1) + '" y="' + (padT + plotH + 21) + '" font-size="5.2" fill="#8f85bd" text-anchor="middle">20' + String(rows[janAt].m).slice(2, 4) + '년</text>';
    }
    s += '<text x="' + padL + '" y="' + (padT - 6) + '" font-size="5.6" fill="#8f85bd">만원</text>';
    s += '</svg>';
    return s;
  }

  /* ② 11월 원그래프 */
  function finChartPieSvg(nov) {
    var cats = (nov && nov.cats) || [];
    var total = (nov && nov.total) || 0;
    if (!cats.length || !total) return '';
    var W = 300, H = 170, cx = W / 2, cy = H / 2, r = 56, sw = 26;
    var C = 2 * Math.PI * r, off = 0;
    var s = '<svg class="hc-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="11월 지출 비중 원그래프">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="' + sw + '"/>';
    for (var i = 0; i < cats.length; i++) {
      var frac = (+cats[i].v || 0) / total;
      var len = Math.max(0, frac * C - 1.1);   /* 조각 사이 1px 틈 */
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + CHART_PIE_COLORS[i % CHART_PIE_COLORS.length] + '"' +
        ' stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '"' +
        ' stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      off += frac * C;
    }
    s += '<text x="' + cx + '" y="' + (cy - 7) + '" font-size="8" fill="#a79cd4" text-anchor="middle">순수 지출</text>';
    s += '<text x="' + cx + '" y="' + (cy + 8) + '" font-size="12.5" fill="#f3f0ff" text-anchor="middle" font-weight="700">' + num(Math.round(total)) + '원</text>';
    s += '<text x="' + cx + '" y="' + (cy + 21) + '" font-size="6.4" fill="#8f85bd" text-anchor="middle">' + esc((nov.range || '') + ' · ' + (nov.n || 0) + '건') + '</text>';
    s += '</svg>';
    return s;
  }

  function finChartOpenHtml(d) {
    var nov = d.nov || {};
    var cats = nov.cats || [];
    var total = +nov.total || 0;
    var h = '';
    h += '<div class="hc-chart-top"><span class="hc-tiny">' + esc(d.range || '') + ' · ' + esc(d.source || '') + '</span>' +
      '<button type="button" class="hc-btn ghost sm" data-act="fin-charts-lock">🔒 잠그기</button></div>';
    if (d.headline && d.headline.length) {
      h += '<ul class="hc-chart-head">';
      for (var i = 0; i < d.headline.length; i++) h += '<li>' + esc(d.headline[i]) + '</li>';
      h += '</ul>';
    }
    /* ① 월별 */
    h += '<div class="hc-chart-block"><div class="hc-chart-title">① 월별 수입 vs 순수 지출 <span>큰 덩어리 제외 · 만원</span></div>';
    h += finChartBarSvg(d);
    h += '<div class="hc-chart-legend"><span><i style="background:#fb7185"></i>순수 지출</span><span><i style="background:#34d399"></i>들어온 돈</span></div>';
    var last = (d.monthly || [])[(d.monthly || []).length - 1] || {};
    if (last.m) {
      h += '<p class="hc-chart-cap">맨 끝 ' + esc(String(last.m).replace('-', '년 ') + '월' + (last.part ? ' (' + last.part + ')' : '')) +
        ' — 순수 지출 <b>' + num(last.pure) + '원</b>' + (last.inc ? ' · 들어온 돈 <b>' + num(last.inc) + '원</b>' : '') + '</p>';
    }
    h += '</div>';
    /* ② 11월 비중 */
    h += '<div class="hc-chart-block"><div class="hc-chart-title">② 11월 지출 비중 <span>순수 지출 기준</span></div>';
    h += finChartPieSvg(nov);
    h += '<div class="hc-chart-pie-leg">';
    for (var k = 0; k < cats.length; k++) {
      var pct = total ? ((+cats[k].v || 0) / total * 100) : 0;
      h += '<div class="hc-chart-pie-row"><i style="background:' + CHART_PIE_COLORS[k % CHART_PIE_COLORS.length] + '"></i>' +
        '<span class="n">' + esc(cats[k].k) + '</span>' +
        '<span class="a">' + num(cats[k].v) + '</span>' +
        '<span class="p">' + pct.toFixed(1) + '%</span></div>';
    }
    h += '</div>';
    if (nov.reclass) h += '<p class="hc-chart-cap">※ ' + esc(nov.reclass) + '</p>';
    h += '</div>';
    h += '<p class="hc-note">이 숫자는 이 폰에서만 풀립니다 · 서버로는 아무것도 보내지 않아요 · 🔒 잠그기를 누르면 이 폰에 남긴 숫자도 지워요</p>';
    return h;
  }

  function renderFinCharts() {
    var el = $('hcFinChartBody');
    if (!el) return;
    var meta = $('hcFinChartMeta');
    if (!CHART_DATA) CHART_DATA = finChartLoad();
    if (CHART_DATA) {
      el.innerHTML = finChartOpenHtml(CHART_DATA);
      if (meta) meta.textContent = '열림 · ' + (CHART_DATA.updated || '');
      return;
    }
    if (meta) meta.textContent = '암호화 · 이 폰에서만';
    el.innerHTML =
      '<p class="hc-chart-lead">뱅크샐러드 1년 원장을 그래프로 담아 뒀어. 공개 저장소라 숫자는 <b>AES 암호</b>로 잠가 두고, 이 폰에서만 풀려.</p>' +
      '<div class="hc-add-row" style="margin-top:0">' +
      '<input class="hc-input" id="hcFinChartPw" type="password" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="뱅샐 비밀번호 4자리">' +
      '<button type="button" class="hc-btn primary" id="hcFinChartOpenBtn" data-act="fin-charts-open" style="flex:0 0 auto">열기</button></div>' +
      '<label class="hc-chart-remember"><input type="checkbox" id="hcFinChartRemember" checked>' +
      '<span>이 폰에 기억하기 <em>(비밀번호는 저장하지 않고 그래프 숫자만)</em></span></label>' +
      '<div class="hc-chart-err" id="hcFinChartErr" hidden></div>';
  }

  function renderMoney() {
    var mk = finMonthKey();
    var mEl = $('hcFinMonth'); if (mEl) mEl.textContent = finMonthName(mk) + ' 기준';
    var bi = $('hcFinBudgetIn'); if (bi) bi.value = finBudget(mk) ? String(finBudget(mk)) : '';
    var dd = $('hcFinDDate'); if (dd && !dd.value) dd.value = kstToday();
    finGauge(); finSpendList(); finDDayList(); finCalc(); renderFinCharts();
  }

  /* ② 이번 달 누적 · 남은 예산 게이지 */
  function finGauge() {
    var el = $('hcFinGauge'); if (!el) return;
    var mk = finMonthKey(), today = kstToday();
    var budget = finBudget(mk), list = finMonthSpend(mk);
    var used = 0, todayUsed = 0;
    for (var i = 0; i < list.length; i++) {
      var a = +(list[i].amt) || 0;
      used += a;
      if (list[i].d === today) todayUsed += a;
    }
    var left = budget - used;
    var pct = budget > 0 ? Math.round(used / budget * 100) : 0;
    var cls = (budget > 0 && used > budget) ? 'over' : (pct >= 80 ? 'warn' : '');
    var h = '<div class="hc-fin-top"><b>' + num(used) + '원</b>' +
      '<span class="of">' + (budget > 0 ? '/ ' + num(budget) + '원' : '/ 예산 미설정') + '</span>' +
      '<span class="pct" style="color:' + (budget > 0 && used > budget ? '#fb7185' : (pct >= 80 ? '#fbbf24' : '#6ee7b7')) + '">' +
      (budget > 0 ? pct + '%' : '—') + '</span></div>' +
      '<div class="hc-fin-bar"><i class="' + cls + '" style="width:' + Math.min(100, Math.max(0, pct)) + '%"></i></div>' +
      '<div class="hc-fin-sub">';
    if (budget > 0) {
      h += left >= 0
        ? '<span>남은 돈 <b>' + num(left) + '원</b></span>'
        : '<span style="color:#fb7185">예산 <b style="color:#fb7185">' + num(-left) + '원</b> 넘었어</span>';
    }
    h += '<span>오늘 <b>' + num(todayUsed) + '원</b></span>';
    if (budget > 0 && left > 0) h += '<span>이번 달 ' + finDaysLeftInMonth() + '일 남아 하루 <b>' + num(Math.round(left / finDaysLeftInMonth())) + '원</b>씩</span>';
    if (!list.length) h += '<span>아직 적은 지출이 없어</span>';
    h += '</div>';
    el.innerHTML = h;
  }

  function finSpendList() {
    var el = $('hcFinList'); if (!el) return;
    var mk = finMonthKey();
    var list = finMonthSpend(mk).slice().sort(function (a, b) {
      if (a.d !== b.d) return a.d < b.d ? 1 : -1;
      return (b.ts || 0) - (a.ts || 0);
    });
    if (!list.length) {
      el.innerHTML = '<div class="hc-empty">이번 달 지출이 아직 없어요.<br>위에 적고 ＋추가를 누르면 이 폰에만 저장돼요</div>';
      return;
    }
    var h = '', sum = 0;
    for (var i = 0; i < list.length; i++) {
      var it = list[i], amt = +(it.amt) || 0;
      sum += amt;
      h += '<div class="hc-fin-row">' +
        '<span class="hc-fin-cat">' + (FIN_CAT_E[it.cat] || '🧾') + ' ' + esc(it.cat || '기타') + '</span>' +
        '<span class="lb">' + esc(it.label || '지출') +
        '<span class="d">' + esc(String(it.d || '').slice(5).replace('-', '/')) + '</span></span>' +
        '<span class="amt">' + num(amt) + '</span>' +
        '<button type="button" class="x" data-act="fin-del" data-fin-del="' + it.id + '" aria-label="이 지출 지우기">✕</button></div>';
    }
    h += '<p class="hc-note">이번 달 ' + list.length + '건 · 합계 ' + finWon(sum) + '</p>';
    el.innerHTML = h;
  }

  function finSetBudget() {
    var el = $('hcFinBudgetIn'); if (!el) return;
    var v = Math.max(0, Math.round(finNum(el.value)));
    var mk = finMonthKey();
    if (!S.fin.budgets) S.fin.budgets = {};
    if (v > 0) S.fin.budgets[mk] = v; else delete S.fin.budgets[mk];
    finSave(); finGauge();
    toast(v > 0 ? finMonthName(mk) + ' 예산 ' + finWon(v) + '으로 잡았어' : '이번 달 예산을 비웠어');
  }

  function finAddSpend() {
    var li = $('hcFinLabel'), ai = $('hcFinAmt'), ci = $('hcFinCat');
    var label = ((li && li.value) || '').replace(/^\s+|\s+$/g, '');
    var amt = Math.round(finNum(ai && ai.value));
    var cat = (ci && ci.value) || '기타';
    if (!amt) { toast('금액을 적어 주세요'); if (ai) ai.focus(); return; }
    if (!label) label = cat + ' 지출';
    S.fin.spend.unshift({ id: uid(), d: kstToday(), label: label, amt: amt, cat: cat, ts: Date.now() });
    if (S.fin.spend.length > 3000) S.fin.spend = S.fin.spend.slice(0, 3000);   /* 오래된 것 정리 */
    finSave();
    if (li) li.value = '';
    if (ai) ai.value = '';
    finGauge(); finSpendList();
    toast(finWon(amt) + ' 담았어 · 이 폰에만 저장');
  }

  function finDelSpend(id) {
    var before = (S.fin.spend || []).length;
    S.fin.spend = (S.fin.spend || []).filter(function (x) { return x.id !== id; });
    if (S.fin.spend.length === before) return;
    finSave(); finGauge(); finSpendList();
  }

  /* ③ 마감일 D-day */
  function finDDayList() {
    var el = $('hcFinDDayList'); if (!el) return;
    var today = kstToday();
    var list = (S.fin.ddays || []).slice().sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      return a.d < b.d ? -1 : (a.d > b.d ? 1 : 0);
    });
    var cnt = $('hcFinDDayCnt');
    if (cnt) {
      var soon = 0;
      for (var k = 0; k < list.length; k++) {
        var dd0 = finDiffDays(today, list[k].d);
        if (!list[k].done && dd0 >= 0 && dd0 <= 7) soon++;
      }
      cnt.textContent = soon ? '이번 주 ' + soon + '건' : (list.length ? list.length + '건' : '');
    }
    if (!list.length) {
      el.innerHTML = '<div class="hc-empty">마감일이 비어 있어요.<br>아래에 날짜와 이름을 적으면 D-day로 세어 드려요</div>';
      return;
    }
    var h = '';
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var diff = finDiffDays(today, it.d);
      var badge, bcls;
      if (it.done) { badge = '완료'; bcls = 'past'; }
      else if (diff === 0) { badge = 'D-day'; bcls = 'today'; }
      else if (diff > 0) { badge = 'D-' + diff; bcls = diff <= 7 ? 'soon' : ''; }
      else { badge = (diff === -1 ? '어제' : Math.abs(diff) + '일 지남'); bcls = 'past'; }
      h += '<div class="hc-dday">' +
        '<input type="checkbox" data-fin-ddone="' + it.id + '"' + (it.done ? ' checked' : '') + ' aria-label="마감 챙김">' +
        '<span class="b"><span class="t' + (it.done ? ' done' : '') + '">' + esc(it.label) + '</span>' +
        '<span class="m" style="display:block">' + esc(it.d) + '</span></span>' +
        '<span class="dd ' + bcls + '">' + badge + '</span>' +
        '<button type="button" class="x" data-act="fin-dday-del" data-fin-dday-del="' + it.id + '" aria-label="지우기">✕</button></div>';
    }
    el.innerHTML = h;
  }

  function finAddDDay() {
    var li = $('hcFinDLabel'), di = $('hcFinDDate');
    var label = ((li && li.value) || '').replace(/^\s+|\s+$/g, '');
    var d = (di && di.value) || '';
    if (!label) { toast('무엇인지 적어 주세요'); if (li) li.focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('날짜를 골라 주세요'); if (di) di.focus(); return; }
    S.fin.ddays.push({ id: uid(), d: d, label: label, done: false });
    finSave();
    if (li) li.value = '';
    finDDayList();
    toast('마감일 담았어 · D-' + Math.max(0, finDiffDays(kstToday(), d)));
  }

  function finToggleDDay(id, done) {
    var a = S.fin.ddays || [];
    for (var i = 0; i < a.length; i++) if (a[i].id === id) a[i].done = !!done;
    finSave(); finDDayList();
  }

  function finDelDDay(id) {
    S.fin.ddays = (S.fin.ddays || []).filter(function (x) { return x.id !== id; });
    finSave(); finDDayList();
  }

  /* ④ 계산기 — 2026년 현행 세율만 쓴다(바뀌면 이 화면 문구부터 고친다) */
  function finCalc() {
    var tab = S.fin.calc || 'saving';
    var tabs = $('hcFinCalcTabs');
    if (tabs) {
      var bs = tabs.querySelectorAll('[data-fin-calc]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-fin-calc') === tab);
    }
    var body = $('hcFinCalcBody'); if (!body) return;
    var h = '', fieldW = 'flex:1;min-width:82px;margin-bottom:0';
    if (tab === 'saving') {
      h += '<div class="hc-field"><label>넣는 방식</label><select class="hc-sel fin-cin" id="hcFinSvMode">' +
        '<option value="lump"' + (finIn('hcFinSvMode', 'lump') === 'lump' ? ' selected' : '') + '>거치식 — 한 번에 넣고 만기까지</option>' +
        '<option value="monthly"' + (finIn('hcFinSvMode', 'lump') === 'monthly' ? ' selected' : '') + '>적립식 — 매달 같은 금액</option></select></div>' +
        '<div class="hc-row">' +
        '<div class="hc-field" style="' + fieldW + '"><label>금액 (만원 · 적립식은 매달)</label><input class="hc-input fin-cin" id="hcFinSvAmt" type="number" inputmode="decimal" value="' + esc(finIn('hcFinSvAmt', '100')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>연이율 (%)</label><input class="hc-input fin-cin" id="hcFinSvRate" type="number" inputmode="decimal" value="' + esc(finIn('hcFinSvRate', '3.5')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>기간 (개월)</label><input class="hc-input fin-cin" id="hcFinSvMon" type="number" inputmode="numeric" value="' + esc(finIn('hcFinSvMon', '12')) + '"></div></div>' +
        '<p class="hc-note">이자소득세 15.4%(소득세 14% + 지방세 1.4%)를 떼고 알려 줘요 · 적립식은 은행 적금처럼 매달 넣은 돈에 월 단리로 붙여요</p>';
    } else if (tab === 'loan') {
      h += '<div class="hc-row">' +
        '<div class="hc-field" style="' + fieldW + '"><label>빌린 원금 (만원)</label><input class="hc-input fin-cin" id="hcFinLoAmt" type="number" inputmode="decimal" value="' + esc(finIn('hcFinLoAmt', '3000')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>연이율 (%)</label><input class="hc-input fin-cin" id="hcFinLoRate" type="number" inputmode="decimal" value="' + esc(finIn('hcFinLoRate', '4.5')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>기간 (개월)</label><input class="hc-input fin-cin" id="hcFinLoMon" type="number" inputmode="numeric" value="' + esc(finIn('hcFinLoMon', '60')) + '"></div></div>' +
        '<p class="hc-note">원리금균등(매달 같은 금액) 기준이에요 · 중도상환·인지세·보증료는 빼고 계산했어요</p>';
    } else {
      h += '<div class="hc-row">' +
        '<div class="hc-field" style="flex:1;min-width:120px;margin-bottom:0"><label>총급여 (만원)</label><input class="hc-input fin-cin" id="hcFinTxSal" type="number" inputmode="decimal" value="' + esc(finIn('hcFinTxSal', '5000')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>연금저축 (만원/년)</label><input class="hc-input fin-cin" id="hcFinTxPen" type="number" inputmode="decimal" value="' + esc(finIn('hcFinTxPen', '600')) + '"></div>' +
        '<div class="hc-field" style="' + fieldW + '"><label>IRP (만원/년)</label><input class="hc-input fin-cin" id="hcFinTxIrp" type="number" inputmode="decimal" value="' + esc(finIn('hcFinTxIrp', '300')) + '"></div></div>' +
        '<div class="hc-row" style="margin-top:8px">' +
        '<div class="hc-field" style="' + fieldW + '"><label>ISA 순이익 (만원)</label><input class="hc-input fin-cin" id="hcFinTxIsa" type="number" inputmode="decimal" value="' + esc(finIn('hcFinTxIsa', '300')) + '"></div>' +
        '<div class="hc-field" style="flex:1;min-width:110px;margin-bottom:0"><label>ISA 종류</label><select class="hc-sel fin-cin" id="hcFinTxIsaType">' +
        '<option value="normal"' + (finIn('hcFinTxIsaType', 'normal') === 'normal' ? ' selected' : '') + '>일반형 (200만)</option>' +
        '<option value="seomin"' + (finIn('hcFinTxIsaType', 'normal') === 'seomin' ? ' selected' : '') + '>서민형 (400만)</option></select></div></div>' +
        '<p class="hc-note">2026년 현행 기준 — 연금저축 600만·IRP 합산 900만 한도, 총급여 5,500만 이하면 16.5% · 넘으면 13.2% · ISA 비과세 200만(서민 400만), 넘는 이익은 9.9%</p>';
    }
    h += '<div class="hc-fin-out" id="hcFinCalcOut"></div>';
    body.innerHTML = h;
    var outEl = $('hcFinCalcOut');
    if (outEl) outEl.innerHTML = finCalcOutHTML();   /* 화면에 실제로 들어간 값으로 계산 */
  }

  function finCalcOutHTML() {
    var tab = S.fin.calc || 'saving';
    function g(id, d) { var el = $(id); return el ? el.value : finIn(id, d); }
    var rows = [], i;
    if (tab === 'saving') {
      var mode = g('hcFinSvMode', FIN_CALC_DEF.hcFinSvMode);
      var per = Math.max(0, finNum(g('hcFinSvAmt', FIN_CALC_DEF.hcFinSvAmt || '100'))) * 10000;
      var rate = Math.max(0, finNum(g('hcFinSvRate', FIN_CALC_DEF.hcFinSvRate || '3.5')));
      var mon = Math.max(0, Math.round(finNum(g('hcFinSvMon', FIN_CALC_DEF.hcFinSvMon || '12'))));
      var principal = mode === 'monthly' ? per * mon : per;
      var interest = mode === 'monthly'
        ? per * (rate / 100 / 12) * (mon * (mon + 1) / 2)   /* 매달 넣은 돈 × 남은 개월 */
        : per * (rate / 100) * (mon / 12);
      var tax = interest * FIN_INT_TAX;
      rows = [
        ['넣는 원금', finWon(principal)],
        ['세전 이자', finWon(interest)],
        ['이자소득세 15.4%', '-' + finWon(tax)],
        ['세후 이자', finWon(interest - tax), 'hl'],
        ['만기 수령액 (세후)', finWon(principal + interest - tax), 'big']
      ];
    } else if (tab === 'loan') {
      var p = Math.max(0, finNum(g('hcFinLoAmt', FIN_CALC_DEF.hcFinLoAmt || '3000'))) * 10000;
      var r = Math.max(0, finNum(g('hcFinLoRate', FIN_CALC_DEF.hcFinLoRate || '4.5')));
      var n = Math.max(1, Math.round(finNum(g('hcFinLoMon', FIN_CALC_DEF.hcFinLoMon || '60'))));
      var mi = r / 100 / 12;
      var m = mi > 0 ? p * mi / (1 - Math.pow(1 + mi, -n)) : p / n;
      rows = [
        ['빌린 원금', finWon(p)],
        ['매달 갚는 돈', finWon(m), 'big'],
        ['총 갚는 돈', finWon(m * n)],
        ['그중 이자', finWon(m * n - p), 'hl']
      ];
    } else {
      var sal = Math.max(0, finNum(g('hcFinTxSal', FIN_CALC_DEF.hcFinTxSal || '5000'))) * 10000;
      var pen = Math.max(0, finNum(g('hcFinTxPen', FIN_CALC_DEF.hcFinTxPen || '0'))) * 10000;
      var irp = Math.max(0, finNum(g('hcFinTxIrp', FIN_CALC_DEF.hcFinTxIrp || '0'))) * 10000;
      var crate = sal <= 55000000 ? 0.165 : 0.132;
      var base = Math.min(Math.min(pen, 6000000) + irp, 9000000);
      var isaP = Math.max(0, finNum(g('hcFinTxIsa', FIN_CALC_DEF.hcFinTxIsa || '300'))) * 10000;
      var isaLim = (g('hcFinTxIsaType', FIN_CALC_DEF.hcFinTxIsaType) === 'seomin') ? 4000000 : 2000000;
      var isaTax = Math.max(0, isaP - isaLim) * 0.099;
      var normTax = isaP * FIN_INT_TAX;
      rows = [
        ['세액공제 받는 납입액', finWon(base) + ' / 900만'],
        ['공제율', Math.round(crate * 1000) / 10 + '% · 총급여 ' + (sal <= 55000000 ? '5,500만 이하' : '5,500만 초과')],
        ['돌려받는 세금', finWon(base * crate), 'big'],
        ['한도까지 더 넣을 돈', finWon(Math.max(0, 9000000 - base))],
        ['ISA 비과세 한도', finWon(isaLim)],
        ['ISA 이익에 붙는 세금', finWon(isaTax) + ' (9.9%)'],
        ['같은 돈을 일반계좌에 넣으면', finWon(normTax) + ' (15.4%)'],
        ['ISA로 아끼는 세금', finWon(Math.max(0, normTax - isaTax)), 'hl']
      ];
    }
    var h = '<div class="hc-fin-out-t">결과</div>';
    for (i = 0; i < rows.length; i++) {
      h += '<div class="hc-fin-or' + (rows[i][2] ? ' ' + rows[i][2] : '') + '">' +
        '<span class="k">' + esc(rows[i][0]) + '</span><span class="v">' + rows[i][1] + '</span></div>';
    }
    return h;
  }

  /* ------------------------------------------------------------ 뼈대 그리기 */
  /* 상단 서브메뉴는 '버튼'으로만 두고, 고른 메뉴 한 칸만 화면에 남긴다.
     (길게 나열하면 폰에서 스크롤 지옥이 된다 — 초희 요청) */
  function menuBtn(group, key, emoji, label, cls) {
    var on = (group === 'work' ? S.workSec : S.homeSec) === key;
    return '<button type="button" class="' + (on ? 'on ' : '') + (cls || '') + '" data-' + group + '-sec="' + key + '">' +
      '<span class="e">' + emoji + '</span>' + esc(label) + '</button>';
  }

  function workHTML() {
    return '' +
      '<div class="hc-head"><div><h2>💼 뿌듯핫초</h2><p class="hc-sub">취재기자 업무 허브 · 일</p></div>' +
      '<button type="button" class="hc-refresh" data-act="refresh">↻ 새로고침</button></div>' +

      '<nav class="hc-menu work" id="hcWorkMenu" aria-label="뿌듯핫초 메뉴">' +
      menuBtn('work', 'news', '📰', '뉴스 · 언론모니터') +
      menuBtn('work', 'policy', '🏛', '정책 모니터') +
      menuBtn('work', 'cartel', '🕵️', '카르텔워치') +
      menuBtn('work', 'items', '🧩', '아이템 구상') +
      menuBtn('work', 'article', '✍️', '기사작성') +
      menuBtn('work', 'myart', '🎬', '내 기사') +
      '</nav>' +

      /* ---------------- 📰 뉴스 · 언론모니터 (실시간 뉴스 | 일일브리핑 | 누적·추가취재) ---------------- */
      '<div class="hc-sec" id="hcSec-news">' +
      '<div class="hc-seg wrap" id="hcNewsSeg" role="tablist" aria-label="뉴스·언론모니터 하위 메뉴"></div>' +
      '<div id="hcNewsPane-live">' +
      '<section class="hc-card hc-dbrief" id="hcDailyBrief" hidden></section>' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📰 실시간 주요뉴스</h3><span class="hc-tiny" id="hcNewsUpd">불러오는 중…</span></div>' +
      '<div class="hc-seg" id="hcNewsTabs"></div>' +
      '<div class="hc-news-list" id="hcNewsList"></div>' +
      '<p class="hc-note">기사 제목을 누르면 원문이 열려요 · 💡를 누르면 아이템 구상에 그대로 담겨요</p>' +
      '</section></div>' +
      '<div id="hcNewsPane-daily" hidden></div>' +
      '<div id="hcNewsPane-acc" hidden></div>' +
      '</div>' +

      /* ---------------- 🏛 정책 모니터 (전용) ---------------- */
      '<div class="hc-sec" id="hcSec-policy" hidden>' +
      '<div class="hc-seg wrap" id="hcPolTabs"></div>' +
      '<div id="hcPolBody"></div>' +
      '</div>' +

      '<div class="hc-sec" id="hcSec-cartel" hidden>' +
      '<section class="hc-card" id="hcCartelCard"></section></div>' +

      '<div class="hc-sec" id="hcSec-items" hidden>' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🧩 아이템 구상</h3><span class="hc-tiny" id="hcItemCnt"></span></div>' +
      '<div class="hc-field"><label>소재(제목)</label><input class="hc-input" id="hcItemTitle" placeholder="예: ○○군, 수의계약 3건으로 쪼개 발주"></div>' +
      '<div class="hc-row" style="margin:0 0 9px">' +
      '<select class="hc-sel" id="hcItemCat" style="flex:1;width:auto">' + CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>' +
      '<select class="hc-sel" id="hcItemStatus" style="flex:1;width:auto">' + STATUS.map(function (s) { return '<option>' + s.k + '</option>'; }).join('') + '</select>' +
      '</div>' +
      '<div class="hc-field"><label>핵심 팩트</label><textarea class="hc-ta" id="hcItemFacts" rows="2" placeholder="숫자·기관·날짜처럼 확인된 것만"></textarea></div>' +
      '<div class="hc-field"><label>취재처 / 확인할 것</label><input class="hc-input" id="hcItemSrc" placeholder="예: ○○군 계약담당 · 공사내역서 요청"></div>' +
      '<div class="hc-row"><button type="button" class="hc-btn primary" data-act="item-add" id="hcItemAddBtn">＋ 소재 추가</button>' +
      '<button type="button" class="hc-btn ghost" data-act="item-cancel" id="hcItemCancelBtn" hidden>취소</button></div>' +
      '<div id="hcItemList" style="margin-top:12px"></div>' +
      '</section></div>' +

      '<div class="hc-sec" id="hcSec-article" hidden>' +
      '<section class="hc-card" id="hcArticleCard">' +
      '<div class="hc-card-head"><h3>✍️ 기사작성</h3><span class="hc-tiny" id="hcArtLink"></span></div>' +
      '<div class="hc-seg" id="hcArtTabs"></div>' +
      '<div id="hcArtFields"></div>' +
      '<div class="hc-count" id="hcArtCount"></div>' +
      '<div class="hc-row" style="margin-top:10px">' +
      '<button type="button" class="hc-btn primary" data-act="art-copy">📋 전체 복사</button>' +
      '<button type="button" class="hc-btn" data-act="art-save">💾 초안 저장함</button>' +
      '<button type="button" class="hc-btn ghost" data-act="art-clear">비우기</button></div>' +
      '<details class="hc-fold"><summary>💾 저장한 초안 (<span id="hcDraftCnt">0</span>)</summary><div id="hcDraftList"></div></details>' +
      '<p class="hc-note">초안은 이 폰에만 저장돼요 · 리포트는 1분에 ' + READ_CHARS_PER_MIN + '자 기준으로 방송 길이를 계산해요</p>' +
      '</section></div>' +

      /* ---------------- 🎬 내 기사 아카이브 ---------------- */
      '<div class="hc-sec" id="hcSec-myart" hidden>' +
      '<section class="hc-card hc-ma-sum">' +
      '<div class="hc-card-head"><h3>🎬 내 기사 아카이브</h3><span class="hc-tiny" id="hcMaUpd">불러오는 중…</span></div>' +
      '<div id="hcMaKpi"></div>' +
      '<p class="hc-note">노션에 정리해 둔 2014~2026년 보도 목록을 그대로 담았어요. 복직하면 아래 [＋ 새 기사 추가]로 바로 쌓으면 돼요.</p>' +
      '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🔎 연도 · 분류로 찾기</h3><span class="hc-tiny" id="hcMaCnt"></span></div>' +
      '<div class="hc-ma-chips" id="hcMaYears"></div>' +
      '<div class="hc-ma-chips" id="hcMaCats"></div>' +
      '<input class="hc-input" id="hcMaQ" type="search" placeholder="제목으로 찾기 (예: 교육예산·폐교·산불·의료공백)" autocomplete="off" enterkeyhint="search">' +
      '<div class="hc-ma-list" id="hcMaList"></div>' +
      '<button type="button" class="hc-btn ghost sm" data-ma-more="1" id="hcMaMore" style="width:100%;margin-top:10px" hidden></button>' +
      '<p class="hc-note">제목을 누르면 다시보기가 열려요 · 같은 곳을 두 번 눌러도 안전해요</p>' +
      '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>＋ 새 기사 추가</h3><span class="hc-tiny">복직 후 계속</span></div>' +
      '<div class="hc-field"><label>방송 날짜</label><input class="hc-input" id="hcMaDate" type="date" value="' + kstToday() + '"></div>' +
      '<div class="hc-field"><label>제목</label><input class="hc-input" id="hcMaTitle" placeholder="예: ○○군 교육예산 30% 삭감…왜?" autocomplete="off"></div>' +
      '<div class="hc-field"><label>분류</label><select class="hc-sel" id="hcMaCat">' + MA_CAT_ORDER.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="hc-field"><label>다시보기 링크 (선택)</label><input class="hc-input" id="hcMaUrl" type="url" placeholder="https://news.kbs.co.kr/..." autocomplete="off" inputmode="url"></div>' +
      '<div class="hc-row"><button type="button" class="hc-btn primary" data-act="ma-add">＋ 내 기사에 담기</button>' +
      '<a class="hc-btn ghost" href="' + NOTION_ARTICLES_URL + '" target="_blank" rel="noopener">노션 목록 열기 ↗</a></div>' +
      '<div id="hcMaMine" style="margin-top:12px"></div>' +
      '<p class="hc-note">여기서 담은 기사는 이 폰에만 먼저 저장되고(⚙️ 백업·기기 옮기기에도 함께 가요), 노션에 한 번에 옮기려면 <b>scripts/sync_my_articles.py</b>를 돌리면 돼요.</p>' +
      '</section></div>';
  }

  function homeHTML() {
    return '' +
      '<div class="hc-head"><div><h2>🏠 행복핫초</h2><p class="hc-sub">우리 집 허브 · 집</p></div>' +
      '<button type="button" class="hc-refresh" data-act="refresh">↻ 새로고침</button></div>' +

      '<nav class="hc-menu home" id="hcHomeMenu" aria-label="행복핫초 메뉴">' +
      menuBtn('home', 'events', '📅', '가족일정') +
      menuBtn('home', 'kids', '🎒', '찬우학업') +
      menuBtn('home', 'money', '💰', '재정') +
      menuBtn('home', 'fridge', '🍳', '냉파') +
      '<button type="button" class="wide" data-act="sync-jump" aria-label="내 기록 백업 · 기기 옮기기 (전체) — 화면 맨 아래로"><span class="e">⚙️</span>백업/이동 ↓</button>' +
      '</nav>' +

      '<div class="hc-sec" id="hcHSec-events">' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📅 가족일정 (앞으로 2주)</h3><span class="hc-tiny" id="hcEvUpd"></span></div>' +
      '<div id="hcEvList"></div>' +
      '<p class="hc-note" id="hcEvNote"></p>' +
      '</section>' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📝 빠른 집안 메모</h3><span class="hc-tiny" id="hcMemoCnt"></span></div>' +
      '<div id="hcMemoList"></div>' +
      '<div class="hc-add-row"><input class="hc-input" id="hcMemoInput" placeholder="예: 세탁기 필터 청소">' +
      '<button type="button" class="hc-btn primary" data-act="memo-add">추가</button></div>' +
      '</section></div>' +

      '<div class="hc-sec" id="hcHSec-kids" hidden>' +
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🎒 찬우학업</h3><span class="hc-tiny" id="hcKidsDay"></span></div>' +
      '<a class="hc-open" href="' + STUDY_APP + '" target="_blank" rel="noopener">' +
      '<span class="e">🎒</span><span class="b"><b>찬우친구들 공부방 열기</b><span>오늘 분량 · 읽기 글 · 퀴즈 · 도장판</span></span><span class="go">›</span></a>' +
      '<div id="hcKidsTopics"></div>' +
      '<div style="margin-top:10px" id="hcKidsChecks"></div>' +
      '<p class="hc-note">체크는 오늘 날짜로만 남고, 날이 바뀌면 새로 시작해요</p>' +
      '</section></div>' +

      /* 🍳 냉파 — 초희 요청(11/24): 잡다한 블록은 다 빼고 '미션! 건강 냉파!' 앱으로 바로 가는 카드만 */
      '<div class="hc-sec" id="hcHSec-fridge" hidden>' +
      '<section class="hc-card hc-fr-hero">' +
      '<div class="hc-card-head"><h3>🍳 냉파</h3><span class="hc-tiny">냉장고 정리 앱으로 바로</span></div>' +
      '<a class="hc-fr-open" href="' + FRIDGE_APP + '" target="_blank" rel="noopener">' +
      '<span class="e">🧊</span>' +
      '<span class="b"><b>미션! 건강 냉파!</b><span>재료 · 유통기한 관리 · 메뉴 추천 · 장보기까지 앱에서 한 번에</span></span>' +
      '<span class="go">열기 ↗</span></a>' +
      '<p class="hc-note">누르면 냉파 앱이 새 화면으로 열려요 · 기록은 앱 안에만 저장돼요</p>' +
      '</section>' +
      '<details class="hc-fold">' +
      '<summary>🛒 장보기 · 냉장고 메모 (접힘)</summary>' +
      '<div class="hc-field" style="margin-top:8px"><textarea class="hc-ta" id="hcFridgeMemo" rows="3" placeholder="먼저 먹어야 할 것, 남은 재료…"></textarea></div>' +
      '<div id="hcShopList"></div>' +
      '<div class="hc-add-row"><input class="hc-input" id="hcShopInput" placeholder="예: 두부 1모">' +
      '<button type="button" class="hc-btn primary" data-act="shop-add">추가</button></div>' +
      '<button type="button" class="hc-btn ghost sm" data-act="shop-clear" style="margin-top:8px">산 것 지우기</button>' +
      '</details></div>' +

      '<div class="hc-sec" id="hcHSec-money" hidden>' +

      /* 📊 내 가계부 그래프(잠금) — v44 */
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📊 내 가계부 그래프</h3><span class="hc-tiny" id="hcFinChartMeta">암호화 · 이 폰에서만</span></div>' +
      '<div id="hcFinChartBody"></div>' +
      '</section>' +

      /* ① 노션 가계부 바로가기 */
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📒 노션 가계부 · 소비 분석</h3><span class="hc-tiny">내 계정 전용</span></div>' +
      '<a class="hc-open" href="' + NOTION_LEDGER_URL + '" target="_blank" rel="noopener">' +
      '<span class="e">📊</span><span class="b"><b>월별 가계부 · 내 돈 흐름 열기</b>' +
      '<span>2025~2026 통합 가계부 · 신한은행 13년 원장 · 맨 위 3줄 요약</span></span><span class="go">↗</span></a>' +
      '<p class="hc-note">노션은 초희가 로그인한 브라우저에서만 열려요 · 앱에는 주소만 있고 잔액·계좌 같은 숫자는 담지 않아요</p>' +
      '</section>' +

      /* ② 이번 달 예산 · 오늘 지출 */
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>💸 이번 달 예산 · 오늘 지출</h3><span class="hc-tiny" id="hcFinMonth"></span></div>' +
      '<div class="hc-fin-budget">' +
      '<label for="hcFinBudgetIn">이번 달 목표 예산 (원)</label>' +
      '<div class="hc-add-row" style="margin-top:0">' +
      '<input class="hc-input" id="hcFinBudgetIn" type="number" inputmode="numeric" placeholder="예: 2000000">' +
      '<button type="button" class="hc-btn primary" data-act="fin-budget">저장</button></div></div>' +
      '<div id="hcFinGauge" style="margin-top:13px"></div>' +
      '<div class="hc-fin-form">' +
      '<input class="hc-input" id="hcFinLabel" placeholder="무엇에 썼어? (예: 점심 김치찌개)" autocomplete="off" enterkeyhint="next">' +
      '<div class="hc-row" style="margin-top:7px">' +
      '<input class="hc-input" id="hcFinAmt" type="number" inputmode="numeric" placeholder="금액(원)" style="flex:1 1 110px;width:auto">' +
      '<select class="hc-sel" id="hcFinCat" style="flex:0 0 auto;width:auto;min-width:92px">' +
      FIN_CATS.map(function (c) { return '<option value="' + c + '">' + FIN_CAT_E[c] + ' ' + c + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="hc-btn primary" data-act="fin-add" style="flex:0 0 auto">＋ 추가</button></div></div>' +
      '<div id="hcFinList" style="margin-top:10px"></div>' +
      '<p class="hc-note">예산·지출은 이 폰에만 저장돼요 · ⚙️ 백업/이동 기록 코드에 함께 담겨요</p>' +
      '</section>' +

      /* ③ 마감일 D-day */
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>⏰ 마감일 챙기기</h3><span class="hc-tiny" id="hcFinDDayCnt"></span></div>' +
      '<div id="hcFinDDayList"></div>' +
      '<div class="hc-add-row" style="margin-top:10px">' +
      '<input class="hc-input" id="hcFinDLabel" placeholder="예: 스타벅스 1+1" autocomplete="off" style="flex:1 1 120px">' +
      '<input class="hc-input" id="hcFinDDate" type="date" style="flex:0 0 auto;width:auto">' +
      '<button type="button" class="hc-btn primary" data-act="fin-dday-add" style="flex:0 0 auto">＋</button></div>' +
      '<p class="hc-note">7일 안에 닥친 마감은 노란 빛으로 떠요 · 바코드·금액은 넣지 않고 날짜와 이름만 적어 두세요</p>' +
      '</section>' +

      /* ④ 이자 · 대출 · 절세 계산기 */
      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🧮 이자 · 대출 · 절세 계산기</h3><span class="hc-tiny">2026 현행 세율</span></div>' +
      '<div class="hc-seg" id="hcFinCalcTabs">' +
      '<button type="button" data-act="fin-calc" data-fin-calc="saving" class="on">예·적금</button>' +
      '<button type="button" data-act="fin-calc" data-fin-calc="loan">대출</button>' +
      '<button type="button" data-act="fin-calc" data-fin-calc="tax">ISA·연금</button></div>' +
      '<div id="hcFinCalcBody"></div>' +
      '<p class="hc-note">숫자만 넣으면 바로 다시 계산해요 · 결과는 어림값이라 실제 상품 약관을 한 번 더 확인하세요</p>' +
      '</section></div>';
  }

  /* ------------------------------------------------------------ 공통 맨 아래 백업 바 */
  /* 초희 요청(11/24): ⚙️ 내 기록 백업 · 기기 옮기기를 🏠행복핫초 메뉴 안에만 두지 않고
     📚똑똑·💼뿌듯·🏠행복 세 모드 어디서든 페이지 맨 아래 같은 자리(한 줄 접힘)에 보이게.
     저장 키(tmq_*·hotcho_*)와 복원 로직은 한 줄도 바꾸지 않고 그릇만 옮겼습니다. */
  function sharedHTML() {
    return '' +
      '<details class="hc-share" id="hcSyncDetails">' +
      '<summary><span class="hc-share-tt">⚙️ 내 기록 백업 · 기기 옮기기 <em>(전체)</em></span>' +
      '<span class="hc-share-sub">폰 ↔ 태블릿</span></summary>' +
      '<div class="hc-share-body">' +
      '<p class="hc-note" id="hcSyncSummary" style="margin:0 2px 10px"></p>' +
      '<div class="hc-row"><button type="button" class="hc-btn primary" data-act="code-copy">📋 기록 코드 복사</button>' +
      '<button type="button" class="hc-btn" data-act="code-open">📥 기록 코드 붙여넣기</button></div>' +
      '<div id="hcSyncBox" hidden style="margin-top:10px">' +
      '<textarea class="hc-ta" id="hcSyncText" rows="4" spellcheck="false" placeholder="폰에서 복사한 기록 코드를 여기에 붙여넣고 [✅ 이 기기에 적용]을 눌러 주세요"></textarea>' +
      '<div class="hc-row" style="margin-top:8px"><button type="button" class="hc-btn primary" data-act="code-apply">✅ 이 기기에 적용</button>' +
      '<button type="button" class="hc-btn ghost" data-act="code-close">닫기</button></div>' +
      '<p class="hc-note" id="hcSyncInfo">폰에서 [📋 기록 코드 복사] → 메모·메일(또는 카톡)로 태블릿에 보내기 → 태블릿에서 위 칸에 붙여넣고 [✅ 이 기기에 적용].<br>코드가 길면 카톡이 중간에 자를 수 있으니 메모·메일이 안전해요.</p>' +
      '</div>' +
      '<div class="hc-row" style="margin-top:10px"><button type="button" class="hc-btn" data-act="export">⬇️ 파일로 내보내기</button>' +
      '<button type="button" class="hc-btn" data-act="import">⬆️ 파일에서 불러오기</button></div>' +
      '<p class="hc-note">BTS 도감·공부방 진도·오답노트·아이템·초안·메모까지 한 번에 옮겨요. 보던 모드·소리 설정은 이 기기 것을 그대로 둡니다.</p>' +
      '</div></details>' +
      '<input type="file" id="hcImportFile" accept="application/json,.json" hidden>';
  }

  /* 백업 바를 펴고(원하면 그 자리로 스크롤) 지금 기록 요약을 새로 채운다 */
  function openSyncPanel(scroll) {
    var d = $('hcSyncDetails');
    if (!d) return;
    d.open = true;
    renderSyncSummary();
    if (scroll) {
      try { d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      catch (e) { try { d.scrollIntoView(); } catch (e2) {} }
    }
  }

  /* ------------------------------------------------------------ 새로고침 */
  function refreshData(silent, btn) {
    if (btn) btn.textContent = '↻ 받는 중…';
    return Promise.all([
      fetchJSON('hotcho_news.json').then(function (d) { S.news = d; }, function () { return null; }),
      fetchJSON('hotcho_hub.json').then(function (d) { S.hub = d; }, function () { return null; }),
      fetchJSON('hotcho_family.json').then(function (d) { S.family = d; }, function () { return null; }),
      fetchJSON('hotcho_monitor.json').then(function (d) { S.mon = d; }, function () { return null; }),
      fetchJSON('hotcho_briefings.json').then(function (d) { S.brief = d; }, function () { return null; }),
      fetchJSON('my_articles.json').then(function (d) { S.myart = d; }, function () { return null; })
    ]).then(function () {
        if (btn) btn.textContent = '↻ 새로고침';
      renderNews(); renderMonitor(); renderCartel(); renderEvents(); renderKids(); renderMyArt();
      if (S.workSec === 'policy') renderPolicy();
      if (!silent) {
        var ok = S.news || S.family;
        toast(ok ? '최신으로 맞췄어요' : '데이터를 못 받았어요 — 잠시 뒤 다시');
      }
    });
  }

  /* ------------------------------------------------------------ 이벤트 */
  function onWorkClick(e) {
    var t = e.target.closest ? e.target.closest('[data-work-sec],[data-news-sub],[data-pol-tab],[data-cal-nav],[data-cal-day],[data-trend],[data-acc-topic],[data-acc-search],[data-brief-add],[data-pol-add],[data-news-tab],[data-add-news],[data-item-write],[data-item-next],[data-item-edit],[data-item-del],[data-art-tab],[data-draft-load],[data-draft-del],[data-mon-tab],[data-mon-add],[data-mon-kw],[data-mon-kwdel],[data-mon-kwadd],[data-mon-only],[data-ma-year],[data-ma-cat],[data-ma-more],[data-ma-del],[data-act]') : null;
    if (!t) return;

    /* --- 메뉴 버튼 전환 --- */
    var wsec = t.getAttribute('data-work-sec');
    if (wsec) { showWorkSec(wsec); return; }

    /* --- 📰 뉴스·언론모니터 하위 탭 --- */
    var nsub = t.getAttribute('data-news-sub');
    if (nsub) { S.newsSub = newsSubKey(nsub); saveUi(); renderNewsBody(); try { window.scrollTo(0, 0); } catch (err) {} return; }

    var polt = t.getAttribute('data-pol-tab');
    if (polt) { S.polTab = polt; saveUi(); renderPolTabs(); renderPolBody(); return; }

    var caln = t.getAttribute('data-cal-nav');
    if (caln) {
      var m = S.calM + (+caln), y = S.calY;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      S.calM = m; S.calY = y;
      var calEl = $('hcCal');
      if (calEl) calEl.innerHTML = calHTML();
      return;
    }

    var cald = t.getAttribute('data-cal-day');
    if (cald) {
      S.briefDate = cald;
      var sp = cald.split('-');
      S.calY = +sp[0]; S.calM = (+sp[1]) - 1;
      renderDailyParts();
      return;
    }

    var trd = t.getAttribute('data-trend');
    if (trd) { S.trendKind = trd; saveUi(); var trEl = $('hcTrend'); if (trEl) trEl.innerHTML = trendHTML(); return; }

    var acct = t.getAttribute('data-acc-topic');
    if (acct !== null) {
      S.accTopic = acct;
      var box = $('hcNewsPane-acc');
      if (box) {
        box.innerHTML = accHTML();
      }
      return;
    }

    if (t.getAttribute('data-acc-search')) {
      var qi = $('hcAccQ');
      if (qi) S.accQ = qi.value || '';
      var le = $('hcAccList');
      if (le) le.innerHTML = accListHTML();
      return;
    }

    var ba = t.getAttribute('data-brief-add');
    if (ba) { addFromBrief(ba); return; }

    var pa = t.getAttribute('data-pol-add');
    if (pa) { addFromPolicy(pa); return; }

    var monTab = t.getAttribute('data-mon-tab');
    if (monTab) { S.monTab = monTab; saveMon(); renderMonitor(); return; }

    var monAdd = t.getAttribute('data-mon-add');
    if (monAdd != null) { addMonitorItem(+monAdd); return; }

    var monKwDel = t.getAttribute('data-mon-kwdel');
    if (monKwDel) { removeMonitorKeyword(monKwDel); return; }

    var monKw = t.getAttribute('data-mon-kw');
    if (monKw != null) {
      S.monKw = (S.monKw === monKw) ? '' : monKw;
      saveMon(); renderMonitor(); return;
    }

    if (t.getAttribute('data-mon-kwadd')) { addMonitorKeyword(); return; }

    if (t.getAttribute('data-mon-only')) {
      S.monOnly = !S.monOnly;
      if (S.monOnly) S.monKw = '';
      saveMon(); renderMonitor(); return;
    }

    var newsTab = t.getAttribute('data-news-tab');
    if (newsTab) { S.newsTab = newsTab; renderNews(); return; }

    var addNews = t.getAttribute('data-add-news');
    if (addNews != null) { addNewsItem(+addNews); return; }

    var wr = t.getAttribute('data-item-write');
    if (wr) { writeArticleFromItem(wr); return; }

    var nx = t.getAttribute('data-item-next');
    if (nx) {
      for (var i = 0; i < S.items.length; i++) {
        if (S.items[i].id === nx) { S.items[i].status = nextStatus(S.items[i].status); S.items[i].updatedAt = Date.now(); }
      }
      save(K.items, S.items); renderItems(); toast('상태를 바꿨어요');
      return;
    }

    var ed = t.getAttribute('data-item-edit');
    if (ed) {
      for (var j = 0; j < S.items.length; j++) if (S.items[j].id === ed) fillItemForm(S.items[j]);
      return;
    }

    var dl = t.getAttribute('data-item-del');
    if (dl) {
      if (!window.confirm('이 소재를 지울까요?')) return;
      S.items = S.items.filter(function (x) { return x.id !== dl; });
      save(K.items, S.items); renderItems(); toast('지웠어요');
      return;
    }

    var at = t.getAttribute('data-art-tab');
    if (at) { S.artTab = at; renderArticle(); return; }

    /* --- 🎬 내 기사 --- */
    var may = t.getAttribute('data-ma-year');
    if (may) { S.maYear = may; S.maShown = MA_PAGE; renderMyArt(); return; }

    var mac = t.getAttribute('data-ma-cat');
    if (mac) { S.maCat = mac; S.maShown = MA_PAGE; renderMyArt(); return; }

    if (t.getAttribute('data-ma-more')) { S.maShown = (S.maShown || MA_PAGE) + MA_PAGE; renderMyArt(); return; }

    var mad = t.getAttribute('data-ma-del');
    if (mad) {
      if (!window.confirm('이 기사를 내 목록에서 지울까요?\n(내가 추가한 기사만 지워져요)')) return;
      S.myArticles = S.myArticles.filter(function (x) { return x.id !== mad; });
      save(K.myart, S.myArticles); renderMyArt(); toast('지웠어요');
      return;
    }

    var dload = t.getAttribute('data-draft-load');
    if (dload) {
      for (var k = 0; k < S.drafts.length; k++) {
        if (S.drafts[k].id === dload) {
          S.artTab = S.drafts[k].kind;
          S.article[S.artTab] = JSON.parse(JSON.stringify(S.drafts[k].fields || {}));
          save(K.article, S.article);
          S.linkedItem = ''; S.linkedUrl = '';
          renderArticle();
          toast('초안을 불러왔어요');
        }
      }
      return;
    }

    var ddel = t.getAttribute('data-draft-del');
    if (ddel) {
      S.drafts = S.drafts.filter(function (x) { return x.id !== ddel; });
      save(K.drafts, S.drafts); renderDrafts(); toast('초안을 지웠어요');
      return;
    }

    var act = t.getAttribute('data-act');
    if (!act) return;
    if (act === 'refresh') { refreshData(false, t); return; }
    if (act === 'item-add') { submitItem(); return; }
    if (act === 'item-cancel') { fillItemForm(null); return; }
    if (act === 'art-copy') {
      var text = artText();
      if (!text) { toast('먼저 내용을 적어 주세요'); return; }
      copyText(text).then(function (ok) { toast(ok ? '기사 전체를 복사했어요' : '복사가 안 됐어요 — 길게 눌러 복사해 주세요'); });
      return;
    }
    if (act === 'art-save') { saveDraft(); return; }
    if (act === 'ma-add') { addMyArticle(); return; }
    if (act === 'art-clear') {
      if (!window.confirm('지금 쓰고 있는 ' + DRAFT_DEFS[S.artTab].label + ' 내용을 비울까요?')) return;
      S.article[S.artTab] = {}; S.linkedItem = ''; S.linkedUrl = '';
      save(K.article, S.article); renderArticle(); toast('비웠어요');
      return;
    }
  }

  function onWorkInput(e) {
    var t = e.target;
    if (t.id === 'hcMaQ') {
      S.maQ = t.value || '';
      S.maShown = MA_PAGE;
      clearTimeout(onWorkInput._ma);
      onWorkInput._ma = setTimeout(function () { renderMyArt(); }, 160);
      return;
    }
    if (t.id === 'hcAccQ') {
      S.accQ = t.value || '';
      clearTimeout(onWorkInput._q);
      onWorkInput._q = setTimeout(function () {
        var le = $('hcAccList');
        if (le) le.innerHTML = accListHTML();
      }, 220);
      return;
    }
    var artKey = t.getAttribute && t.getAttribute('data-art');
    if (artKey) {
      if (!S.article[S.artTab]) S.article[S.artTab] = {};
      S.article[S.artTab][artKey] = t.value;
      var c = document.querySelector('[data-count="' + artKey + '"]');
      if (c) c.textContent = t.value.length + '자';
      updateArticleCount();
      clearTimeout(onWorkInput._t);
      onWorkInput._t = setTimeout(function () { save(K.article, S.article); }, 400);
    }
  }

  function onHomeClick(e) {
    var hs = e.target.closest ? e.target.closest('[data-home-sec]') : null;
    if (hs) { showHomeSec(hs.getAttribute('data-home-sec')); return; }
    var t = e.target.closest ? e.target.closest('[data-act],[data-memo-del],[data-shop-del]') : null;
    if (t) {
      var act = t.getAttribute('data-act');
      if (act && act.indexOf('fr-') === 0) { frAct(act, t); return; }
      if (act === 'refresh') { refreshData(false, t); return; }
      if (act === 'memo-add') { addMemo(); return; }
      if (act === 'shop-add') { addShop(); return; }
      if (act === 'shop-clear') {
        S.home.fridge.shop = (S.home.fridge.shop || []).filter(function (s) { return !s.done; });
        save(K.home, S.home); renderShop(); toast('산 것은 지웠어요');
        return;
      }
      if (act === 'export') { exportAll(); return; }
      if (act === 'sync-jump') { openSyncPanel(true); return; }
      if (act === 'fin-charts-open') { finChartUnlock(); return; }
      if (act === 'fin-charts-lock') { finChartLock(); return; }
      if (act === 'fin-budget') { finSetBudget(); return; }
      if (act === 'fin-add') { finAddSpend(); return; }
      if (act === 'fin-del') { finDelSpend(t.getAttribute('data-fin-del')); return; }
      if (act === 'fin-dday-add') { finAddDDay(); return; }
      if (act === 'fin-dday-del') { finDelDDay(t.getAttribute('data-fin-dday-del')); return; }
      if (act === 'fin-calc') { S.fin.calc = t.getAttribute('data-fin-calc') || 'saving'; finSave(); finCalc(); return; }
      if (act === 'import') { var f = $('hcImportFile'); if (f) f.click(); return; }
      if (act === 'code-copy') { copySyncCode(); return; }
      if (act === 'code-open') { openSyncBox(''); return; }
      if (act === 'code-apply') { applySyncText(); return; }
      if (act === 'code-close') { var bx = $('hcSyncBox'); if (bx) bx.hidden = true; return; }
      var md = t.getAttribute('data-memo-del');
      if (md) {
        S.home.memos = S.home.memos.filter(function (m) { return m.id !== md; });
        save(K.home, S.home); renderMemos(); return;
      }
      var sd = t.getAttribute('data-shop-del');
      if (sd) {
        S.home.fridge.shop = S.home.fridge.shop.filter(function (s) { return s.id !== sd; });
        save(K.home, S.home); renderShop(); return;
      }
      return;
    }

    var cb = e.target;
    if (cb.getAttribute && cb.getAttribute('data-memo-toggle')) {
      var id = cb.getAttribute('data-memo-toggle');
      for (var i = 0; i < S.home.memos.length; i++) if (S.home.memos[i].id === id) S.home.memos[i].done = cb.checked;
      save(K.home, S.home); renderMemos(); return;
    }
    if (cb.getAttribute && cb.getAttribute('data-shop-toggle')) {
      var sid = cb.getAttribute('data-shop-toggle');
      for (var j = 0; j < S.home.fridge.shop.length; j++) if (S.home.fridge.shop[j].id === sid) S.home.fridge.shop[j].done = cb.checked;
      save(K.home, S.home); renderShop(); return;
    }
    /* 💰 재정 — 마감일 체크 */
    var fd = cb.getAttribute && cb.getAttribute('data-fin-ddone');
    if (fd) { finToggleDDay(fd, cb.checked); return; }
    var ck = cb.getAttribute && cb.getAttribute('data-check');
    if (ck) {
      var today = kstToday();
      if (!S.home.checks[today]) S.home.checks[today] = {};
      S.home.checks[today][ck] = cb.checked;
      /* 30일이 지난 체크 기록은 정리 */
      var keys = Object.keys(S.home.checks);
      if (keys.length > 40) {
        keys.sort();
        for (var k = 0; k < keys.length - 40; k++) delete S.home.checks[keys[k]];
      }
      save(K.home, S.home); renderKids();
    }
  }

  /* 세 모드 공통 맨 아래 백업 바(#hcShared) — #hcWork·#hcHome 바깥이라 따로 받습니다 */
  function onSharedClick(e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    if (act === 'export') { exportAll(); return; }
    if (act === 'import') { var f = $('hcImportFile'); if (f) f.click(); return; }
    if (act === 'code-copy') { copySyncCode(); return; }
    if (act === 'code-open') { openSyncBox(''); return; }
    if (act === 'code-apply') { applySyncText(); return; }
    if (act === 'code-close') { var bx = $('hcSyncBox'); if (bx) bx.hidden = true; return; }
  }

  function addMemo() {
    var inp = $('hcMemoInput');
    var text = (inp.value || '').trim();
    if (!text) { inp.focus(); return; }
    S.home.memos.push({ id: uid(), text: text, done: false, ts: Date.now() });
    save(K.home, S.home);
    inp.value = '';
    renderMemos();
  }

  function addShop() {
    var inp = $('hcShopInput');
    var text = (inp.value || '').trim();
    if (!text) { inp.focus(); return; }
    S.home.fridge.shop.push({ id: uid(), text: text, done: false });
    save(K.home, S.home);
    inp.value = '';
    renderShop();
  }

  function onHomeInput(e) {
    var fid = e.target && e.target.id;

    /* 💰 재정 — 계산기 입력: 숫자만 저장하고 결과만 다시 그린다(입력 중 포커스 안 잃게) */
    if (e.target && e.target.classList && e.target.classList.contains('fin-cin')) {
      if (!S.fin.calcIn) S.fin.calcIn = {};
      S.fin.calcIn[fid] = e.target.value;
      clearTimeout(onHomeInput._fin);
      onHomeInput._fin = setTimeout(finSave, 500);
      var out = $('hcFinCalcOut');
      if (out) out.innerHTML = finCalcOutHTML();
      return;
    }

    if (fid === 'hcFrHeld' || fid === 'hcFrPrio' || fid === 'hcFrQ') {
      var v = e.target.value || '';
      if (fid === 'hcFrHeld') FR.ing = v;
      else if (fid === 'hcFrPrio') FR.prio = v;
      else FR.q = v;
      FR.shown = FR_PAGE; FR.open = -1;
      if (fid !== 'hcFrQ') frSaveIng();      /* 재료는 바로 저장(앱을 닫아도 남게) */
      clearTimeout(onHomeInput._fr);
      onHomeInput._fr = setTimeout(function () {
        frRender();
      }, 180);
      return;
    }
    if (e.target && e.target.id === 'hcFridgeMemo') {
      S.home.fridge.memo = e.target.value;
      clearTimeout(onHomeInput._t);
      onHomeInput._t = setTimeout(function () { save(K.home, S.home); }, 400);
    }
  }

  function onKey(e) {
    if (e.key !== 'Enter') return;
    var id = e.target.id;
    if (id === 'hcMemoInput') { e.preventDefault(); addMemo(); }
    if (id === 'hcFinLabel' || id === 'hcFinAmt') { e.preventDefault(); finAddSpend(); }
    if (id === 'hcFinChartPw') { e.preventDefault(); finChartUnlock(); }
    if (id === 'hcFinBudgetIn') { e.preventDefault(); finSetBudget(); try { e.target.blur(); } catch (err) {} }
    if (id === 'hcFinDLabel') { e.preventDefault(); finAddDDay(); }
    if (id === 'hcShopInput') { e.preventDefault(); addShop(); }
    if (id === 'hcFrHeld' || id === 'hcFrPrio' || id === 'hcFrQ') {
      e.preventDefault();
      clearTimeout(onHomeInput._fr);
      if (id !== 'hcFrQ') frSaveIng();
      frRender();
      try { e.target.blur(); } catch (err) {}
    }
    if (id === 'hcFrAiKeyIn') { e.preventDefault(); frAct('fr-ai-save', e.target); }
    if (id === 'hcItemTitle') { e.preventDefault(); submitItem(); }
    if (id === 'hcAccQ') {
      e.preventDefault();
      S.accQ = e.target.value || '';
      var le = $('hcAccList');
      if (le) le.innerHTML = accListHTML();
    }
  }

  /* ------------------------------------------------------------ 시작 */
  function boot() {
    var work = $('hcWork');
    var home = $('hcHome');
    if (!work || !home) return;
    work.innerHTML = workHTML();
    home.innerHTML = homeHTML();

    /* ⚙️ 백업 바 — 세 모드 공통, 페이지 맨 아래 한 자리 */
    var shared = $('hcShared');
    if (shared) {
      shared.innerHTML = sharedHTML();
      shared.addEventListener('click', onSharedClick);
      var sdet = $('hcSyncDetails');
      if (sdet) sdet.addEventListener('toggle', function () { if (sdet.open) renderSyncSummary(); });
    }

    var bar = $('hcBar');
    if (bar) {
      bar.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-hc-mode]') : null;
        if (!t) return;
        setMode(t.getAttribute('data-hc-mode'));
      });
    }
    work.addEventListener('click', onWorkClick);
    work.addEventListener('input', onWorkInput);
    home.addEventListener('click', onHomeClick);
    home.addEventListener('input', onHomeInput);
    document.addEventListener('keydown', onKey);

    var imp = $('hcImportFile');
    if (imp) imp.addEventListener('change', function () {
      if (imp.files && imp.files[0]) importAll(imp.files[0]);
      imp.value = '';
    });

    frInit();
    frRenderAi();
    fillItemForm(null);
    renderArticle();
    renderDrafts();
    renderItems();
    renderMyArt();
    renderMonitor();
    renderMemos();
    renderShop();
    renderSyncSummary();
    showWorkSec(S.workSec);
    showHomeSec(S.homeSec);

    var mode = 'study';
    try {
      var q = (location.search.match(/[?&]mode=([a-z]+)/) || [])[1];
      mode = q || localStorage.getItem(K.mode) || 'study';
    } catch (e) {}
    setMode(mode, false);

    refreshData(true);
    /* 화면으로 돌아올 때 30분 넘게 지났으면 조용히 새로 받아 둠 */
    var last = Date.now();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last > 30 * 60 * 1000) { last = Date.now(); refreshData(true); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* 바깥에서 모드를 바꿀 수 있게 (딥링크·테스트용) */
  window.hotchoSetMode = setMode;
})();

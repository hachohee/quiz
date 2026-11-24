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

  var K = {
    items: 'hotcho_items_v1',
    drafts: 'hotcho_drafts_v1',
    article: 'hotcho_article_v1',
    home: 'hotcho_home_v1',
    mode: 'hotcho_mode_v1'
  };

  var CATS = ['강원', '전국', '탐사', '생활'];
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
    article: load(K.article, null) || { brief: {}, report: {} },
    home: load(K.home, null) || { memos: [], fridge: { memo: '', shop: [] }, checks: {} },
    editing: '',
    pickedNews: {},
    linkedItem: '',
    linkedUrl: ''
  };
  if (!S.article.brief) S.article.brief = {};
  if (!S.article.report) S.article.report = {};
  if (!S.home.memos) S.home.memos = [];
  if (!S.home.fridge) S.home.fridge = { memo: '', shop: [] };
  if (!S.home.fridge.shop) S.home.fridge.shop = [];
  if (!S.home.checks) S.home.checks = {};

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
    if (mode === 'work') { renderNews(); renderCartel(); renderItems(); renderArticle(); renderDrafts(); }
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

  function renderNews() {
    var listEl = $('hcNewsList');
    var updEl = $('hcNewsUpd');
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
      keys: keys,
      kb: Math.max(1, Math.round(bytes / 1024))
    };
  }
  function summaryText(st) {
    return 'BTS ' + st.deck + '/7 · 오답 ' + st.wrong + '개 · 소재 ' + st.items + '개 · 초안 ' + st.drafts + '개 · 저장 항목 ' + st.keys + '개 (' + st.kb + 'KB)';
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
        if (ok) {
          toast('기록 코드를 복사했어요 (' + Math.max(1, Math.round(code.length / 1024)) + 'KB) — 카톡·메모로 보내세요');
        } else {
          openSyncBox(code);
          toast('복사가 안 됐어요 — 아래 칸의 코드를 길게 눌러 복사해 주세요');
        }
      });
    }, function () { toast('기록 코드를 만들지 못했어요 — 백업 파일을 써 주세요'); });
  }
  function openSyncBox(prefill) {
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
    if (info && prefill) info.textContent = '위 코드를 전부 선택해 복사한 뒤, 옮길 기기에서 [📥 기록 코드 붙여넣기]에 넣어 주세요.';
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

  /* ------------------------------------------------------------ 뼈대 그리기 */
  function workHTML() {
    return '' +
      '<div class="hc-head"><div><h2>💼 뿌듯핫초</h2><p class="hc-sub">취재기자 업무 허브 · 일</p></div>' +
      '<button type="button" class="hc-refresh" data-act="refresh">↻ 새로고침</button></div>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📰 실시간 주요뉴스</h3><span class="hc-tiny" id="hcNewsUpd">불러오는 중…</span></div>' +
      '<div class="hc-seg" id="hcNewsTabs"></div>' +
      '<div class="hc-news-list" id="hcNewsList"></div>' +
      '<p class="hc-note">기사 제목을 누르면 원문이 열려요 · 💡를 누르면 아이템 구상에 그대로 담겨요</p>' +
      '</section>' +

      '<section class="hc-card" id="hcCartelCard"></section>' +

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
      '</section>' +

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
      '</section>';
  }

  function homeHTML() {
    return '' +
      '<div class="hc-head"><div><h2>🏠 행복핫초</h2><p class="hc-sub">우리 집 허브 · 집</p></div>' +
      '<button type="button" class="hc-refresh" data-act="refresh">↻ 새로고침</button></div>' +

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
      '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>📚 찬우학업</h3><span class="hc-tiny" id="hcKidsDay"></span></div>' +
      '<a class="hc-open" href="' + STUDY_APP + '" target="_blank" rel="noopener">' +
      '<span class="e">🎒</span><span class="b"><b>찬우친구들 공부방 열기</b><span>오늘 분량 · 읽기 글 · 퀴즈 · 도장판</span></span><span class="go">›</span></a>' +
      '<div id="hcKidsTopics"></div>' +
      '<div style="margin-top:10px" id="hcKidsChecks"></div>' +
      '<p class="hc-note">체크는 오늘 날짜로만 남고, 날이 바뀌면 새로 시작해요</p>' +
      '</section>' +

      '<section class="hc-card">' +
      '<div class="hc-card-head"><h3>🧊 냉파 · 미션! 건강 냉파</h3><span class="hc-tiny">냉장고 정리</span></div>' +
      '<a class="hc-open" href="' + FRIDGE_APP + '" target="_blank" rel="noopener">' +
      '<span class="e">🧊</span><span class="b"><b>냉파 앱 열기</b><span>재료 넣으면 만들 수 있는 반찬을 알려 줘요</span></span><span class="go">›</span></a>' +
      '<div class="hc-field"><label>냉장고 메모</label><textarea class="hc-ta" id="hcFridgeMemo" rows="3" placeholder="먼저 먹어야 할 것, 남은 재료…"></textarea></div>' +
      '<div class="hc-card-head" style="margin:12px 0 4px"><h3 style="font-size:13px">🛒 장보기</h3></div>' +
      '<div id="hcShopList"></div>' +
      '<div class="hc-add-row"><input class="hc-input" id="hcShopInput" placeholder="예: 두부 1모">' +
      '<button type="button" class="hc-btn primary" data-act="shop-add">추가</button></div>' +
      '<button type="button" class="hc-btn ghost sm" data-act="shop-clear" style="margin-top:8px">산 것 지우기</button>' +
      '</section>' +

      '<section class="hc-card">' +
      '<details class="hc-fold" style="border:0;margin:0;padding:0"><summary>⚙️ 내 기록 백업 · 기기 옮기기 (전체)</summary>' +
      '<p class="hc-note" id="hcSyncSummary" style="margin:8px 2px 10px"></p>' +
      '<div class="hc-row"><button type="button" class="hc-btn primary" data-act="code-copy">📋 기록 코드 복사</button>' +
      '<button type="button" class="hc-btn" data-act="code-open">📥 기록 코드 붙여넣기</button></div>' +
      '<div id="hcSyncBox" hidden style="margin-top:10px">' +
      '<textarea class="hc-ta" id="hcSyncText" rows="4" spellcheck="false" placeholder="폰에서 복사한 기록 코드를 여기에 붙여넣고 [✅ 이 기기에 적용]을 눌러 주세요"></textarea>' +
      '<div class="hc-row" style="margin-top:8px"><button type="button" class="hc-btn primary" data-act="code-apply">✅ 이 기기에 적용</button>' +
      '<button type="button" class="hc-btn ghost" data-act="code-close">닫기</button></div>' +
      '<p class="hc-note" id="hcSyncInfo">폰에서 [📋 기록 코드 복사] → 카톡·메모로 태블릿에 보내기 → 태블릿에서 위 칸에 붙여넣고 [✅ 이 기기에 적용].</p>' +
      '</div>' +
      '<div class="hc-row" style="margin-top:10px"><button type="button" class="hc-btn" data-act="export">⬇️ 파일로 내보내기</button>' +
      '<button type="button" class="hc-btn" data-act="import">⬆️ 파일에서 불러오기</button>' +
      '<input type="file" id="hcImportFile" accept="application/json,.json" hidden></div>' +
      '<p class="hc-note">BTS 도감·공부방 진도·오답노트·아이템·초안·메모까지 한 번에 옮겨요. 보던 모드·소리 설정은 이 기기 것을 그대로 둡니다.</p>' +
      '</details></section>';
  }

  /* ------------------------------------------------------------ 새로고침 */
  function refreshData(silent, btn) {
    if (btn) btn.textContent = '↻ 받는 중…';
    return Promise.all([
      fetchJSON('hotcho_news.json').then(function (d) { S.news = d; }, function () { return null; }),
      fetchJSON('hotcho_hub.json').then(function (d) { S.hub = d; }, function () { return null; }),
      fetchJSON('hotcho_family.json').then(function (d) { S.family = d; }, function () { return null; })
    ]).then(function () {
        if (btn) btn.textContent = '↻ 새로고침';
      renderNews(); renderCartel(); renderEvents(); renderKids();
      if (!silent) {
        var ok = S.news || S.family;
        toast(ok ? '최신으로 맞췄어요' : '데이터를 못 받았어요 — 잠시 뒤 다시');
      }
    });
  }

  /* ------------------------------------------------------------ 이벤트 */
  function onWorkClick(e) {
    var t = e.target.closest ? e.target.closest('[data-news-tab],[data-add-news],[data-item-write],[data-item-next],[data-item-edit],[data-item-del],[data-art-tab],[data-draft-load],[data-draft-del],[data-act]') : null;
    if (!t) return;

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
    if (act === 'art-clear') {
      if (!window.confirm('지금 쓰고 있는 ' + DRAFT_DEFS[S.artTab].label + ' 내용을 비울까요?')) return;
      S.article[S.artTab] = {}; S.linkedItem = ''; S.linkedUrl = '';
      save(K.article, S.article); renderArticle(); toast('비웠어요');
      return;
    }
  }

  function onWorkInput(e) {
    var t = e.target;
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
    var t = e.target.closest ? e.target.closest('[data-act],[data-memo-del],[data-shop-del]') : null;
    if (t) {
      var act = t.getAttribute('data-act');
      if (act === 'refresh') { refreshData(false, t); return; }
      if (act === 'memo-add') { addMemo(); return; }
      if (act === 'shop-add') { addShop(); return; }
      if (act === 'shop-clear') {
        S.home.fridge.shop = (S.home.fridge.shop || []).filter(function (s) { return !s.done; });
        save(K.home, S.home); renderShop(); toast('산 것은 지웠어요');
        return;
      }
      if (act === 'export') { exportAll(); return; }
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
    if (id === 'hcShopInput') { e.preventDefault(); addShop(); }
    if (id === 'hcItemTitle') { e.preventDefault(); submitItem(); }
  }

  /* ------------------------------------------------------------ 시작 */
  function boot() {
    var work = $('hcWork');
    var home = $('hcHome');
    if (!work || !home) return;
    work.innerHTML = workHTML();
    home.innerHTML = homeHTML();

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

    fillItemForm(null);
    renderArticle();
    renderDrafts();
    renderItems();
    renderMemos();
    renderShop();
    renderSyncSummary();

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

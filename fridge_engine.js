/* 냉파 레시피 매칭 엔진 (AI 호출 없음, 순수 규칙 기반)
   데이터: recipes.json — [이름, 분, 난이도(0쉬움/1보통), "재료(필수는 *표시, 대체는 >구분)", "조리법|구분"] */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FridgeEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 집에 있다고 보고 '부족'으로 세지 않는 기본 양념
  var BASIC = ['소금', '후추', '간장', '국간장', '설탕', '식용유', '올리브유', '참기름', '들기름',
    '고춧가루', '다진마늘', '마늘', '고추장', '된장', '쌈장', '물', '식초', '맛술', '미림'];

  function norm(s) {
    return String(s || '').replace(/\s+/g, '').replace(/\(.*?\)/g, '')
      .replace(/^(다진|국산|국내산|손질|깐|썬|불린|삶은)/, '')
      .replace(/(다진|채|슬라이스|모|단|개|팩|봉|g|kg|ml)$/i, '').toLowerCase();
  }

  function isBasic(name) {
    var n = norm(name);
    for (var i = 0; i < BASIC.length; i++) {
      var b = norm(BASIC[i]);
      if (n === b || n.indexOf(b) >= 0) return true;
    }
    return false;
  }

  // 보유 재료에서 이름 하나 찾기(2글자 이상 부분 일치 허용)
  function findHeld(held, n) {
    if (!n) return null;
    for (var i = 0; i < held.length; i++) {
      var h = held[i].norm;
      if (!h) continue;
      if (h === n) return held[i];
      if (h.length >= 2 && n.length >= 2 && (h.indexOf(n) >= 0 || n.indexOf(h) >= 0)) return held[i];
    }
    return null;
  }

  function parseHeld(text) {
    var out = [], seen = {};
    String(text || '').split(/[,\n;，、·\/]+|\s{2,}/).forEach(function (tok) {
      tok.split(/\s+/).forEach(function (t) {
        t = t.replace(/^[()[\]"'*]+|[()[\]"'*.!]+$/g, '').trim();
        if (!t) return;
        var n = norm(t);
        if (!n || seen[n]) return;
        seen[n] = 1;
        out.push({ name: t, norm: n });
      });
    });
    return out;
  }

  function parseRecipes(rows) {
    return rows.map(function (r, idx) {
      var ing = String(r[3] || '').split(',').filter(Boolean).map(function (part) {
        var subs = null, core = false, i = part.indexOf('>');
        if (i >= 0) { subs = part.slice(i + 1).split('/').filter(Boolean); part = part.slice(0, i); }
        if (part.slice(-1) === '*') { core = true; part = part.slice(0, -1); }
        return {
          name: part, core: core, subs: subs,
          n: norm(part), basic: isBasic(part),
          subsNorm: subs ? subs.map(function (s) { return { raw: s, norm: norm(s) }; }) : null
        };
      });
      return {
        id: idx, name: r[0], minutes: r[1], difficulty: r[2] ? '보통' : '쉬움',
        ingredients: ing, steps: String(r[4] || '').split('|').filter(Boolean)
      };
    });
  }

  /* held: 문자열 또는 parseHeld() 결과, priority: '먼저 먹을 재료', opt:{onlyReady, maxMinutes, query} */
  function recommend(recipes, heldInput, priority, opt) {
    opt = opt || {};
    var held = typeof heldInput === 'string' ? parseHeld(heldInput) : (heldInput || []);
    var pri = parseHeld(priority || '');
    var out = [];

    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i], have = [], need = [], viaSub = [], miss = 0, coreReady = true, prio = 0;

      for (var j = 0; j < r.ingredients.length; j++) {
        var g = r.ingredients[j];
        if (findHeld(held, g.n)) {
          have.push(g.name);
          if (pri.length && findHeld(pri, g.n)) prio++;
          continue;
        }
        var sub = g.subsNorm && g.subsNorm.filter(function (s) { return findHeld(held, s.norm); })[0];
        if (sub) {
          have.push(g.name); viaSub.push(g.name + '←' + sub.raw);
          if (pri.length && findHeld(pri, g.n)) prio++;
          continue;
        }
        if (g.basic) continue;           // 기본 양념은 부족으로 세지 않음
        need.push(g.name); miss++;
        if (g.core) coreReady = false;
      }

      if (have.length === 0 && !opt.allowEmpty) continue;
      if (opt.onlyReady && miss > 0) continue;
      if (opt.maxMinutes && r.minutes > opt.maxMinutes) continue;
      if (opt.query) {
        var q = String(opt.query).trim();
        if (q && r.name.indexOf(q) < 0 && !r.ingredients.some(function (g) { return g.name.indexOf(q) >= 0; })) continue;
        if (q && opt.allowEmpty) { /* 이름으로만 찾을 때: 이름이 걸린 요리를 앞으로 */ }
      } else if (opt.allowEmpty && held.length === 0) {
        continue;   // 재료도 검색어도 없으면 목록을 비워 둔다
      }
      out.push({ recipe: r, have: have, need: need, viaSub: viaSub, coreReady: coreReady, priorityUsed: prio, missingCount: miss });
    }

    out.sort(function (a, b) {
      return (Number(b.coreReady) - Number(a.coreReady)) ||
        (b.priorityUsed - a.priorityUsed) ||
        (a.missingCount - b.missingCount) ||
        (b.have.length - a.have.length) ||
        (a.recipe.minutes - b.recipe.minutes) ||
        a.recipe.name.localeCompare(b.recipe.name, 'ko');
    });
    return out;
  }

  return { parseRecipes: parseRecipes, parseHeld: parseHeld, recommend: recommend, isBasic: isBasic, norm: norm, BASIC: BASIC };
}));

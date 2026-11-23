#!/usr/bin/env python3
"""index.html 데이터 배열 문법·무결성 검사 (node 없이 quickjs + esprima 사용).

- WORDS / GRAMMAR / READING / LISTEN / SENSE 배열을 실제 JS 엔진으로 평가
- 필수 키 누락, 중복 단어, 정답 인덱스 범위, 보기 개수 확인
"""
import json
import re
import sys
import esprima
import quickjs

HTML = sys.argv[1] if len(sys.argv) > 1 else "index.html"
src = open(HTML, encoding="utf-8").read()

NAMES = ["WORDS", "GRAMMAR", "READING", "LISTEN", "SENSE"]


def extract(name):
    m = re.search(r"var %s = \[" % name, src)
    if not m:
        raise SystemExit(f"{name}: 배열을 찾을 수 없음")
    i = m.end() - 1
    depth = 0
    instr = None
    while i < len(src):
        ch = src[i]
        if instr:
            if ch == "\\":
                i += 2
                continue
            if ch == instr:
                instr = None
        elif ch in "\"'`":
            instr = ch
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return src[m.end() - 1: i + 1]
        i += 1
    raise SystemExit(f"{name}: 닫는 괄호를 찾을 수 없음")


blocks = {n: extract(n) for n in NAMES}

ctx = quickjs.Context()
errors = []

for name, block in blocks.items():
    try:
        esprima.parseScript("var %s = %s;" % (name, block))
    except Exception as e:  # noqa: BLE001
        errors.append(f"[{name}] JS 문법 오류: {e}")
        continue
    try:
        ctx.eval("var %s = %s;" % (name, block))
        length = ctx.eval("%s.length" % name)
    except Exception as e:  # noqa: BLE001
        errors.append(f"[{name}] 평가 오류: {e}")
        continue
    print(f"{name}: {length}개")

# 전문 스크립트 전체 문법 검사(가능한 경우)
scripts = re.findall(r"<script(?![^>]*src=)[^>]*>([\s\S]*?)</script>", src)
for idx, body in enumerate(scripts):
    try:
        esprima.parseScript(body)
    except Exception as e:  # noqa: BLE001
        errors.append(f"<script>#{idx} 문법 오류: {e}")
print(f"<script> 블록: {len(scripts)}개")

# --- WORDS 무결성 ---
words = json.loads(ctx.eval("JSON.stringify(WORDS)"))
grammar = json.loads(ctx.eval("JSON.stringify(GRAMMAR)"))
sense = json.loads(ctx.eval("JSON.stringify(SENSE)"))
seen_day = {}
for i, w in enumerate(words):
    for key in ("d", "w", "p", "pos", "m", "s", "c"):
        if key not in w or w[key] in (None, ""):
            errors.append(f"WORDS[{i}] {w.get('w','?')}: '{key}' 누락")
    seen_day.setdefault(w.get("d"), set())
    if w.get("w") in seen_day[w.get("d")]:
        errors.append(f"WORDS[{i}] {w.get('w')}: Day {w.get('d')} 안에 중복")
    seen_day[w.get("d")].add(w.get("w"))

d10 = [w["w"] for w in words if w.get("d") == 10]
for target in ["promotion", "salary", "supervisor", "colleague",
               "certificate", "policy", "conference", "efficiently"]:
    if target not in d10:
        errors.append(f"Day 10에 '{target}' 없음")
print("Day 10:", len(d10), "개")

# --- GRAMMAR 무결성 ---
for i, g in enumerate(grammar):
    opts = list(g["opts"])
    if len(opts) != 4:
        errors.append(f"GRAMMAR[{i}] 보기 {len(opts)}개: {g['q'][:40]}")
    if not (0 <= g["a"] < len(opts)):
        errors.append(f"GRAMMAR[{i}] 정답 인덱스 범위 밖: {g['a']}")
    for key in ("tag", "q", "tip"):
        if key not in g or not g[key]:
            errors.append(f"GRAMMAR[{i}] '{key}' 누락")

# --- SENSE 무결성 ---
sense_terms = {}
for i, s in enumerate(sense):
    opts = list(s["opts"])
    if not (0 <= s["a"] < len(opts)):
        errors.append(f"SENSE[{i}] 정답 인덱스 범위 밖: {s.get('term')}")
    for key in ("q", "opts", "a", "tip"):
        if key not in s:
            errors.append(f"SENSE[{i}] '{key}' 누락")
    sense_terms.setdefault((s.get("st"), s.get("term")), 0)
    sense_terms[(s.get("st"), s.get("term"))] += 1
for (st, term), n in sense_terms.items():
    if n > 1:
        errors.append(f"SENSE 중복: {st}단계 '{term}' {n}회")

sunk = [s for s in sense if "매몰" in (s.get("term") or "")]
print("매몰비용 문항:", len(sunk), "개")

# --- 라디오 대본·요약 무결성 (radio_transcripts.json) ---
import os

tr_path = os.path.join(os.path.dirname(os.path.abspath(HTML)), "radio_transcripts.json")
if os.path.exists(tr_path):
    tr = json.load(open(tr_path, encoding="utf-8"))
    meta = tr.get("_meta") or {}
    keys = [k for k in tr if k != "_meta"]
    print("라디오 대본:", len(keys), "회차")
    for k in keys:
        segs = tr[k]
        m = meta.get(k) or {}
        title = (m.get("title") or "?")[:40]
        if not segs:
            errors.append(f"라디오 '{k}': 문장 0개")
        if not (m.get("summary") or "").strip():
            errors.append(f"라디오 '{k}' ({title}): summary(주제·흐름 요약) 없음")
        prev_end = -1.0
        v_covered = 0
        v_total = 0
        for i, s in enumerate(segs):
            for key in ("start", "end", "en", "ko"):
                if key not in s or s[key] in (None, ""):
                    errors.append(f"라디오 '{k}'[{i}]: '{key}' 누락")
                    break
            if s.get("start", 0) > s.get("end", 0) + 0.01:
                errors.append(f"라디오 '{k}'[{i}]: start>end ({s['start']}>{s['end']})")
            if s.get("start", 0) < prev_end - 0.05:
                errors.append(f"라디오 '{k}'[{i}]: 시간 역순(start {s['start']} < 직전 end {prev_end})")
            prev_end = s.get("end", prev_end)
            # 💡 문장별 핵심 단어·숙어·표현 (v21) — 있으면 형식·표현 존재 확인
            v = s.get("v")
            if v:
                if not isinstance(v, list):
                    errors.append(f"라디오 '{k}'[{i}]: v 가 배열이 아님")
                    continue
                if len(v) > 4:
                    print(f"  ! 라디오 '{k}'[{i}]: 표현 {len(v)}개(권장 4개 이하)")
                v_covered += 1
                for it in v:
                    if not isinstance(it, dict) or not str(it.get("e") or "").strip() or not str(it.get("m") or "").strip():
                        errors.append(f"라디오 '{k}'[{i}]: 표현 항목에 e/m 누락 {it!r}")
                        continue
                    v_total += 1
                    if str(it["e"]).lower() not in (s.get("en") or "").lower():
                        print(f"  ! 라디오 '{k}'[{i}]: 문장에 없는 표현 '{it['e']}'")
        if segs:
            print(f"    · 문장별 표현: {v_covered}/{len(segs)}문장 · {v_total}개")
        ad = m.get("audioDur")
        # ⚡ 광고 삽입 지도(adBreaks) — CNN DAI 음원의 '광고 길이 차이' 자동 보정용
        brk = m.get("adBreaks")
        if brk is not None:
            if not isinstance(brk, list):
                errors.append(f"라디오 '{k}' ({title}): adBreaks 가 배열이 아님")
                brk = None
            elif brk:
                if not ad:
                    errors.append(f"라디오 '{k}' ({title}): adBreaks 가 있는데 audioDur 가 없음")
                prev_at = -1.0
                for j, b in enumerate(brk):
                    if not isinstance(b, dict) or "at" not in b or "add" not in b:
                        errors.append(f"라디오 '{k}' adBreaks[{j}]: at/add 누락 {b!r}")
                        continue
                    try:
                        at, add = float(b["at"]), float(b["add"])
                    except (TypeError, ValueError):
                        errors.append(f"라디오 '{k}' adBreaks[{j}]: 숫자가 아님 {b!r}")
                        continue
                    if not (-2.0 <= add <= 180.0):
                        errors.append(f"라디오 '{k}' adBreaks[{j}]: add {add}초 범위 밖")
                    if at < prev_at - 0.01:
                        errors.append(f"라디오 '{k}' adBreaks[{j}]: at 이 앞 지점보다 이른 역순")
                    if ad and at > ad + 1.0:
                        errors.append(f"라디오 '{k}' adBreaks[{j}]: at {at} > 오디오 길이 {ad}")
                    prev_at = at
                ref = m.get("adRef") or {}
                if brk and not ref.get("dur"):
                    print(f"  ! 라디오 '{k}' ({title}): adBreaks 는 있는데 adRef(측정 파일 길이)가 없음")
                print("    · 광고 지점 " + " · ".join(
                    "%.1f초 %+.1f초%s" % (float(b["at"]), float(b["add"]),
                                         ("( 대본 틈 %.1f초)" % float(b["gap"])) if b.get("gap") else "")
                    for b in brk if isinstance(b, dict) and "at" in b and "add" in b))
        # 광고가 섞여 들어오면(DAI) 대본 시각이 오디오와 어긋남 → 마지막 문장이 오디오보다 뒤면 오류
        if ad and segs:
            if segs[-1].get("end", 0) > ad + 1.0:
                errors.append(f"라디오 '{k}' ({title}): 마지막 문장 end {segs[-1]['end']} > 오디오 길이 {ad}")
            if segs[0].get("start", 0) > ad:
                errors.append(f"라디오 '{k}' ({title}): 첫 문장 start {segs[0]['start']} > 오디오 길이 {ad}")
            print(f"  · {title}: 문장 {len(segs)}개 · 첫 {segs[0]['start']}초 · 마지막 {segs[-1]['end']}초 / 오디오 {ad}초"
                  + (" · 정합 " + (m.get("aligned") or "-")))
        else:
            print(f"  · {title}: 문장 {len(segs)}개 · audioDur 미기록(align_transcripts.py 로 점검 권장)")

if errors:
    print("\n❌ 문제 발견")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("\n✅ 데이터 검사 통과")

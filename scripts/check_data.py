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

if errors:
    print("\n❌ 문제 발견")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("\n✅ 데이터 검사 통과")

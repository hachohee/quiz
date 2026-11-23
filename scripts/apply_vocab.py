#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""🎧 영어라디오 문장별 핵심 단어·숙어·표현 붙이기

사람이 쓴 TSV(문장 번호 · 표현 · 뜻)를 `radio_transcripts.json` 의 각 문장에
`v: [{"e": 표현, "m": 뜻}, ...]` 로 붙입니다. 이미 있는 표현은 덮어씁니다.

TSV 형식 (한 줄에 표현 하나, 같은 번호를 여러 줄 써도 됨):

    14<TAB>clock in<TAB>출근 기록을 하다
    14<TAB>clock out<TAB>퇴근 기록을 하다
    # 주석 줄은 무시

    python3 scripts/apply_vocab.py <episode-key> <vocab.tsv> [--check-only] [--append]

구분자는 탭 또는 ' | ' 둘 다 됩니다(한 파일 안에서 섞여도 됨).
기본은 그 회차의 표현을 TSV 내용으로 **통째로 교체**합니다(TSV가 그 회차의 정답).
--append 를 주면 TSV에 없는 문장의 기존 표현은 그대로 둡니다.

표현은 그 문장 안에 실제로 나오는 표기 그대로 적어야 합니다(검사에서 확인).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TR = os.path.join(os.path.dirname(HERE), "radio_transcripts.json")
MAX_ITEMS = 4
MAX_MEANING = 60


def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def load_tsv(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            parts = line.split("\t") if "\t" in line else line.split(" | ")
            if len(parts) < 3:
                raise SystemExit("%s:%d 형식 오류('번호 | 표현 | 뜻' 3칸 아님): %r" % (path, ln, line))
            parts = [parts[0], " | ".join(parts[1:-1]), parts[-1]]
            idx, expr, meaning = parts[0].strip(), parts[1].strip(), parts[2].strip()
            if not idx.isdigit():
                raise SystemExit("%s:%d 문장 번호 오류: %r" % (path, ln, idx))
            if not expr or not meaning:
                raise SystemExit("%s:%d 표현/뜻이 비었음: %r" % (path, ln, line))
            if len(meaning) > MAX_MEANING:
                raise SystemExit("%s:%d 뜻이 너무 김(%d자): %s" % (path, ln, len(meaning), meaning))
            out.setdefault(int(idx), []).append({"e": expr, "m": meaning})
    return out


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    key, tsv = sys.argv[1], sys.argv[2]
    check_only = "--check-only" in sys.argv[3:]
    append = "--append" in sys.argv[3:]

    doc = json.load(open(TR, encoding="utf-8"))
    segs = doc.get(key)
    if not segs:
        raise SystemExit("회차를 찾을 수 없음: %s" % key)
    vocab = load_tsv(tsv)

    bad_idx = [i for i in vocab if not (0 <= i < len(segs))]
    if bad_idx:
        raise SystemExit("문장 번호 범위 밖: %s (문장 %d개)" % (bad_idx, len(segs)))

    if not append:
        for s in segs:
            s.pop("v", None)

    warnings = []
    total = 0
    for i, items in sorted(vocab.items()):
        en = norm(segs[i]["en"])
        seen = set()
        cleaned = []
        for it in items:
            e, m = it["e"], it["m"]
            if norm(e) in seen:
                warnings.append("[%d] 중복 표현 %s" % (i, e))
                continue
            seen.add(norm(e))
            if norm(e) not in en:
                warnings.append("[%d] 문장에 없는 표현 %r: %s" % (i, e, segs[i]["en"][:70]))
            cleaned.append({"e": e, "m": m})
        if len(cleaned) > MAX_ITEMS:
            warnings.append("[%d] 표현 %d개(권장 %d개 이하)" % (i, len(cleaned), MAX_ITEMS))
        if cleaned:
            segs[i]["v"] = cleaned
            total += len(cleaned)

    covered = sum(1 for s in segs if s.get("v"))
    print("· %s: 문장 %d개 중 %d개에 표현 %d개" % (key, len(segs), covered, total))
    for w in warnings:
        print("  ! " + w)
    if check_only:
        return 0

    tmp = TR + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, TR)
    print("✅ 저장: %s (%.1f KB)" % (TR, os.path.getsize(TR) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())

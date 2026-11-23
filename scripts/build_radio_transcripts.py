#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 📝 라디오 대본(영어 딕테이션 + 한국어 해석) 조립기

1) `scripts/transcribe_radio.py`로 회차 MP3에서 세그먼트(start/end/en)를 뽑고
2) 문장 단위로 병합한 뒤(`merge_sentences`)
3) 사람이 만든 해석 파일(`ko`)을 붙여 `radio_transcripts.json`에 넣습니다.

해석 파일 형식(에피소드 1개분):
{
  "summary": "제목 아래에 보여 줄 주제·흐름 요약(한국어 2~3줄)",
  "skip": [0, 1, 2],                  # 광고·프로모션 등 대본에서 뺄 문장 번호
  "fix":  {"14": "고친 문장"},    # ASR 오류·광고 꼬리 정리
  "ko":   {"14": "한국어 해석", ...},  # 남긴 모든 문장에 하나씩
  "v":    {"14": [["clock in", "출근 기록을 하다"], ["clock out", "퇴근 기록을 하다"]]}
}

`v`(문장별 핵심 단어·숙어·표현)는 선택입니다. 넣으면 각 문장에
`v: [{"e": "clock in", "m": "출근 기록을 하다"}, ...]` 로 저장되고 앱이 대본 카드 아래 칩으로 보여 줍니다.
따로 만든 TSV를 `scripts/apply_vocab.py <episode-key> <vocab.tsv>` 로 붙일 수도 있고,
같은 회차를 다시 조립해도 **이전 JSON에 붙어 있던 표현은 영어 문장이 같으면 그대로 살립니다.**

`summary`는 `--summary "..."`로 넘겨도 됩니다(둘 다 있으면 `--summary`가 이김).
요약은 회차 실제 내용만 2~3줄로, 줄바꿈은 `\n`으로 넣습니다. 앱은
`radio_transcripts.json`의 `_meta[key].summary`를 읽어 플레이어 제목 아래와
대본 시트 상단에 표시합니다.

    python3 scripts/build_radio_transcripts.py --prog cnn5things --asr raw.json \
        --ko ko_cnn5things.json --key "cnn5things::<guid>" --title "..." --date "11/21(토)" \
        --summary "한 줄 요약"
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "radio_transcripts.json")

END_RE = re.compile(r"[.?!][\"')\]]*$")
TAIL_FUNC = set("""a an the to of in on at for with and or but that which who whom whose is are was were be been being
as by from into than then so if while when because although though also just very not no nor this these those
his her their its our your my me him them us you we i he she it they there here what how why where will would
can could should may might must have has had do does did such more most much many few own same other another""".split())


def dedupe(text):
    """인접 중복 어구(4~12단어) 정리: 'A B A B' -> 'A B'."""
    w = text.split()
    n = len(w)
    for size in range(12, 3, -1):
        for i in range(0, n - 2 * size + 1):
            if w[i:i + size] == w[i + size:i + 2 * size]:
                return dedupe(" ".join(w[:i + size] + w[i + 2 * size:]))
    return text


def normalize_vocab(v):
    """해석 파일의 v 값 -> [{'e': 표현, 'm': 뜻}, ...]
    허용: [{'e':..,'m':..}], [["clock in","출근"], ...], "clock in|출근; clock out|퇴근"
    """
    if isinstance(v, str):
        out = []
        for chunk in v.split(";"):
            if not chunk.strip():
                continue
            parts = chunk.split("|", 1)
            if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                out.append({"e": parts[0].strip(), "m": parts[1].strip()})
        return out
    out = []
    for it in (v or []):
        if isinstance(it, dict):
            e = str(it.get("e") or it.get("expr") or "").strip()
            m = str(it.get("m") or it.get("meaning") or "").strip()
        elif isinstance(it, (list, tuple)) and len(it) >= 2:
            e, m = str(it[0]).strip(), str(it[1]).strip()
        else:
            continue
        if e and m:
            out.append({"e": e, "m": m})
    return out


def merge_sentences(rows, max_words=34, max_sec=22.0, min_words=5):
    """ASR 세그먼트 -> 문장 단위(문장부호·길이 기준)."""
    out = []
    buf, st, en = [], None, None
    for r in rows:
        txt = (r.get("en") or "").strip()
        if not txt:
            continue
        if st is None:
            st = r["start"]
        buf.append(txt)
        en = r["end"]
        joined = " ".join(buf)
        wc = len(joined.split())
        last = joined.split()[-1].lower().strip(".,?!\"'()")
        terminal = END_RE.search(joined) is not None and last not in TAIL_FUNC
        if (terminal and wc >= min_words) or wc >= max_words or (en - st) >= max_sec:
            out.append({"start": round(st, 2), "end": round(en, 2), "en": joined})
            buf, st, en = [], None, None
    if buf:
        out.append({"start": round(st, 2), "end": round(en, 2), "en": " ".join(buf)})
    for s in out:
        s["en"] = dedupe(s["en"])
    fixed = []
    for s in out:
        if fixed and len(s["en"].split()) <= 3 and (s["start"] - fixed[-1]["end"]) < 1.0:
            fixed[-1]["en"] = fixed[-1]["en"].rstrip() + " " + s["en"]
            fixed[-1]["end"] = s["end"]
        else:
            fixed.append(s)
    return fixed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prog", required=True)
    ap.add_argument("--asr", required=True, help="세그먼트 JSON(또는 이미 병합된 문장 JSON)")
    ap.add_argument("--ko", required=True, help="해석 파일(skip/fix/ko)")
    ap.add_argument("--key", required=True, help="에피소드 키 (예: cnn5things::<guid> — 앱의 radioEpKey 와 같은 prog::guid 형식)")
    ap.add_argument("--title", default="")
    ap.add_argument("--date", default="")
    ap.add_argument("--summary", default="", help="제목 아래 표시할 주제·흐름 요약(한국어 2~3줄, 줄바꿈은 \\n)")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()

    rows = json.load(open(a.asr, encoding="utf-8"))
    if isinstance(rows, dict):
        rows = rows.get("segments") or []
    sents = merge_sentences(rows) if rows and "end" in rows[0] else rows
    spec = json.load(open(a.ko, encoding="utf-8"))
    raw_summary = (a.summary or spec.get("summary") or "").replace("\\n", "\n")
    summary = "\n".join(" ".join(line.split()) for line in raw_summary.split("\n") if line.strip()).strip()
    skip = set(int(x) for x in spec.get("skip", []))
    fix = {int(k): v for k, v in (spec.get("fix") or {}).items()}
    ko = {int(k): v for k, v in (spec.get("ko") or {}).items()}
    vocab = {int(k): normalize_vocab(v) for k, v in (spec.get("v") or {}).items()}

    # 기존 JSON 은 문장별 표현(v)을 살리려고 먼저 읽어 둡니다
    doc = {}
    if os.path.exists(a.out):
        try:
            doc = json.load(open(a.out, encoding="utf-8"))
        except Exception:                              # noqa: BLE001
            doc = {}

    segs, missing = [], []
    old = doc.get(a.key) or []
    old_vocab = {}
    for s in old:
        if s.get("v"):
            old_vocab[re.sub(r"\s+", " ", (s.get("en") or "")).strip().lower()] = s["v"]
    for i, s in enumerate(sents):
        if i in skip:
            continue
        en = fix.get(i, s["en"]).strip()
        if i in ko and ko[i].strip():
            seg = {"start": s["start"], "end": s["end"], "en": en, "ko": ko[i].strip()}
            v = vocab.get(i) or old_vocab.get(re.sub(r"\s+", " ", en).strip().lower())
            if v:
                seg["v"] = v
            segs.append(seg)
        else:
            missing.append(i)
    if missing:
        print("!! 해석이 없는 문장:", missing[:40], "총 %d개" % len(missing))
        return 2

    if not summary:
        print("!! 요약(summary)이 비었습니다 — 플레이어 제목 아래 '주제와 흐름'이 안 보입니다")
        print("   → --summary \"...\" 또는 해석 파일의 \"summary\" 키로 2~3줄 요약을 넣어 주세요")

    doc[a.key] = segs
    meta = doc.setdefault("_meta", {})
    prev = meta.get(a.key) or {}
    entry = dict(prev)                     # audioDur·aligned·adBreaks·adRef 등은 그대로 살림
    entry.update({
        "program": a.prog,
        "title": a.title,
        "date": a.date,
        "summary": summary,
        "segments": len(segs),
        "built": datetime.now(KST).isoformat(timespec="seconds"),
    })
    meta[a.key] = entry
    tmp = a.out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, a.out)
    print("✅ %s · %d문장 · 요약 %d자 → %s (%.1f KB)" % (a.key, len(segs), len(summary), a.out,
                                                   os.path.getsize(a.out) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())

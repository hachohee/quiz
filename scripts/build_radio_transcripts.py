#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 📝 라디오 대본(영어 딕테이션 + 한국어 해석) 조립기

1) `scripts/transcribe_radio.py`로 회차 MP3에서 세그먼트(start/end/en)를 뽑고
2) 문장 단위로 병합한 뒤(`merge_sentences`)
3) 사람이 만든 해석 파일(`ko`)을 붙여 `radio_transcripts.json`에 넣습니다.

해석 파일 형식(에피소드 1개분):
{
  "skip": [0, 1, 2],                  # 광고·프로모션 등 대본에서 뺄 문장 번호
  "fix":  {"14": "고친 영어 문장"},    # ASR 오류·광고 꼬리 정리
  "ko":   {"14": "한국어 해석", ...}   # 남긴 모든 문장에 하나씩
}

    python3 scripts/build_radio_transcripts.py --prog cnn5things --asr raw.json \
        --ko ko_cnn5things.json --key "cnn5things::<guid>" --title "..." --date "11/21(토)"
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
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()

    rows = json.load(open(a.asr, encoding="utf-8"))
    if isinstance(rows, dict):
        rows = rows.get("segments") or []
    sents = merge_sentences(rows) if rows and "end" in rows[0] else rows
    spec = json.load(open(a.ko, encoding="utf-8"))
    skip = set(int(x) for x in spec.get("skip", []))
    fix = {int(k): v for k, v in (spec.get("fix") or {}).items()}
    ko = {int(k): v for k, v in (spec.get("ko") or {}).items()}

    segs, missing = [], []
    for i, s in enumerate(sents):
        if i in skip:
            continue
        en = fix.get(i, s["en"]).strip()
        if i in ko and ko[i].strip():
            segs.append({"start": s["start"], "end": s["end"], "en": en, "ko": ko[i].strip()})
        else:
            missing.append(i)
    if missing:
        print("!! 해석이 없는 문장:", missing[:40], "총 %d개" % len(missing))
        return 2

    doc = {}
    if os.path.exists(a.out):
        try:
            doc = json.load(open(a.out, encoding="utf-8"))
        except Exception:                                  # noqa: BLE001
            doc = {}
    doc[a.key] = segs
    meta = doc.setdefault("_meta", {})
    meta[a.key] = {
        "program": a.prog,
        "title": a.title,
        "date": a.date,
        "segments": len(segs),
        "built": datetime.now(KST).isoformat(timespec="seconds"),
    }
    tmp = a.out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, a.out)
    print("✅ %s · %d문장 → %s (%.1f KB)" % (a.key, len(segs), a.out,
                                            os.path.getsize(a.out) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())

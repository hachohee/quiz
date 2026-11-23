#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""똑똑핫초 · 📢 CNN 회차 '광고 삽입 지도(adBreaks)' 측정기

왜 필요한가 (2026-11-23 실측)
  CNN 5 Things / One Thing 은 megaphone DAI 로 내려오는데, 광고가
    · 회차 중간 여러 곳(예: 49초·581초·614초)에
    · 세션(요청)마다 다른 길이로(0초·15초·30초·45초 …)
  끼어듭니다. 그래서 폰에서 재생되는 파일의 길이와 대본을 만든 파일의 길이가
  달라 자막이 어긋납니다. BBC 처럼 광고 없는 고정 원본 주소가 없어서,
  '대본 시각 몇 초 뒤에 광고가 몇 초 끼었는지'를 재서 `_meta[key].adBreaks`
  로 저장해 두고, 앱이 실제 오디오 길이 차이와 맞춰 자막을 자동 보정합니다.

하는 일
  1) 지금 내려받은 MP3 를 whisper(base.en)로 단어 타임스탬프까지 뽑고
     (`<audio>.words.json` 캐시 — align_transcripts.py 와 같은 형식)
  2) 대본 영어 문장을 그 단어 흐름에 전역 정렬해 문장마다 실제 시각을 구하고
  3) 문장별 (실제 - 대본) 오차를 계단(step)으로 묶어 광고 삽입 지점·길이를 냅니다
  4) --write 면 radio_transcripts.json 의 `_meta[key]` 에 기록:
        "adBreaks": [{"at": 49.15, "add": 30.1}],   ← at 이후 문장은 +30.1초
        "adRef": {"dur": 1055.56, "sum": 30.1, "scanned": "..."}

    python3 scripts/scan_ads.py --audio ep.mp3 --key "cnn5things::<guid>" [--write]
"""
import argparse
import difflib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

import av
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TR = os.path.join(os.path.dirname(HERE), "radio_transcripts.json")
KST = timezone(timedelta(hours=9))
SR = 16000
STEP_MIN = 5.0      # 이만큼(초) 이상 오차가 계단처럼 바뀌면 광고 삽입 지점으로 봄
NOISE = 3.0         # 계단 판정 전에 문장별 오차에서 걷어낼 잡음 폭


def norm(w):
    return re.sub(r"[^a-z0-9']", "", (w or "").lower())


def decode(path, sr=SR):
    c = av.open(path)
    s = c.streams.audio[0]
    res = av.AudioResampler(format="flt", layout="mono", rate=sr)
    buf = []
    for fr in c.decode(s):
        for r in res.resample(fr):
            buf.append(r.to_ndarray().reshape(-1))
    for r in res.resample(None):
        buf.append(r.to_ndarray().reshape(-1))
    c.close()
    return np.clip(np.concatenate(buf).astype(np.float32), -1.0, 1.0)


def asr_words(audio, model, sr=SR, chunk=180.0):
    dur = len(audio) / float(sr)
    out, i = [], 0
    while i * chunk < dur:
        st0 = i * chunk
        en0 = min(dur, st0 + chunk + 3.0)
        segs, _ = model.transcribe(
            audio[int(st0 * sr):int(en0 * sr)], language="en", beam_size=5, vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 100},
            condition_on_previous_text=False, word_timestamps=True)
        for s in segs:
            for w in (s.words or []):
                t = norm(w.word)
                if not t:
                    continue
                ws = st0 + float(w.start)
                if i > 0 and ws < st0 + 0.05:
                    continue
                out.append((ws, st0 + float(w.end), t))
        i += 1
    return out


def align_offsets(segs, words):
    """문장별 (대본 start, 실제 start) — 전역 단조 정렬(align_transcripts.align 과 같은 방식)."""
    flat, owner = [], []
    for i, s in enumerate(segs):
        for x in (s.get("en") or "").split():
            t = norm(x)
            if t:
                flat.append(t)
                owner.append(i)
    asr = [w[2] for w in words]
    sm = difflib.SequenceMatcher(None, flat, asr, autojunk=False)
    r2a = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            r2a[blk.a + k] = blk.b + k
    spans = {}
    for ri, si in enumerate(owner):
        if ri in r2a:
            lo, hi = spans.get(si, (None, None))
            ai = r2a[ri]
            spans[si] = (ai if lo is None else min(lo, ai), ai if hi is None else max(hi, ai))
    rows = []
    for i, s in enumerate(segs):
        sp = spans.get(i)
        rows.append((i, s["start"], None if not sp else words[sp[0]][0]))
    return rows


def detect(rows, segs):
    """align_offsets() 결과 → 계단. 반환: (adBreaks, levels)"""
    return detect_from([(i, st, a0 - st) for (i, st, a0) in rows if a0 is not None], segs)


def detect_from(pairs, segs):
    """문장별 (번호, 대본 시각, 오차) → 계단. 반환: (adBreaks, levels)

    `pairs` 는 대본 시각 순서대로. 오차는 '이 문장이 대본보다 몇 초 뒤에 들리는가'.
    계단이 STEP_MIN 이상 바뀌면 그 자리에 광고가 끼었다고 봅니다.
    """
    if not pairs:
        return [], []
    # 잡음 걷어내기: 문장 오차가 이웃 대비 크게 튀면(ASR 오정합) 계단 판정에서 제외
    levels = []          # [{off, i0, i1, n}]
    for (i, st, off) in pairs:
        if levels and abs(off - levels[-1]["off"]) <= NOISE:
            lv = levels[-1]
            lv["off"] = (lv["off"] * lv["n"] + off) / (lv["n"] + 1.0)
            lv["n"] += 1
            lv["i1"] = i
        else:
            levels.append({"off": off, "i0": i, "i1": i, "n": 1})
    # 문장 한두 개만 튀는 구간은 ASR 오정합으로 보고 앞 계단에 흡수
    merged = []
    for lv in levels:
        if lv["n"] < 2 and merged:
            merged[-1]["i1"] = lv["i1"]
            continue
        merged.append(lv)
    for j in range(1, len(merged)):                     # 앞 계단과 5초 미만 차이는 같은 계단으로
        if abs(merged[j]["off"] - merged[j - 1]["off"]) < STEP_MIN:
            merged[j]["off"] = merged[j - 1]["off"]
    # 누적 오차 → 증분(add)
    breaks = []
    prev = merged[0]["off"]
    for lv in merged[1:]:
        d = lv["off"] - prev
        if abs(d) >= STEP_MIN:
            i = lv["i0"]
            at = segs[i]["start"] if i == 0 else segs[i - 1]["end"]
            breaks.append({"at": round(at, 2), "add": round(d, 2)})
        prev = lv["off"]
    return breaks, merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--model", default="base.en")
    ap.add_argument("--out", default=TR)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()

    doc = json.load(open(a.out, encoding="utf-8"))
    segs = doc.get(a.key)
    if not segs:
        print("!! 대본이 없습니다:", a.key)
        return 2
    audio = decode(a.audio)
    dur = len(audio) / float(SR)
    print("오디오 %.2f초 · 대본 %d문장 · audioDur %s" % (dur, len(segs), doc["_meta"][a.key].get("audioDur")))

    from faster_whisper import WhisperModel
    cache = a.audio + ".words.json"
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(a.audio):
        words = [tuple(x) for x in json.load(open(cache, encoding="utf-8"))]
        print("단어 %d개 재사용" % len(words))
    else:
        model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=4)
        words = asr_words(audio, model)
        json.dump(words, open(cache, "w", encoding="utf-8"))
        print("단어 %d개 인식" % len(words))

    rows = align_offsets(segs, words)
    breaks, levels = detect(rows, segs)
    print("\n오차 계단(문장 오차의 평평한 구간):")
    for lv in levels:
        print("  오차 %+7.2f초 · 문장 %d~%d (%d문장)" % (lv["off"], lv["i0"], lv["i1"], lv["n"]))
    print("\n광고 삽입 지점(adBreaks):")
    if not breaks:
        print("  없음 — 대본 시각이 이 파일과 같습니다")
    for b in breaks:
        print("  대본 %7.2f초 이후 문장 +%.2f초" % (b["at"], b["add"]))

    if not a.write:
        print("\n(미리보기) --write 를 붙이면 radio_transcripts.json 의 _meta 에 기록합니다.")
        return 0
    meta = doc.setdefault("_meta", {}).setdefault(a.key, {})
    meta["adBreaks"] = breaks
    meta["adRef"] = {"dur": round(dur, 2), "sum": round(sum(b["add"] for b in breaks), 2),
                     "scanned": datetime.now(KST).isoformat(timespec="seconds")}
    tmp = a.out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, a.out)
    print("\n✅ %s · adBreaks %d곳 → %s" % (a.key, len(breaks), a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

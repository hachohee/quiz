#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 🎯 라디오 대본 타임스탬프 재정렬(정합) 도구

왜 필요한가:
  팟캐스트 MP3 는 받을 때마다 광고(프리롤·미드롤)가 끼어드는 DAI(Dynamic Ad
  Insertion) 방식으로 내려옵니다. 그래서 대본을 만든 파일과 폰에서 재생되는
  파일의 '광고 길이'가 다르면, 저장된 초 단위 타임스탬프가 통째로 어긋나
  자막이 소리를 못 따라갑니다. (실측: BBC Global News 프리롤이 33초 늘어
  대본 전체가 33초 앞서갔고, CNN 5 Things 는 미드롤이 16초 늘어 후반부만
  어긋났습니다.)

하는 일:
  1) 지금 내려받은 MP3 를 whisper(base.en)로 단어 타임스탬프까지 뽑고
  2) 이미 사람이 다듬은 대본 문장(영어)을 그 단어 흐름에 맞춰 찾아
  3) 각 문장의 start/end 를 '지금 파일' 기준으로 고칩니다.

    python3 scripts/align_transcripts.py --prog cnn5things --audio ep.mp3 \
        --key "cnn5things::<guid>" [--write]

  --write 없이 돌리면 바뀔 값만 보고합니다(미리보기).
  파일을 고칠 때는 _meta[key].audioDur(실제 오디오 길이)·aligned(정렬 시각)도
  함께 기록해, 나중에 폰에서 받은 파일과 어긋났는지 점검할 근거를 남깁니다.
"""
import argparse
import difflib
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone

import av
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "radio_transcripts.json")
KST = timezone(timedelta(hours=9))
SR = 16000


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
    """(start, end, norm_word) 목록 — 파일 전체 기준 절대 시각.

    메모리가 작은 환경(2GB)에서도 돌도록 180초씩 잘라 처리합니다.
    """
    dur = len(audio) / float(sr)
    out = []
    i = 0
    while i * chunk < dur:
        st0 = i * chunk
        en0 = min(dur, st0 + chunk + 3.0)
        segs, _info = model.transcribe(
            audio[int(st0 * sr):int(en0 * sr)],
            language="en",
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 100},
            condition_on_previous_text=False,
            word_timestamps=True,
        )
        for s in segs:
            for w in (s.words or []):
                t = norm(w.word)
                if not t:
                    continue
                ws = st0 + float(w.start)
                if i > 0 and ws < st0 + 0.05:      # 겹침 구간 중복 제거
                    continue
                out.append((ws, st0 + float(w.end), t))
        i += 1
    return out


def align(segs, words, look_back=12):
    """대본 문장들을 단어 흐름에 맞춰 새 시각을 계산.

    문장마다 따로 찾으면 광고·잡음 뒤에서 엉뚱한 곳에 붙기 쉬워서,
    대본 전체 단어와 인식된 단어를 한 번에(전역·단조) 정렬한 뒤 문장별
    첫/마지막 단어의 시각을 가져옵니다.
    """
    flat, owner = [], []
    for i, s in enumerate(segs):
        for x in (s.get("en") or "").split():
            t = norm(x)
            if t:
                flat.append(t)
                owner.append(i)
    asr = [w[2] for w in words]
    sm = difflib.SequenceMatcher(None, flat, asr, autojunk=False)
    # ref index -> asr index
    r2a = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            r2a[blk.a + k] = blk.b + k

    spans = {}
    for ri, seg_i in enumerate(owner):
        if ri in r2a:
            lo, hi = spans.get(seg_i, (None, None))
            ai = r2a[ri]
            spans[seg_i] = (ai if lo is None else min(lo, ai), ai if hi is None else max(hi, ai))

    res = []
    for i, s in enumerate(segs):
        span = spans.get(i)
        if span:
            j0, j1 = span
            st = words[j0][0]
            en = words[j1][1]
            res.append({"i": i, "start": round(st, 2), "end": round(en, 2),
                        "ratio": 1.0, "j": j0})
        else:
            res.append({"i": i, "start": s["start"], "end": s["end"], "ratio": 0.0, "j": None})
    # 재정렬이 잘 된 비율(참고용)
    got = sum(1 for a in res if a["j"] is not None)
    return res, got


def tidy(segs, aligned, min_gap=0.12):
    """새 시각을 단조 증가·최소 간격으로 정리하고, 신뢰도 낮은 문장은 이웃 기준 보정."""
    out = []
    for idx, a in enumerate(aligned):
        if a["j"] is not None:
            out.append(dict(a))
        else:
            prev = next((x for x in reversed(aligned[:idx]) if x["j"] is not None), None)
            nxt = next((x for x in aligned[idx + 1:] if x["j"] is not None), None)
            shift = 0.0
            if prev:
                shift = prev["start"] - segs[prev["i"]]["start"]
            elif nxt:
                shift = nxt["start"] - segs[nxt["i"]]["start"]
            out.append({"i": idx, "start": round(segs[idx]["start"] + shift, 2),
                        "end": round(segs[idx]["end"] + shift, 2), "ratio": 0.0, "interp": True})
    for idx, a in enumerate(out):
        if idx > 0 and a["start"] < out[idx - 1]["start"] + min_gap:
            a["start"] = round(out[idx - 1]["start"] + min_gap, 2)
        if a["end"] <= a["start"] + 0.2:
            a["end"] = round(a["start"] + max(0.6, (segs[a["i"]]["end"] - segs[a["i"]]["start"])), 2)
    # 문장끼리 겹치지 않게 앞 문장의 끝을 다음 문장 시작 직전으로 다듬음
    for idx in range(len(out) - 1):
        nxt = out[idx + 1]["start"]
        if out[idx]["end"] > nxt - 0.05:
            out[idx]["end"] = round(max(out[idx]["start"] + 0.3, nxt - 0.05), 2)
    return out, sum(1 for a in out if not a.get("interp"))


def refine(audio, model, segs, fixed, sr=SR):
    """문장마다 그 앞뒤만 다시 받아 적어 시작/끝 시각을 ±0.5초 수준으로 조입니다.

    전역 정렬은 어느 단어가 어느 문장인지까지는 잘 맞추지만, VAD·청크 경계
    탓에 단어 시각 자체가 1~2초 틀리는 수가 있어 한 번 더 확인합니다.
    """
    dur = len(audio) / float(sr)
    out = []
    for a in fixed:
        i = a["i"]
        s = segs[i]
        ref = [norm(x) for x in (s.get("en") or "").split()]
        ref = [x for x in ref if x]
        span = max(1.0, a["end"] - a["start"])
        w0 = max(0.0, a["start"] - 15.0)
        w1 = min(dur, a["start"] + span + 15.0)
        if not ref or w1 - w0 < 2.0:
            out.append(a)
            continue
        chunk = audio[int(w0 * sr):int(w1 * sr)]
        its, _ = model.transcribe(chunk, language="en", beam_size=5, vad_filter=False,
                                  condition_on_previous_text=False, word_timestamps=True)
        ws = []
        for it in its:
            for w in (it.words or []):
                t = norm(w.word)
                if t:
                    ws.append((w0 + float(w.start), w0 + float(w.end), t))
        if len(ws) < max(4, len(ref) // 2):        # 문장이 안 잡힐 만큼 짧게 끊겼으면 그대로 둠
            out.append(a)
            continue
        head = ref[:6]
        best = (0.0, None, 0)
        for j in range(len(ws)):
            for off in range(0, 4):
                got = [ws[j + off + k][2] for k in range(len(head)) if j + off + k < len(ws)]
                if len(got) < max(2, len(head) - 1):
                    break
                r = difflib.SequenceMatcher(None, head[:len(got)], got).ratio()
                if r > best[0]:
                    best = (r, j + off, j)
        if best[1] is None or best[0] < 0.6:
            out.append(a)
            continue
        j0 = best[1]
        tail = ref[-4:] if len(ref) >= 4 else ref
        j1 = j0
        for j in range(j0, len(ws)):
            got = [ws[j + k][2] for k in range(len(tail)) if j + k < len(ws)]
            if len(got) < 2:
                break
            r = difflib.SequenceMatcher(None, tail[:len(got)], got).ratio()
            if r >= 0.75:
                j1 = j + len(got) - 1
        st = round(ws[j0][0], 2)
        en = round(ws[min(j1, len(ws) - 1)][1], 2)
        if en <= st + 0.4:
            en = round(st + span, 2)
        out.append({"i": i, "start": st, "end": en, "ratio": round(best[0], 2), "j": j0,
                    "interp": a.get("interp"), "refined": True})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prog", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--model", default="base.en")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--no-refine", action="store_true", help="문장별 재확인(느림)을 건너뜁니다")
    a = ap.parse_args()

    from faster_whisper import WhisperModel
    doc = json.load(open(a.out, encoding="utf-8"))
    segs = doc.get(a.key)
    if not segs:
        print("!! 대본이 없습니다:", a.key)
        return 2

    t0 = time.time()
    audio = decode(a.audio)
    dur = len(audio) / float(SR)
    print("오디오 %.2f초 · 문장 %d개 (%s)" % (dur, len(segs), os.path.basename(a.audio)))
    model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=4)
    cache = a.audio + ".words.json"
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(a.audio):
        words = [tuple(x) for x in json.load(open(cache, encoding="utf-8"))]
        print("단어 %d개 재사용 (" % len(words) + os.path.basename(cache) + ")")
    else:
        words = asr_words(audio, model)
        try:
            json.dump(words, open(cache, "w", encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass
        print("단어 %d개 인식 (%.0f초)" % (len(words), time.time() - t0))

    aligned, ok = align(segs, words)
    fixed, ok = tidy(segs, aligned)
    if not a.no_refine:
        t1 = time.time()
        fixed = refine(audio, model, segs, fixed)
        print("문장별 재확인 완료 (%.0f초)" % (time.time() - t1))

    deltas = [round(f["start"] - segs[f["i"]]["start"], 2) for f in fixed
              if not f.get("interp")]
    ds = sorted(deltas)
    if ds:
        def q(p):
            return ds[min(len(ds) - 1, int(round(p * (len(ds) - 1))))]
        print("정합 %d/%d문장 · 이동폭 최소 %.2f / 25%% %.2f / 중앙 %.2f / 75%% %.2f / 최대 %.2f초"
              % (ok, len(segs), ds[0], q(.25), q(.5), q(.75), ds[-1]))
    print("\n문장별 이동폭(앞/중간/뒤 8개씩):")
    picks = list(range(0, min(8, len(fixed)))) + \
            list(range(max(0, len(fixed) // 2 - 4), min(len(fixed), len(fixed) // 2 + 4))) + \
            list(range(max(0, len(fixed) - 8), len(fixed)))
    for i in picks:
        f = fixed[i]
        old = segs[f["i"]]
        print("  %3d %7.1f → %7.1f (%+5.1f초) %s%s"
              % (i, old["start"], f["start"], f["start"] - old["start"],
                 "보간" if f.get("interp") else "정합",
                 "  " + (old.get("en") or "")[:52]))
    low = [f["i"] for f in fixed if f.get("interp")]
    if low:
        print("\n!! 낮은 확신으로 보간한 문장:", low[:30], "총 %d개" % len(low))

    if not a.write:
        print("\n(미리보기) --write 를 붙이면 radio_transcripts.json 을 갱신합니다.")
        return 0

    for f in fixed:
        s = segs[f["i"]]
        s["start"] = round(f["start"], 2)
        s["end"] = round(f["end"], 2)
    # 문장끼리 겹치지 않게 한 번 더 정리(refine 이후)
    for idx in range(len(segs) - 1):
        nxt = segs[idx + 1]["start"]
        if segs[idx]["end"] > nxt - 0.05:
            segs[idx]["end"] = round(max(segs[idx]["start"] + 0.3, nxt - 0.05), 2)
    meta = doc.setdefault("_meta", {}).setdefault(a.key, {})
    meta["audioDur"] = round(dur, 2)
    meta["aligned"] = datetime.now(KST).isoformat(timespec="seconds")
    tmp = a.out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write("\n")
    os.replace(tmp, a.out)
    print("✅ %s 타임스탬프 재정렬 완료 (%.1f KB)" % (a.key, os.path.getsize(a.out) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())

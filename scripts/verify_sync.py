#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""라디오 대본 타임스탬프가 실제 오디오와 맞는지 '독립적으로' 확인.

대본 JSON 의 문장 몇 개를 골라, 그 시점 ±30초를 새로 받아 적고
문장 첫 단어가 실제로 몇 초에 들리는지 재어 offset(초)을 냅니다.
offset 이 0에 가까우면 자막과 소리가 맞는 것.

    python3 scripts/verify_sync.py --audio ep.mp3 --key "cnn5things::<guid>"
"""
import argparse
import difflib
import json
import os
import re
import sys

import av
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TR = os.path.join(os.path.dirname(HERE), "radio_transcripts.json")
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--points", default="0.02,0.25,0.5,0.75,0.98")
    ap.add_argument("--window", type=float, default=35.0)
    a = ap.parse_args()

    from faster_whisper import WhisperModel
    segs = json.load(open(TR, encoding="utf-8"))[a.key]
    audio = decode(a.audio)
    dur = len(audio) / float(SR)
    model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=4)

    print("%s · 오디오 %.1f초 · 문장 %d개" % (a.key, dur, len(segs)))
    rows = []
    for f in [float(x) for x in a.points.split(",")]:
        i = int(round(f * (len(segs) - 1)))
        s = segs[i]
        w0 = max(0.0, s["start"] - a.window)
        w1 = min(dur, s["start"] + a.window)
        its, _ = model.transcribe(audio[int(w0 * SR):int(w1 * SR)], language="en", beam_size=5,
                                  vad_filter=False, condition_on_previous_text=False,
                                  word_timestamps=True)
        ws = []
        for it in its:
            for w in (it.words or []):
                t = norm(w.word)
                if t:
                    ws.append((w0 + float(w.start), t))
        head = [norm(x) for x in (s.get("en") or "").split()][:6]
        head = [x for x in head if x]
        best = (0.0, None)
        for j in range(len(ws)):
            got = [ws[j + k][1] for k in range(len(head)) if j + k < len(ws)]
            if len(got) < max(3, len(head) - 1):
                break
            r = difflib.SequenceMatcher(None, head[:len(got)], got).ratio()
            if r > best[0]:
                best = (r, j)
        if best[1] is None or best[0] < 0.6:
            print("  seg%-3d t=%7.1f  매칭 실패(ratio %.2f)" % (i, s["start"], best[0]))
            continue
        heard = ws[best[1]][0]
        print("  seg%-3d 대본 %7.1f초 → 실제 %7.1f초 (offset %+5.2f초, ratio %.2f) %s"
              % (i, s["start"], heard, heard - s["start"], best[0], (s.get("en") or "")[:46]))
        rows.append(heard - s["start"])
    if rows:
        offs = sorted(abs(x) for x in rows)
        print("→ |offset| 중앙 %.2f초 · 최대 %.2f초 · 1초 이내 %d/%d"
              % (offs[len(offs) // 2], offs[-1], sum(1 for x in offs if x <= 1.0), len(offs)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

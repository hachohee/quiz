#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 🎧 라디오 회차 MP3 → 영어 대본 세그먼트(start/end/en)

faster-whisper(CPU int8)로 받아쓰기합니다. 메모리가 작은 환경에서도 돌도록
오디오를 chunk초 단위로 잘라 처리하고(3초 겹침), 겹침 구간의 중복 세그먼트는 버립니다.

    python3 scripts/transcribe_radio.py episode.mp3 cnn5things.raw.json [model] [chunk] [beam]

- model: base.en(기본) · small.en · small — base.en이 2코어에서도 20~30배속으로 돌아 실용적입니다.
- 결과를 build_radio_transcripts.py --asr 로 넘기면 문장 단위로 병합됩니다.
"""
import json
import sys
import time

import av
import numpy as np
from faster_whisper import WhisperModel

SR = 16000


def decode(path, sr=SR):
    """MP3 → 16kHz mono float32 (av/PyAV 사용, ffmpeg 바이너리 불필요)."""
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
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    mp3, out = sys.argv[1], sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "base.en"
    chunk = float(sys.argv[4]) if len(sys.argv) > 4 else 180.0
    beam = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    t0 = time.time()
    audio = decode(mp3)
    dur = len(audio) / float(SR)
    print("decoded %.1fs audio in %.1fs" % (dur, time.time() - t0), flush=True)

    model = WhisperModel(name, device="cpu", compute_type="int8", cpu_threads=2)

    rows, i = [], 0
    while i * chunk < dur:
        start = i * chunk
        end = min(dur, start + chunk + 3.0)
        seg, _info = model.transcribe(
            audio[int(start * SR):int(end * SR)],
            language="en",
            beam_size=beam,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 100},
            condition_on_previous_text=False,
            without_timestamps=False,
            word_timestamps=False,
        )
        for s in seg:
            st = start + float(s.start)
            en = (s.text or "").strip()
            if not en:
                continue
            if st < start + 0.05 and i > 0:      # 겹침 구간 중복 제거
                continue
            rows.append({"start": round(st, 2), "end": round(start + float(s.end), 2), "en": en})
        print("  chunk %d [%.0f-%.0f] segs=%d elapsed=%.0fs"
              % (i, start, end, len(rows), time.time() - t0), flush=True)
        i += 1

    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    print("DONE %d segs, audio %.0fs elapsed %.0fs" % (len(rows), dur, time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main())

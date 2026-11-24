#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 🎬 방송 4사 시사·교양 다큐 최신 회차 수집기

각 방송사 **공식 유튜브 채널 RSS**(API 키 필요 없음, 무료)에서 최신 업로드를
받아 `docs_episodes.json` 하나로 합칩니다. 표준 라이브러리만 씁니다.

    python3 scripts/update_docs.py [출력경로]

- 시사·보도(news) / 교양·다큐(edu) 두 갈래로 나눠 담고, 화면에서는 날짜 내림차순.
- 한 채널이 RSS를 못 주면(일시 장애) 기존 JSON의 그 채널 회차를 그대로 살립니다.
- 쇼츠(#Shorts)로 보이는 항목은 걸러 냅니다 — '다시보기'에 1분 클립이 섞이지 않게.
- 프로그램 목록(PROGRAMS)의 channel_id 는 2026-11-24 채널 페이지에서 직접 확인한
  공식 채널 ID입니다. 채널이 바뀌면 여기만 고치면 됩니다.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
PER_PROGRAM = 8        # 프로그램별로 저장하는 최신 회차 수
UA = ("Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36")

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(os.path.dirname(HERE), "docs_episodes.json")

ATOM = "{http://www.w3.org/2005/Atom}"
YT = "{http://www.youtube.com/xml/schemas/2015}"
MEDIA = "{http://search.yahoo.com/mrss/}"

# 순서가 곧 화면 기본 순서입니다. (방송사 → 프로그램)
PROGRAMS = [
    # ---------------- 📰 시사·보도 ----------------
    {
        "id": "kbs-window", "b": "kbs", "cat": "news",
        "name": "KBS 시사기획 창", "short": "시사기획 창",
        "channel": "KBS시사", "channel_id": "UCEb31RoX5RnfYENmnyokN8A",
        "note": "KBS 기자들이 만드는 탐사보도 — 매주 화요일 밤",
    },
    {
        "id": "kbs-chu60", "b": "kbs", "cat": "news",
        "name": "KBS 추적 60분", "short": "추적 60분",
        "channel": "KBS 추적60분", "channel_id": "UCy-6oZwPwrR_W-zYnqLD8dg",
        "note": "1983년부터 이어온 탐사 프로그램 — 매주 금요일 밤 10시",
    },
    {
        "id": "mbc-pd", "b": "mbc", "cat": "news",
        "name": "MBC PD수첩", "short": "PD수첩",
        "channel": "MBC PD수첩", "channel_id": "UCawCv9kO2UXbTtsK4EammRQ",
        "note": "MBC 대표 탐사보도 — 매주 화요일 밤 10시",
    },
    {
        "id": "mbc-straight", "b": "mbc", "cat": "news",
        "name": "MBC 탐사기획 스트레이트", "short": "스트레이트",
        "channel": "탐사기획 스트레이트", "channel_id": "UCSnghwknYf04dRFBtOtY8xA",
        "note": "MBC 탐사기획 — 매주 일요일 밤",
    },
    {
        "id": "sbs-geal", "b": "sbs", "cat": "news",
        "name": "SBS 그것이 알고 싶다", "short": "그것이 알고싶다",
        "channel": "그것이 알고싶다", "channel_id": "UC_U34UlsS9Mp5ZgvsEA7irw",
        "note": "SBS 대표 탐사보도 — 매주 토요일 밤 11시",
    },
    # ---------------- 🎬 교양·다큐 ----------------
    {
        "id": "kbs-docu", "b": "kbs", "cat": "edu",
        "name": "KBS 다큐 (다큐멘터리 3일 · 다큐 인사이트 · 역사스페셜)", "short": "KBS 다큐",
        "channel": "KBS 다큐", "channel_id": "UC4LW3sOslC14Vn5bcoNUBkg",
        "note": "KBS 공식 다큐 채널 — 다큐멘터리 3일 · 다큐 인사이트 · 역사스페셜 · 명견만리",
    },
    {
        "id": "kbs-kyoyang", "b": "kbs", "cat": "edu",
        "name": "KBS 교양 (인간극장 · 이웃집 찰스)", "short": "KBS 교양",
        "channel": "KBS 교양", "channel_id": "UCHlSeJxRIXZWMARC2oMwmcQ",
        "note": "따뜻한 감동, 알찬 정보 — 인간극장 · 이웃집 찰스",
    },
    {
        "id": "mbc-docu", "b": "mbc", "cat": "edu",
        "name": "MBC 다큐·교양 (MBC 스페셜 · 다큐플렉스)", "short": "MBC 다큐",
        "channel": "MBC PLAYGROUND", "channel_id": "UCVHf2Ne1-jZwlvYgTcfL7jw",
        "note": "MBC 시사교양 공식 — 다시 꺼내 본 MBC 다큐와 인물 인터뷰",
    },
    {
        "id": "mbc-life", "b": "mbc", "cat": "edu",
        "name": "MBClife (휴먼다큐 사랑 · 너를 만났다)", "short": "MBClife",
        "channel": "MBClife", "channel_id": "UCfWZnsdfiKvOyHDGfzMT3Cg",
        "note": "MBC 교양 공식 채널 — 휴먼다큐 · 생활 정보",
    },
    {
        "id": "sbs-dali", "b": "sbs", "cat": "edu",
        "name": "SBS 교양 (SBS 스페셜 · 꼬리에 꼬리를 무는 그날 이야기)", "short": "SBS 교양",
        "channel": "달리 [SBS DALI]", "channel_id": "UCPx-7AKiN1Z_qEVKhLQ5pAw",
        "note": "SBS 교양 공식 채널 '달리' — SBS 스페셜 · 꼬꼬무 · 과몰입 인생사",
    },
    {
        "id": "ebs-docu", "b": "ebs", "cat": "edu",
        "name": "EBS 다큐 (다큐프라임 · 한국기행 · 극한직업 · 건축탐구 집)", "short": "EBS 다큐",
        "channel": "EBSDocumentary (EBS 다큐)", "channel_id": "UCFCtZJTuJhE18k8IXwmXTYQ",
        "note": "국내 최대 다큐 채널 '골라듄다큐' — 다큐프라임 · 한국기행 · 극한직업",
    },
    {
        "id": "ebs-jisik", "b": "ebs", "cat": "edu",
        "name": "EBS 지식채널e", "short": "지식채널e",
        "channel": "EBS 지식채널e", "channel_id": "UCL44YGs2BXxtM4GZRH-wnrQ",
        "note": "5분 지식 다큐 — 하루 한 편이면 충분한 상식",
    },
]

SHORTS_RE = re.compile(r"#\s*shorts?\b|쇼츠", re.IGNORECASE)
TEASE_RE = re.compile(r"예고편|예고\s*\]|예고\b|티저|teaser|trailer|미리보기", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean(s):
    if not s:
        return ""
    s = TAG_RE.sub("", s)
    return WS_RE.sub(" ", s).strip()


def parse_date(txt):
    """RSS published(UTC) → KST datetime"""
    try:
        dt = datetime.strptime(txt.strip(), "%Y-%m-%dT%H:%M:%S%z")
    except Exception:
        try:
            dt = datetime.strptime(txt.strip()[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return dt.astimezone(KST)


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                       "Accept-Language": "ko-KR,ko;q=0.9"})
            with urllib.request.urlopen(req, timeout=25) as res:
                return res.read()
        except Exception as e:      # noqa: BLE001 — 네트워크는 어떤 이유로든 실패할 수 있음
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def feed_entries(channel_id):
    url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channel_id
    root = ET.fromstring(fetch(url))
    out = []
    for e in root.findall(ATOM + "entry"):
        vid = e.findtext(YT + "videoId") or ""
        title = clean(e.findtext(ATOM + "title") or "")
        pub = parse_date(e.findtext(ATOM + "published") or "")
        thumb = ""
        grp = e.find(MEDIA + "group")
        if grp is not None:
            th = grp.find(MEDIA + "thumbnail")
            if th is not None:
                thumb = th.get("url") or ""
        if not vid or not title or pub is None:
            continue
        if SHORTS_RE.search(title):
            continue
        if TEASE_RE.search(title):
            continue
        out.append({
            "v": vid,
            "title": title,
            "dt": pub,
            "date": pub.strftime("%Y-%m-%d"),
            "thumb": thumb or ("https://i.ytimg.com/vi/%s/mqdefault.jpg" % vid),
        })
    out.sort(key=lambda x: x["dt"], reverse=True)
    return out[:PER_PROGRAM]


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    old = {}
    if os.path.exists(out_path):
        try:
            with open(out_path, encoding="utf-8") as f:
                prev = json.load(f)
            for ep in prev.get("episodes", []):
                old.setdefault(ep.get("pid"), []).append(ep)
        except Exception:
            old = {}

    episodes = []
    ok, failed = [], []
    for p in PROGRAMS:
        try:
            items = feed_entries(p["channel_id"])
            if not items:
                raise RuntimeError("RSS에 항목이 없음")
            ok.append(p["id"])
            for it in items:
                episodes.append({
                    "v": it["v"],
                    "pid": p["id"],
                    "b": p["b"],
                    "cat": p["cat"],
                    "program": p["short"],
                    "title": it["title"],
                    "date": it["date"],
                    "dt": it["dt"].isoformat(),
                    "thumb": it["thumb"],
                })
            print("  ✓ %-28s %2d편" % (p["short"], len(items)))
        except Exception as e:      # noqa: BLE001
            failed.append(p["id"])
            kept = old.get(p["id"], [])
            episodes.extend(kept)
            print("  ! %-28s 실패(%s) — 이전 %d편 유지" % (p["short"], e, len(kept)))
        time.sleep(0.3)

    # 같은 영상이 두 프로그램에 겹쳐 오는 경우 제거
    seen = set()
    uniq = []
    for ep in sorted(episodes, key=lambda x: x.get("dt", ""), reverse=True):
        if ep["v"] in seen:
            continue
        seen.add(ep["v"])
        uniq.append(ep)

    data = {
        "updated_at": datetime.now(KST).isoformat(timespec="seconds"),
        "source": "YouTube channel RSS (official channels)",
        "per_program": PER_PROGRAM,
        "failed": failed,
        "programs": [{
            "id": p["id"], "b": p["b"], "cat": p["cat"], "name": p["name"],
            "short": p["short"], "channel": p["channel"], "channel_id": p["channel_id"],
            "url": "https://www.youtube.com/channel/" + p["channel_id"],
            "note": p["note"],
        } for p in PROGRAMS],
        "episodes": uniq,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("저장: %s · 회차 %d편 (성공 %d · 실패 %d)"
          % (out_path, len(uniq), len(ok), len(failed)))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

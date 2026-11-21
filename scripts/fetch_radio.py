#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
똑똑핫초 · 📻 매일 라디오 최신 회차 수집기

각 방송사 공식 팟캐스트 RSS에서 최신 회차 8개씩을 뽑아
`radio_episodes.json` 하나로 합칩니다. 표준 라이브러리만 씁니다.

    python3 scripts/fetch_radio.py [출력경로]

- 한 방송이 일시적으로 실패해도 기존 JSON의 그 방송 회차를 그대로 살려 둡니다(stale 표시).
- BBC RSS의 enclosure는 http:// 라서 https:// 로 바꿔 저장합니다(HTTPS 페이지 Mixed Content 방지).
  ppg:enclosureSecure 가 있으면 그것을 우선 씁니다.
"""

import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
PER_PROGRAM = 8          # 방송별 저장 회차 수
MAX_ITEMS_SCAN = 40      # RSS 앞부분에서 훑어볼 최대 item 수(정렬 후 상위 8개 사용)
UA = ("Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36")

DEFAULT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "radio_episodes.json")

# 순서가 곧 앱 화면 순서입니다. (영어 뉴스/학습 3개 먼저 → 한국 라디오 5개)
PROGRAMS = [
    {
        "id": "cnn5things",
        "group": "en",
        "flag": "🇺🇸",
        "name": "CNN 5 Things",
        "short": "CNN 5 Things",
        "station": "CNN Audio",
        "tag": "미국·세계 뉴스 5분",
        "desc": "매일 아침 미국·세계 핵심 뉴스 5개를 5분에",
        "rss": "https://feeds.megaphone.fm/WMHY2007701094",
    },
    {
        "id": "bbcnews",
        "group": "en",
        "flag": "🇬🇧",
        "name": "BBC Global News Podcast",
        "short": "BBC News",
        "station": "BBC World Service",
        "tag": "글로벌 심층 뉴스",
        "desc": "하루 두 번, 세계 뉴스를 깊이 있게 (보통 25~30분)",
        "rss": "https://podcasts.files.bbci.co.uk/p02nq0gn.rss",
    },
    {
        "id": "bbc6min",
        "group": "en",
        "flag": "🇬🇧",
        "name": "BBC 6 Minute English",
        "short": "6 Minute",
        "station": "BBC Learning English",
        "tag": "6분 영어 학습",
        "desc": "6분 안에 영단어·표현 하나 — 출퇴근·설거지용",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
    },
    {
        "id": "goodmorningpops",
        "group": "kr",
        "flag": "🎵",
        "name": "조정현의 굿모닝 팝스",
        "short": "굿모닝팝스",
        "station": "KBS 2FM",
        "tag": "영어·팝",
        "desc": "팝송 한 곡으로 영어 표현 익히기 (매일 10분)",
        "rss": "https://api.kbs.co.kr/mediafactory/v1/podcast/rss/I0000-2014-goodmorningpops",
    },
    {
        "id": "siseon",
        "group": "kr",
        "flag": "🗞️",
        "name": "김종배의 시선집중",
        "short": "시선집중",
        "station": "MBC 표준FM",
        "tag": "시사 인터뷰",
        "desc": "평일 아침 7시 5분, 그날의 쟁점 인터뷰",
        "rss": "https://minicast.imbc.com/PodCast/pod.aspx?code=1000674100000100000",
    },
    {
        "id": "newsshow",
        "group": "kr",
        "flag": "📻",
        "name": "박성태의 뉴스쇼",
        "short": "뉴스쇼",
        "station": "CBS 표준FM",
        "tag": "시사",
        "desc": "아침 7시 30분, 뉴스 뒤 이야기",
        "rss": ("https://www.omnycontent.com/d/playlist/53ac8cb6-b299-4f93-8280-af50012ddab0/"
                "cb1b4f42-acae-4db3-a7e0-af56000e0f71/b28168e2-c100-4ce4-92b3-af56000e0f7a/podcast.rss"),
    },
    {
        "id": "mightysuccess",
        "group": "kr",
        "flag": "💡",
        "name": "성공예감 이대호입니다",
        "short": "성공예감",
        "station": "KBS 1라디오",
        "tag": "경제·재테크",
        "desc": "돈·일·창업 이야기를 사례로 (보통 30~40분)",
        "rss": "https://static.api.kbs.co.kr/mediafactory/v1/podcast/rss/R2018-0169-mightysuccess",
    },
    {
        "id": "todayworld",
        "group": "kr",
        "flag": "🌏",
        "name": "KBS 1라디오 오늘 세계는",
        "short": "오늘세계",
        "station": "KBS 1라디오",
        "tag": "국제",
        "desc": "국제 정세를 기자들이 풀어 주는 45분",
        "rss": "https://api.kbs.co.kr/mediafactory/v1/podcast/rss/todayworld",
    },
]

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean_text(s):
    if not s:
        return ""
    s = TAG_RE.sub(" ", s)
    s = (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
         .replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " "))
    return WS_RE.sub(" ", s).strip()


def local(tag):
    return tag.rsplit("}", 1)[-1].lower()


def find_child(elem, name):
    for c in elem:
        if local(c.tag) == name.lower():
            return c
    return None


def find_text(elem, name):
    c = find_child(elem, name)
    if c is None:
        return ""
    return (c.text or "").strip()


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
                "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            })
            with urllib.request.urlopen(req, timeout=35) as r:
                return r.read()
        except Exception as e:                      # noqa: BLE001
            last = e
            time.sleep(2 + i * 3)
    raise RuntimeError("RSS 요청 실패: %s (%s)" % (url, last))


def parse_date(txt):
    """RFC822 → KST datetime (실패하면 None)."""
    if not txt:
        return None
    from email.utils import parsedate_to_datetime
    try:
        d = parsedate_to_datetime(txt.strip())
    except Exception:                                # noqa: BLE001
        return None
    if d is None:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(KST)


DUR_RE = re.compile(r"^\s*(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?\s*$")


def parse_duration(txt):
    """'00:09:18' · '9:18' · '558' → 초(int). 모르면 0."""
    if not txt:
        return 0
    s = str(txt).strip()
    if s.isdigit():
        return int(s)
    m = DUR_RE.match(s)
    if m:
        h = int(m.group(1) or 0)
        return h * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    return 0


def fmt_duration(sec):
    sec = int(sec or 0)
    if sec <= 0:
        return ""
    h, rest = divmod(sec, 3600)
    m, s = divmod(rest, 60)
    if h:
        return "%d시간 %02d분" % (h, m)
    return "%d분 %02d초" % (m, s)


def https_url(u):
    u = (u or "").strip()
    if u.startswith("http://"):
        u = "https://" + u[len("http://"):]
    return u


def item_record(elem):
    title = clean_text(find_text(elem, "title"))
    if not title:
        return None

    enc = find_child(elem, "enclosureSecure")       # BBC: https 원본
    if enc is None:
        enc = find_child(elem, "enclosure")
    mp3 = ""
    if enc is not None:
        mp3 = https_url(enc.attrib.get("url") or "")
    if not mp3:
        # enclosure가 없는 피드 대비: media:content / link 중 mp3
        for c in elem:
            u = c.attrib.get("url") or (c.text or "")
            if u and ".mp3" in u.lower():
                mp3 = https_url(u)
                break
    if not mp3:
        return None

    dt = parse_date(find_text(elem, "pubDate"))
    sec = parse_duration(find_text(elem, "duration"))
    guid = clean_text(find_text(elem, "guid")) or mp3

    return {
        "title": title,
        "guid": guid,
        "mp3": mp3,
        "dateISO": dt.isoformat() if dt else "",
        "dateLabel": ("%d/%d(%s) %02d:%02d" % (dt.month, dt.day, WEEKDAYS[dt.weekday()],
                                               dt.hour, dt.minute)) if dt else "",
        "dateShort": ("%d/%d(%s)" % (dt.month, dt.day, WEEKDAYS[dt.weekday()])) if dt else "",
        "durationSec": sec,
        "durationLabel": fmt_duration(sec),
        "_ts": dt.timestamp() if dt else 0,
    }


def parse_feed(data, limit=MAX_ITEMS_SCAN):
    items = []
    try:
        it = ET.iterparse(io.BytesIO(data), events=("end",))
        for _event, elem in it:
            if local(elem.tag) == "item":
                rec = item_record(elem)
                if rec:
                    items.append(rec)
                elem.clear()
                if len(items) >= limit:
                    break
    except ET.ParseError as e:
        raise RuntimeError("RSS XML 해석 실패: %s" % e)
    return items


def pick_latest(items, n=PER_PROGRAM):
    seen = set()
    uniq = []
    for it in sorted(items, key=lambda x: x["_ts"], reverse=True):
        k = it["guid"] or it["mp3"]
        if k in seen:
            continue
        seen.add(k)
        uniq.append(it)
        if len(uniq) >= n:
            break
    for it in uniq:
        it.pop("_ts", None)
    return uniq


def load_previous(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:                                # noqa: BLE001
        return {}


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    previous = load_previous(out_path)
    prev_by_id = {p.get("id"): p for p in previous.get("programs", []) if isinstance(p, dict)}

    programs = []
    problems = []
    for p in PROGRAMS:
        entry = {k: p[k] for k in ("id", "group", "flag", "name", "short", "station", "tag", "desc", "rss")}
        try:
            raw = fetch(p["rss"])
            eps = pick_latest(parse_feed(raw))
            if not eps:
                raise RuntimeError("회차 0개")
            entry["episodes"] = eps
            entry["ok"] = True
            entry["stale"] = False
            print("[OK ] %-14s %2d회차 · 최신 %s · %s"
                  % (p["id"], len(eps), eps[0]["dateLabel"] or "?", eps[0]["title"][:48]))
        except Exception as e:                        # noqa: BLE001
            old = prev_by_id.get(p["id"]) or {}
            old_eps = old.get("episodes") or []
            entry["episodes"] = old_eps
            entry["ok"] = False
            entry["stale"] = bool(old_eps)
            entry["error"] = str(e)[:200]
            problems.append(p["id"])
            print("[FAIL] %-14s %s → 이전 %d회차 유지" % (p["id"], e, len(old_eps)))
        programs.append(entry)

    now = datetime.now(KST)
    label = "%d/%d %02d:%02d" % (now.month, now.day, now.hour, now.minute)

    # 회차 내용이 그대로면 '갱신 시각'도 그대로 두어, 바뀐 게 없을 때 커밋이 생기지 않게 함
    def content(progs):
        return json.dumps(progs, ensure_ascii=False, sort_keys=True)

    if content(programs) == content(previous.get("programs") or []):
        now_iso = previous.get("updated") or now.isoformat(timespec="seconds")
        label = previous.get("updatedLabel") or label
        unchanged = True
    else:
        now_iso = now.isoformat(timespec="seconds")
        unchanged = False

    doc = {
        "updated": now_iso,
        "updatedLabel": label,
        "perProgram": PER_PROGRAM,
        "programs": programs,
    }

    tmp = out_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, out_path)

    total = sum(len(p["episodes"]) for p in programs)
    print("→ %s (방송 %d개 · 회차 %d개 · 실패 %d개)%s"
          % (out_path, len(programs), total, len(problems),
             " — 내용 변화 없음" if unchanged else " — 갱신됨"))
    return 0 if len(problems) < len(programs) else 1


if __name__ == "__main__":
    sys.exit(main())

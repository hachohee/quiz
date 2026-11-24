#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
행복핫초 · 가정 허브 데이터 만들기

`gog calendar events`로 받은 일정 JSON을 **공개해도 되는 형태로 걸러** `hotcho_family.json`에 담고,
찬우 공부방(studywithfriends)의 **오늘의 주제**를 함께 계산해 넣습니다.

    gog --readonly calendar events primary --days 14 --all-pages --results-only \
        --select id,summary,start,end,location,status > /tmp/cal.json
    python3 scripts/update_hotcho_family.py --calendar /tmp/cal.json

걸러내는 것(이 JSON은 GitHub Pages에 공개됩니다):
  · 병원·진료·검진·약국·처방 등 **건강/의료 일정은 아예 넣지 않습니다.**
  · 회의 ID·비밀번호, 전화번호, 이메일 같은 접속 정보를 지웁니다.
  · 가족 이름은 역할 말로 바꿉니다(이찬우·찬우 → 아이, 이동민·동민 → 남편, 하초희·초희 → 엄마).
"""

import argparse
import collections
import datetime as dt
import json
import os
import re
import sys

KST = dt.timezone(dt.timedelta(hours=9))
DAYS_AHEAD = 14

# 절대 공개하지 않는 갈래 — 일정 자체를 뺍니다.
BLOCK_WORDS = [
    "병원", "의원", "진료", "검진", "내시경", "수면내시경", "약국", "처방", "투약",
    "정신", "심리", "상담센터", "재활", "물리치료", "주사", "시술", "수술",
    "치과", "안과", "이비인후", "피부과", "산부인과", "비뇨기", "정형외과", "신경외과",
    "한의원", "건강검진", "예방접종", "백신", "임상", "검사결과", "생리",
]
# 이름 → 역할말
NAME_MAP = [
    (r"이\s*찬우", "아이"), (r"찬우", "아이"),
    (r"이\s*동민", "남편"), (r"동민", "남편"),
    (r"하\s*초희", "엄마"), (r"초희", "엄마"),
]
SCRUB = [
    (r"(회의\s*ID|비밀번호|암호|비번)\s*[:：]?\s*[\d\s/\-]{3,}", ""),
    (r"\+?82[\s\-]?1\d[\s\-]?\d{3,4}[\s\-]?\d{4}", ""),
    (r"0\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{4}", ""),
    (r"[\w.+-]+@[\w-]+\.[\w.]+", ""),
    (r"\s{2,}", " "),
]
TIDY = [
    (r"\(\s*[/·,;\-]?\s*\)", ""),   # 접속정보를 지운 뒤 남은 빈 괄호
    (r"\s{2,}", " "),
]

KIDS_APP = "/workspace/work/kids-study-app"
START_HISTORY = dt.date(2026, 11, 21)


# ------------------------------------------------------------------ 일정
def load_calendar(path):
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    if isinstance(raw, dict):
        data = raw.get("data") or {}
        if isinstance(data.get("result"), list):
            return data["result"]
        if isinstance(data.get("events"), list):
            return data["events"]
    if isinstance(raw, list):
        return raw
    return []


def clean_text(text):
    out = (text or "").strip()
    for pat, rep in SCRUB:
        out = re.sub(pat, rep, out)
    for pat, rep in NAME_MAP:
        out = re.sub(pat, rep, out)
    for pat, rep in TIDY:
        out = re.sub(pat, rep, out)
    return out.strip(" ·-,()")


def is_blocked(text):
    low = (text or "").replace(" ", "")
    return any(w.replace(" ", "") in low for w in BLOCK_WORDS)


def event_dt(node):
    if not node:
        return None, False
    if node.get("dateTime"):
        try:
            return dt.datetime.fromisoformat(node["dateTime"]), False
        except ValueError:
            return None, False
    if node.get("date"):
        try:
            return dt.datetime.combine(dt.date.fromisoformat(node["date"]), dt.time(), KST), True
        except ValueError:
            return None, True
    return None, False


def build_events(raw_events, today):
    out, hidden = [], 0
    horizon = today + dt.timedelta(days=DAYS_AHEAD)
    for ev in raw_events:
        if (ev.get("status") or "confirmed") == "cancelled":
            continue
        title = clean_text(ev.get("summary") or "")
        place = clean_text(ev.get("location") or "")
        if not title:
            continue
        if is_blocked(title) or is_blocked(place):
            hidden += 1
            continue
        start, allday = event_dt(ev.get("start"))
        end, _ = event_dt(ev.get("end"))
        if not start:
            continue
        start = start.astimezone(KST)
        day = start.date()
        if day < today or day > horizon:
            continue
        item = {
            "date": day.isoformat(),
            "title": title,
            "allday": bool(allday),
        }
        if not allday:
            item["time"] = start.strftime("%H:%M")
            if end:
                item["end"] = end.astimezone(KST).strftime("%H:%M")
        if place:
            item["place"] = place[:60]
        out.append(item)
    out.sort(key=lambda e: (e["date"], e.get("time") or "00:00"))
    return out, hidden


# ------------------------------------------------------------------ 찬우 공부방
def parse_steps(app_html):
    """ENGLISH_STEPS: Step 이름과 문장 수만 뽑습니다(오늘 몇 단계인지 계산용)."""
    block = app_html[app_html.find("const ENGLISH_STEPS = ["):]
    block = block[: block.find("\n];") + 3] if "\n];" in block else block
    steps = []
    for m in re.finditer(r"name: '(Step \d+)',\s*short: '[^']*',\s*title: '([^']+)'", block):
        steps.append({"name": m.group(1), "title": m.group(2), "count": 0})
    for chunk in re.split(r"name: 'Step \d+'", block)[1:]:
        if steps:
            cnt = len(re.findall(r"\{ en:", chunk))
            # 마지막 문턱까지
            for st in steps:
                if st["count"] == 0:
                    st["count"] = cnt
                    break
    return [s for s in steps if s["count"]]


def build_kids(daynum, app_dir):
    try:
        with open(os.path.join(app_dir, "videos.json"), encoding="utf-8") as f:
            subjects = json.load(f)["subjects"]
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] videos.json 없음: {exc}", file=sys.stderr)
        return None

    def groups(key):
        g = collections.OrderedDict()
        for item in subjects.get(key, []):
            g.setdefault(str(item["id"]).split("-q")[0], []).append(item)
        return list(g.values())

    topics, volume = [], "수학 10문제"
    hist = groups("history")
    if hist:
        n = (daynum - (START_HISTORY - dt.date(1970, 1, 1)).days)
        topics.append({"subject": "🏯 한국사", "topic": hist[n % len(hist)][0].get("topic", "")})
    hero = groups("hero")
    if hero:
        topics.append({"subject": "🌟 위인", "topic": hero[(daynum + 6) % len(hero)][0].get("topic", "")})
    news = groups("news")
    if news:
        topics.append({"subject": "🌍 시사상식", "topic": news[(daynum + 8) % len(news)][0].get("topic", "")})

    # 영어: 오늘의 문장이 속한 Step
    try:
        with open(os.path.join(app_dir, "index.html"), encoding="utf-8") as f:
            steps = parse_steps(f.read())
        if steps:
            total = sum(s["count"] for s in steps)
            if total:
                idx = ((daynum * 3) * 7 + 3) % total
                acc = 0
                for st in steps:
                    acc += st["count"]
                    if idx < acc:
                        topics.append({"subject": "🔤 영어", "topic": f"{st['name']} · {st['title']}", "sub": "문장 3개"})
                        break
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] 영어 단계 계산 실패: {exc}", file=sys.stderr)

    return {
        "day": daynum - (START_HISTORY - dt.date(1970, 1, 1)).days + 1,
        "topics": [t for t in topics if t.get("topic")],
        "volume": volume,
        "app": "https://hachohee.github.io/studywithfriends/",
    }


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--calendar", required=True, help="gog calendar events 결과 JSON 경로")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), ".."))
    ap.add_argument("--kids-app", default=KIDS_APP)
    ap.add_argument("--today", default="", help="YYYY-MM-DD (테스트용)")
    args = ap.parse_args()

    today = dt.date.fromisoformat(args.today) if args.today else dt.datetime.now(KST).date()
    out_dir = os.path.abspath(args.out)
    path = os.path.join(out_dir, "hotcho_family.json")

    prev = {}
    try:
        with open(path, encoding="utf-8") as f:
            prev = json.load(f)
    except Exception:
        pass

    events, hidden = build_events(load_calendar(args.calendar), today)
    daynum = (today - dt.date(1970, 1, 1)).days
    kids = build_kids(daynum, args.kids_app) or prev.get("kids")

    data = {
        "updated": dt.datetime.now(KST).strftime("%Y-%m-%d %H:%M"),
        "range": {"from": today.isoformat(), "to": (today + dt.timedelta(days=DAYS_AHEAD)).isoformat()},
        "events": events,
        "kids": kids,
        "note": "민감한 일정(건강·진료 등)은 여기에 올리지 않아요. 달력에서 직접 확인해요.",
        "hidden": hidden,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"저장: {path} · 일정 {len(events)}건(민감 {hidden}건 제외) · 오늘 주제 {len((kids or {}).get('topics') or [])}개")


if __name__ == "__main__":
    main()

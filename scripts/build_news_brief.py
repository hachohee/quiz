#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📌 오늘의 뉴스 브리핑(daily_brief) 생성·교체기

`hotcho_news.json` 의 daily_brief 한 칸을 다룹니다.

    "daily_brief": {
      "date": "2026-11-24",
      "context": ["🌍 세계 — ...", "🏛 전국 — ...", "🏔 강원 — ..."],
      "questions": ["...", "..."]
    }

쓰는 법
  1) 자동 초안 — 수집된 뉴스(세계·전국·강원)와 hotcho_briefings.json 그날치로 골격을 만듭니다.
       python3 scripts/build_news_brief.py --auto
       python3 scripts/build_news_brief.py --auto --date 2026-11-23 --dry-run
  2) 손으로 다듬은 문장 넣기 — 초희·행복이 검수한 문장을 그대로 심습니다.
       python3 scripts/build_news_brief.py --context "🌍 세계 — ..." --context "🏔 강원 — ..." \\
            --question "..." --question "..."
       python3 scripts/build_news_brief.py --brief-json drafts/brief_1124.json
  3) 지금 뭐가 들어 있는지만 보기
       python3 scripts/build_news_brief.py --show

- `--context`/`--question` 도 `--auto` 도 주지 않으면 daily_brief 를 **그대로 둡니다**(안전).
- `--auto` 결과는 어디까지나 **초안**입니다. 숫자·표현은 원문 확인 뒤에 쓰세요.
- 표준 라이브러리만 씁니다. 파일 경로는 저장 폴더(기본: 이 스크립트의 한 단계 위) 기준.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# 자동 초안에서 '하루 맥락'으로 먼저 집어 올 브리핑 섹션 이름
CONTEXT_PREFS = ("국제", "국내", "정책·입법", "강원", "지역경제")
# 자동 초안에서 '생각해 볼 문제'로 쓸 항목의 주제 우선순위
QUESTION_TOPIC_PREFS = ("공공기관·예산", "정책·입법", "지방자치", "공공데이터", "지역경제", "교육")


# ---------------------------------------------------------------- helpers
def kst_today():
    return datetime.now(KST).strftime("%Y-%m-%d")


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {} if default is None else default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def clip(text, limit):
    t = re.sub(r"\s+", " ", str(text or "")).strip()
    return t if len(t) <= limit else t[: limit - 1].rstrip() + "…"


def as_lines(value):
    if value is None:
        return []
    seq = value if isinstance(value, (list, tuple)) else str(value).split("\n")
    return [str(v).strip() for v in seq if str(v or "").strip()]


# ---------------------------------------------------------------- auto draft
def narrative_sections(day):
    """hotcho_briefings.json 하루치 narrative 를 '이모지 제목 — 본문' 덩어리로 쪼갭니다."""
    out = []
    for block in str((day or {}).get("narrative") or "").split("\n\n"):
        b = re.sub(r"\s+", " ", block).strip()
        if len(b) < 30:
            continue
        head, _, body = b.partition(" — ")
        out.append((head.strip(), body.strip() or head.strip(), b))
    return out


def auto_context(news, brief, date):
    """[1] 브리핑 섹션 3개 + [2] 오늘 헤드라인 한 줄 → 4줄 골격."""
    day = find_day(brief, date)
    lines, used = [], set()

    sections = narrative_sections(day)
    picked = []
    for want in CONTEXT_PREFS:
        for head, body, whole in sections:
            if want in head and head not in used:
                picked.append((head, body, whole))
                used.add(head)
                break
        if len(picked) >= 3:
            break
    for head, body, whole in picked:
        lines.append(clip(whole, 240))

    cats = (news or {}).get("categories") or {}
    heads = []
    for key, label in (("world", "세계"), ("nation", "전국"), ("gangwon", "강원")):
        items = ((cats.get(key) or {}).get("items") or [])
        if items:
            heads.append(label + ": " + clip(items[0].get("title"), 60))
    if heads:
        lines.append("📰 오늘 헤드라인 — " + " / ".join(heads))
    return lines[:4]


def split_follow(follow):
    """'① ... ② ... ③ ...' 를 낱개 문장으로."""
    parts = [p.strip() for p in re.split(r"[①②③④⑤⑥⑦⑧⑨⑩]", str(follow or "")) if p.strip()]
    return parts


def auto_questions(brief, date, limit=2):
    day = find_day(brief, date)
    items = list((day or {}).get("items") or [])

    def rank(it):
        topic = str(it.get("topic") or "")
        t = QUESTION_TOPIC_PREFS.index(topic) if topic in QUESTION_TOPIC_PREFS else len(QUESTION_TOPIC_PREFS)
        gw = 0 if "강원" in (it.get("tags") or []) else 1
        return (t, gw)

    out = []
    for it in sorted(items, key=rank):
        parts = split_follow(it.get("follow_up"))[:2]
        if not parts:
            continue
        q = "‘" + clip(it.get("title"), 70) + "’ — " + " / ".join(clip(p, 60) for p in parts)
        if q not in out:
            out.append(q)
        if len(out) >= limit:
            break
    return out


def find_day(brief, date):
    for day in (brief or {}).get("days") or []:
        if day.get("date") == date:
            return day
    days = (brief or {}).get("days") or []
    return days[0] if days else None


# ---------------------------------------------------------------- main pieces
def build(args):
    news_path = os.path.join(args.dir, "hotcho_news.json")
    brief_path = os.path.join(args.dir, "hotcho_briefings.json")
    news = load_json(news_path)
    if not news:
        sys.exit("hotcho_news.json 을 읽지 못했습니다: " + news_path)
    brief = load_json(brief_path, {})
    date = args.date or kst_today()
    prev = news.get("daily_brief") or {}

    if args.context or args.question:
        context = args.context or (as_lines(prev.get("context")) if prev.get("date") == date else [])
        questions = args.question or (as_lines(prev.get("questions")) if prev.get("date") == date else [])
    elif args.brief_json:
        src = load_json(args.brief_json)
        if not src:
            sys.exit("브리핑 JSON 을 읽지 못했습니다: " + args.brief_json)
        context = as_lines(src.get("context"))
        questions = as_lines(src.get("questions") or src.get("question"))
        date = str(src.get("date") or date)[:10]
    elif args.auto:
        context = auto_context(news, brief, date)
        questions = auto_questions(brief, date)
    else:
        show(news)
        return

    if not context and not questions:
        sys.exit("넣을 내용이 비어 있습니다 (--context/--question/--auto/--brief-json 확인)")

    daily = {"date": date, "context": context, "questions": questions}
    if args.dry_run:
        print("[dry-run] hotcho_news.json 에 이렇게 들어갑니다 ↓")
        print(json.dumps(daily, ensure_ascii=False, indent=1))
        return

    out = {"updated": news.get("updated")}
    out["daily_brief"] = daily
    for k, v in news.items():
        if k in ("updated", "daily_brief"):
            continue
        out[k] = v
    save_json(news_path, out)
    print("저장: %s  (%s · 맥락 %d줄 · 질문 %d개)" % (news_path, date, len(context), len(questions)))


def show(news):
    daily = (news or {}).get("daily_brief")
    if not daily:
        print("daily_brief 가 아직 없습니다 — --auto 로 초안을 만들거나 --context/--question 으로 넣으세요.")
        return
    print(json.dumps(daily, ensure_ascii=False, indent=1))


def main():
    ap = argparse.ArgumentParser(description="hotcho_news.json 의 📌 오늘의 뉴스 브리핑(daily_brief) 생성·교체")
    ap.add_argument("--dir", default=ROOT, help="저장 폴더 (기본: 저장소 루트)")
    ap.add_argument("--date", help="브리핑 날짜 YYYY-MM-DD (기본: 오늘 KST)")
    ap.add_argument("--auto", action="store_true", help="수집 뉴스·브리핑으로 초안 자동 작성")
    ap.add_argument("--context", action="append", help="하루 맥락 한 줄 (여러 번 줄 수 있음)")
    ap.add_argument("--question", action="append", help="생각해 볼 문제 (여러 번 줄 수 있음)")
    ap.add_argument("--brief-json", help="{'date','context','questions'} JSON 파일로 통째 교체")
    ap.add_argument("--show", action="store_true", help="지금 들어 있는 daily_brief 출력")
    ap.add_argument("--dry-run", action="store_true", help="저장하지 않고 결과만 출력")
    args = ap.parse_args()
    args.dir = os.path.abspath(args.dir)

    if args.show:
        show(load_json(os.path.join(args.dir, "hotcho_news.json")))
        return
    build(args)


if __name__ == "__main__":
    main()

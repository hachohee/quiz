#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
뿌듯핫초 · 취재기자 업무 허브 데이터 수집기

1) 실시간 주요뉴스 헤드라인  → `hotcho_news.json`
   - 세계 / 전국 / 강원 세 갈래를 **공개 RSS(Google 뉴스)** 에서 받아 옵니다. API 키 없음.
   - 카테고리마다 최신 10건: 제목 · 언론사 · 시각 · 링크.
2) 카르텔워치 요약            → `hotcho_hub.json`
   - 카르텔워치 공개 데이터(수집 건수 · 총액 · 이상징후 · 최근 이상징후 3건)만 담습니다.

    python3 scripts/update_hotcho_hub.py [저장폴더]

- 표준 라이브러리만 씁니다(추가 설치·비용 없음).
- 한 갈래가 실패해도 그 갈래의 **이전 데이터를 그대로 살립니다**(빈 화면이 나오지 않게).
- 화면(hotcho_modes.js)은 이 JSON을 그대로 읽어 그립니다.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

KST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (compatible; hotcho-hub/1.0; +https://hachohee.github.io/quiz/)"
PER_CATEGORY = 10

FEEDS = {
    "world": {
        "label": "세계",
        "url": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko",
    },
    "nation": {
        "label": "전국",
        "url": "https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko",
    },
    "gangwon": {
        "label": "강원",
        # 강원 전역 + 춘천(우리 동네)을 함께 훑습니다. 최근 2일 안에서만.
        "url": ("https://news.google.com/rss/search?"
                "q=%EA%B0%95%EC%9B%90%EB%8F%84+OR+%EA%B0%95%EC%9B%90%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84"
                "+OR+%EC%B6%98%EC%B2%9C+OR+%EC%9B%90%EC%A3%BC+OR+%EA%B0%95%EB%A6%89"
                "&hl=ko&gl=KR&ceid=KR:ko&when=2d"),
    },
}

CARTEL_BASE = "https://hachohee.github.io/cartelwatch/"
CARTEL_DATA = CARTEL_BASE + "data/"
SEVERITY_RANK = {"상": 0, "중": 1, "하": 2}


# ---------------------------------------------------------------- helpers
def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/json,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def kst_now():
    return datetime.now(KST)


def clean_title(title, source):
    """Google 뉴스 검색 RSS는 제목 끝에 ' - 언론사'를 붙여 줍니다. 떼어 냅니다."""
    t = (title or "").strip()
    for suffix in (" - " + (source or ""), " - " + (source or "").replace(" ", "")):
        if source and t.endswith(suffix):
            t = t[: -len(suffix)]
            break
    t = re.sub(r"\s+", " ", t).strip()
    return t


def parse_items(xml_bytes):
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    if channel is None:
        return []
    out = []
    for it in channel.findall("item"):
        source_el = it.find("source")
        source = (source_el.text or "").strip() if source_el is not None else ""
        title = clean_title(it.findtext("title"), source)
        link = (it.findtext("link") or "").strip()
        pub = it.findtext("pubDate")
        try:
            dt = parsedate_to_datetime(pub).astimezone(KST) if pub else kst_now()
        except Exception:
            dt = kst_now()
        if not title or not link:
            continue
        out.append({
            "title": title,
            "source": source or "뉴스",
            "when": dt.strftime("%m/%d %H:%M"),
            "ts": dt.isoformat(timespec="minutes"),
            "link": link,
        })
    out.sort(key=lambda x: x["ts"], reverse=True)
    seen, uniq = set(), []
    for item in out:
        key = re.sub(r"[^0-9a-zA-Z가-힣]", "", item["title"])[:60]
        if key in seen:
            continue
        seen.add(key)
        uniq.append(item)
    return uniq[:PER_CATEGORY]


# ---------------------------------------------------------------- news
def build_news(prev):
    categories = {}
    prev_cats = (prev or {}).get("categories") or {}
    for key, meta in FEEDS.items():
        try:
            items = parse_items(fetch(meta["url"]))
        except Exception as exc:  # noqa: BLE001 — 한 갈래 실패는 치명적이지 않습니다.
            print(f"[warn] {meta['label']} RSS 실패: {exc}", file=sys.stderr)
            items = []
        if items:
            categories[key] = {"label": meta["label"], "items": items}
            print(f"[ok] {meta['label']} {len(items)}건")
        elif prev_cats.get(key, {}).get("items"):
            categories[key] = prev_cats[key]
            print(f"[keep] {meta['label']} 이전 데이터 유지")
        else:
            categories[key] = {"label": meta["label"], "items": []}
    return {"updated": kst_now().strftime("%Y-%m-%d %H:%M"), "categories": categories}


# ---------------------------------------------------------------- cartelwatch
def build_cartel(prev_hub):
    try:
        meta = json.loads(fetch(CARTEL_DATA + "meta.json"))
        anomalies = json.loads(fetch(CARTEL_DATA + "anomalies.json"))
        contracts = json.loads(fetch(CARTEL_DATA + "contracts.json"))
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] 카르텔워치 데이터 실패: {exc}", file=sys.stderr)
        if prev_hub.get("cartelwatch"):
            return prev_hub["cartelwatch"]
        return {}

    rows = contracts.get("contracts") or []
    total_amount = sum(int(c.get("amount") or 0) for c in rows)
    collected = int(contracts.get("total") or meta.get("total") or len(rows))
    alist = anomalies.get("anomalies") or []
    alist_sorted = sorted(
        alist,
        key=lambda a: (SEVERITY_RANK.get(a.get("severity"), 9), -int(a.get("amount") or 0)),
    )
    recent = []
    for a in alist_sorted[:3]:
        url = ""
        for c in (a.get("contracts") or []):
            if c.get("detail_url"):
                url = c["detail_url"]
                break
        recent.append({
            "type_label": a.get("type_label") or a.get("type") or "이상징후",
            "severity": a.get("severity") or "",
            "agency": a.get("agency") or "",
            "title": a.get("title") or "",
            "summary": a.get("summary") or "",
            "amount": int(a.get("amount") or 0),
            "url": url,
        })

    return {
        "updated": (anomalies.get("generated_at") or meta.get("generated_at") or "")[:16].replace("T", " "),
        "collected": collected,
        "total_amount": total_amount,
        "period": (meta.get("period") or {}),
        "anomaly_count": int((anomalies.get("summary") or {}).get("total") or len(alist)),
        "by_type": (anomalies.get("summary") or {}).get("by_type") or {},
        "recent": recent,
        "url": CARTEL_BASE,
    }


# ---------------------------------------------------------------- main
def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
    out_dir = os.path.abspath(out_dir)
    news_path = os.path.join(out_dir, "hotcho_news.json")
    hub_path = os.path.join(out_dir, "hotcho_hub.json")

    news = build_news(load_json(news_path, {}))
    save_json(news_path, news)
    print(f"저장: {news_path}")

    hub = load_json(hub_path, {})
    cartel = build_cartel(hub)
    hub_out = dict(hub)
    hub_out["updated"] = news["updated"]
    if cartel:
        hub_out["cartelwatch"] = cartel
    save_json(hub_path, hub_out)
    print(f"저장: {hub_path}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
뿌듯핫초 · 언론·정책 모니터 수집기  →  `hotcho_monitor.json`

정부·국회·통계·언론의 **공식 공개 출처**만 읽어서, 취재에 바로 쓸 수 있는
'오늘 바뀐 것' 목록을 한 파일로 모읍니다. API 키·유료 결제 없이 표준 라이브러리만 씁니다.

  갈래        출처                                  방식
  ---------------------------------------------------------------------------------
  정책·부처    대한민국 정책브리핑(korea.kr) 보도자료    게시판 HTML
  통계        국가데이터처(mods.go.kr) 보도자료        게시판 HTML (ref_bid로 소속 게시판 묶음)
  입법        국민참여입법센터 입법예고                게시판 HTML
  국회        열린국회정보 발의법률안                  Open API (**환경변수 ASSEMBLY_API_KEY 있을 때만**)
  강원언론     강원도민일보 RSS
  전국언론     연합뉴스 · 조선일보 · 동아일보 RSS

- 한 출처가 실패해도 그 출처의 **이전 항목을 그대로 살립니다**(빈 화면 방지).
- 새로 받은 항목은 이전 파일과 URL 기준으로 합쳐서 `WINDOW_DAYS`일치를 남깁니다(최대 MAX_ITEMS).
- 키워드 태그는 기본 감시어(`DEFAULT_KEYWORDS`)로 붙입니다. 사용자가 앱에서 직접 넣은
  키워드는 브라우저(localStorage)가 따로 계산하므로 여기서는 건드리지 않습니다.

    python3 scripts/update_hotcho_monitor.py [저장폴더]
"""

import json
import os
import re
import sys
import hashlib
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import time

KST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (compatible; hotcho-monitor/1.0; +https://hachohee.github.io/quiz/)"
WINDOW_DAYS = 10          # 이 기간 안의 항목만 남깁니다
MAX_ITEMS = 400           # 파일이 너무 커지지 않게
PER_FEED = 25             # 언론사 RSS 한 곳에서 담는 최대 건수
TIMEOUT = 25

# 취재 기본 감시어 — 앱에서 지우거나 더할 수 있습니다(브라우저 저장).
DEFAULT_KEYWORDS = [
    "교육", "예산", "조달", "수의계약", "지방재정", "감사",
    "강원", "춘천", "의혹", "특혜", "공공기관", "통계", "물가", "고용",
]

KINDS = {
    "press":    {"label": "정책·부처", "emoji": "🏛"},
    "mods":     {"label": "통계",     "emoji": "📊"},
    "law":      {"label": "입법",     "emoji": "⚖️"},
    "assembly": {"label": "국회",     "emoji": "🗳"},
    "local":    {"label": "지자체",   "emoji": "🏢"},
    "gangwon":  {"label": "강원언론",  "emoji": "🗞"},
    "nation":   {"label": "전국언론",  "emoji": "📰"},
}

TAG_RE = re.compile(r"<[^>]+>")
ENTITIES = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
    "&middot;": "·", "&hellip;": "…", "&nbsp;": " ", "&ldquo;": "“", "&rdquo;": "”",
    "&lsquo;": "‘", "&rsquo;": "’", "&copy;": "©",
}


# ---------------------------------------------------------------- helpers
def fetch(url, timeout=TIMEOUT):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/rss+xml, application/xml, application/json, text/html;q=0.9, */*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9",
        },
    )
    last = None
    # 언론사 서버가 가끔 첫 연결을 끊습니다(SSL EOF). 한 번은 다시 시도합니다.
    for _ in range(2):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5)
    raise last


def fetch_text(url, encoding="utf-8"):
    raw = fetch(url)
    for enc in (encoding, "utf-8", "cp949"):
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode("utf-8", "replace")


def unescape(s):
    s = s or ""
    for k, v in ENTITIES.items():
        s = s.replace(k, v)
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    return s


def strip_tags(s):
    return unescape(TAG_RE.sub(" ", s or ""))


def clean(s, limit=None):
    s = re.sub(r"\s+", " ", strip_tags(s)).strip()
    return s[:limit] if limit else s


def kst_now():
    return datetime.now(KST)


def to_iso_date(text):
    """'2026.11.24' / '2026. 11. 24.' / '2026-11-24' → '2026-11-24'"""
    m = re.search(r"(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})", text or "")
    if not m:
        return ""
    y, mo, d = m.groups()
    return "%s-%02d-%02d" % (y, int(mo), int(d))


def item_id(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def make_item(kind, source, title, url, date="", org="", field="", status="", summary="", extra=None):
    tags = [k for k in DEFAULT_KEYWORDS if k in (title or "")]
    it = {
        "id": item_id(url),
        "kind": kind,
        "source": source,
        "title": clean(title),
        "url": url,
        "date": date,
        "org": org,
        "field": field,
        "status": status,
        "summary": clean(summary, 220),
        "tags": tags,
    }
    if extra:
        it.update(extra)
    return it


def within_window(item):
    d = item.get("date") or ""
    if not d:
        return True
    try:
        day = datetime.strptime(d[:10], "%Y-%m-%d").replace(tzinfo=KST)
    except Exception:
        return True
    return (kst_now() - day).days <= WINDOW_DAYS


# ---------------------------------------------------------------- 정책브리핑 (korea.kr)
def collect_press():
    out = []
    for page in (1, 2):
        html = fetch_text("https://www.korea.kr/briefing/pressReleaseList.do?pageIndex=%d" % page)
        for m in re.finditer(
            r'<a href="(/briefing/pressReleaseView\.do\?newsId=(\d+)[^"]*)">(.*?)</a>', html, re.S
        ):
            path, news_id, body = m.group(1), m.group(2), m.group(3)
            t = re.search(r"<strong>(.*?)</strong>", body, re.S)
            if not t:
                continue
            title = clean(t.group(1))
            if not title:
                continue
            lead = ""
            lm = re.search(r'<span class="lead">(.*?)</span>\s*<span class="source"', body, re.S)
            if lm:
                lead = clean(lm.group(1))
            date = ""
            org = ""
            pos = body.find('class="source"')
            if pos >= 0:
                spans = [clean(x, 60) for x in re.findall(r"<span>([^<]*)</span>", body[pos:])]
                if spans:
                    date = to_iso_date(spans[0])
                if len(spans) > 1:
                    org = spans[1]
            url = "https://www.korea.kr/briefing/pressReleaseView.do?newsId=" + news_id
            out.append(make_item(
                "press",
                "정책브리핑" + ("·" + org if org else ""),
                title, url, date=date, org=org, summary=lead,
            ))
        if len(out) >= 24:
            break
    return out[:40]


# ---------------------------------------------------------------- 국가데이터처 (mods.go.kr)
MODS_URL = (
    "https://mods.go.kr/board.es?mid=a10301010000&bid=a103010100&ref_bid="
    "203,204,205,206,207,210,211,11109,11113,11814,213,215,214,11860,11695,216,218,219,220,"
    "10820,11815,11895,11816,208,245,222,223,225,226,227,228,229,230,11321,232,233,234,12029,"
    "10920,11469,11470,11817,236,237,11471,238,240,241,11865,243,244,11893,11898,12031,11825,"
    "246,0067,0073,0079,0084"
)


def collect_mods():
    html = fetch_text(MODS_URL)
    out = []
    chunks = html.split('<a class="board_link" href="javascript:addSearchParam(')
    for chunk in chunks[1:]:
        um = re.match(r"'\s*(/board\.es\?[^']+)'", chunk)
        if not um:
            continue
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(unescape(um.group(1))).query)
        bid = (qs.get("bid") or [""])[0]
        list_no = (qs.get("list_no") or [""])[0]
        if not bid or not list_no:
            continue
        dm = re.search(r"게시일</strong><span>([\d-]+)</span>", chunk)
        if not dm:
            continue
        date = to_iso_date(dm.group(1))
        head = chunk[chunk.find(">") + 1:].split("게시일")[0]
        head = re.sub(r"<!--.*?-->", " ", head, flags=re.S)
        lines = [clean(x) for x in TAG_RE.sub("\n", head).split("\n")]
        lines = [x for x in lines if x]
        title = max(lines, key=len) if lines else ""
        if not title:
            continue
        url = "https://mods.go.kr/board.es?mid=a10301010000&bid=%s&act=view&list_no=%s" % (bid, list_no)
        out.append(make_item("mods", "국가데이터처", title, url, date=date,
                             org="국가데이터처", field="통계"))
    return out[:20]


# ---------------------------------------------------------------- 입법예고 (opinion.lawmaking.go.kr)
def collect_law():
    html = fetch_text("https://opinion.lawmaking.go.kr/gcom/ogLmPp")
    out = []
    for m in re.finditer(
        r'<td data-th="법령 제명" class="subject">(.*?)</td>\s*'
        r'<td data-th="소관부처 \(법령종류\)">(.*?)</td>\s*'
        r'<td data-th="법령분야 \(주요적용대상\)">(.*?)</td>\s*'
        r'<td data-th="입법의견 접수기간">(.*?)</td>\s*'
        r'<td data-th="입법의견 남은 기간">(.*?)</td>',
        html, re.S,
    ):
        body, org_html, field_html, period_html, left_html = m.groups()
        am = re.search(r'<a href="/gcom/ogLmPp/(\d+)"[^>]*>(.*?)</a>', body, re.S)
        if not am:
            continue
        law_id, title = am.group(1), clean(am.group(2))
        if not title:
            continue
        orgs = [clean(x) for x in re.findall(r"<p>(.*?)</p>", org_html, re.S)]
        org = orgs[0] if orgs else ""
        law_type = orgs[1] if len(orgs) > 1 else ""
        fields = [clean(x) for x in re.findall(r"<p>(.*?)</p>", field_html, re.S)]
        dates = re.findall(r"<p>(.*?)</p>", period_html, re.S)
        start = to_iso_date(clean(dates[0])) if dates else ""
        end = to_iso_date(clean(dates[1])) if len(dates) > 1 else ""
        left = clean(left_html)
        status = ("의견 마감 " + left) if left and re.search(r"\d", left) else ""
        summary = " · ".join(x for x in ["입법예고", org + (" " + law_type if law_type else ""),
                                        (fields[0] if fields else ""),
                                        ("접수 " + start + "~" + end if start and end else "")] if x)
        out.append(make_item(
            "law", "입법예고", title,
            "https://opinion.lawmaking.go.kr/gcom/ogLmPp/" + law_id,
            date=start, org=org, field=(fields[0] if fields else ""),
            status=status, summary=summary,
            extra={"period": {"from": start, "to": end}, "lawType": law_type, "due": end},
        ))
    return out[:20]


# ---------------------------------------------------------------- 춘천시 보도자료 (chuncheon.go.kr)
CHUNCHEON_URL = "https://www.chuncheon.go.kr/mayor/newsroom/press-release/"


def collect_chuncheon(page=1):
    url = CHUNCHEON_URL if page == 1 else CHUNCHEON_URL + "?pageIndex=%d" % page
    html = fetch_text(url)
    out = []
    for m in re.finditer(r'<li class="news-box[^"]*">\s*<a href="([^"]*nttId=\d+[^"]*)"[^>]*>(.*?)</a>', html, re.S):
        href_raw, block = m.group(1), m.group(2)
        tm = re.search(r"<p>(.*?)</p>", block, re.S)
        if not tm:
            continue
        title = clean(tm.group(1))
        if not title:
            continue
        infos = [clean(x) for x in re.findall(r"<li>(.*?)</li>", block, re.S)]
        date = next((to_iso_date(x) for x in infos if re.search(r"\d{4}-\d{2}-\d{2}", x)), "")
        dept = infos[0] if infos and not re.search(r"\d{4}-\d{2}-\d{2}", infos[0]) else ""
        body = ""
        bm = re.search(r"</ul>\s*<span>(.*?)</span>", block, re.S)
        if bm:
            body = clean(bm.group(1))
        href = unescape(href_raw)
        if href.startswith("/"):
            href = "https://www.chuncheon.go.kr" + href
        out.append(make_item("local", "춘천시 보도자료", title, href, date=date,
                             org=dept, field="지자체", summary=body))
    return out


def collect_chuncheon_all():
    out = collect_chuncheon(1)
    try:
        out += collect_chuncheon(2)
    except Exception:  # noqa: BLE001 — 2페이지는 없어도 됩니다
        pass
    return out[:16]


# ---------------------------------------------------------------- 국회 발의법률안 (Open API, 키 있을 때만)
def collect_assembly():
    key = os.environ.get("ASSEMBLY_API_KEY", "").strip()
    if not key:
        raise RuntimeError("ASSEMBLY_API_KEY 없음 — 국회 발의법안은 건너뜁니다")
    url = (
        "https://open.assembly.go.kr/portal/openapi/nzmimeepazxkubdpn"
        "?KEY=%s&Type=json&pIndex=1&pSize=60&AGE=22" % urllib.parse.quote(key)
    )
    data = json.loads(fetch_text(url))
    rows = []
    for k, v in (data or {}).items():
        for section in (v if isinstance(v, list) else [v]):
            if isinstance(section, dict) and isinstance(section.get("row"), list):
                rows = section["row"]
                break
        if rows:
            break
    out = []
    for r in rows:
        title = (r.get("BILL_NAME") or "").strip()
        link = (r.get("DETAIL_LINK") or "").strip()
        if not title or not link:
            continue
        org = r.get("COMMITTEE") or ""
        proposer = r.get("RST_PROPOSER") or ""
        out.append(make_item(
            "assembly", "국회 발의법안", title, link,
            date=to_iso_date(r.get("PROPOSE_DT") or ""), org=org, field="법률안",
            summary=" · ".join(x for x in [org, ("대표발의: " + proposer) if proposer else ""] if x),
        ))
    return out[:30]


# ---------------------------------------------------------------- RSS (언론)
RSS_FEEDS = [
    {"key": "kado", "label": "강원도민일보", "kind": "gangwon",
     "url": "https://www.kado.net/rss/allArticle.xml"},
    {"key": "yna", "label": "연합뉴스", "kind": "nation",
     "url": "https://www.yna.co.kr/rss/news.xml"},
    {"key": "chosun", "label": "조선일보", "kind": "nation",
     "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml"},
    {"key": "donga", "label": "동아일보", "kind": "nation",
     "url": "https://rss.donga.com/total.xml"},
]

BARE_SEGMENT = re.compile(r"^\[[^\]]+\]$")


def parse_rss(xml_bytes):
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    if channel is None:
        return []
    out = []
    for it in channel.findall("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        desc = clean(it.findtext("description") or "", 220)
        pub = it.findtext("pubDate")
        if not title or not link:
            continue
        if BARE_SEGMENT.match(title):
            continue
        try:
            dt = parsedate_to_datetime(pub).astimezone(KST) if pub else kst_now()
        except Exception:
            dt = kst_now()
        out.append({"title": unescape(title), "link": link, "desc": desc, "dt": dt})
    return out


def collect_feed(feed):
    out = []
    for a in parse_rss(fetch(feed["url"])):
        if (kst_now() - a["dt"]).days > WINDOW_DAYS:
            continue
        out.append(make_item(
            feed["kind"], feed["label"], a["title"], a["link"],
            date=a["dt"].strftime("%Y-%m-%d"), org=feed["label"],
            summary=a["desc"], extra={"time": a["dt"].strftime("%H:%M")},
        ))
    return out[:PER_FEED]


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


def dedupe(items):
    seen, out = set(), []
    for it in items:
        key = it.get("url") or it.get("id") or it.get("title")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    out.sort(key=lambda x: (x.get("date") or "", x.get("time") or ""), reverse=True)
    return out


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
    out_dir = os.path.abspath(out_dir)
    path = os.path.join(out_dir, "hotcho_monitor.json")

    prev = load_json(path, {})
    prev_items = prev.get("items") or []

    jobs = [
        ("press", "정책브리핑", collect_press),
        ("mods", "국가데이터처", collect_mods),
        ("law", "입법예고", collect_law),
        ("chuncheon", "춘천시 보도자료", collect_chuncheon_all),
        ("assembly", "국회 발의법안", collect_assembly),
    ]
    jobs += [(f["key"], f["label"], (lambda ff=f: collect_feed(ff))) for f in RSS_FEEDS]

    fresh, sources = [], []
    for key, label, fn in jobs:
        kind = next((f["kind"] for f in RSS_FEEDS if f["key"] == key), key)
        try:
            items = fn()
            fresh.extend(items)
            sources.append({
                "key": key, "label": label, "kind": kind,
                "ok": True, "count": len(items),
                "note": "" if items else "새 항목 없음(이전 항목 유지)",
            })
            print("[ok] %s %d건" % (label, len(items)))
        except Exception as exc:  # noqa: BLE001 — 한 출처 실패는 치명적이지 않습니다
            kept = [x for x in prev_items if x.get("kind") == kind]
            msg = str(exc)[:120]
            sources.append({
                "key": key, "label": label, "kind": kind, "ok": False,
                "count": len(kept), "note": msg,
            })
            print("[warn] %s 실패: %s (이전 %d건 유지)" % (label, msg, len(kept)), file=sys.stderr)

    # 이번에 실패한 출처는 이전 항목을 그대로 살립니다.
    failed_kinds = {s["kind"] for s in sources if not s["ok"]}
    kept = [x for x in prev_items if x.get("kind") in failed_kinds]

    items = dedupe([x for x in fresh if within_window(x)] + [x for x in kept if within_window(x)])
    items = items[:MAX_ITEMS]

    counts = {}
    for it in items:
        counts[it["kind"]] = counts.get(it["kind"], 0) + 1

    data = {
        "updated": kst_now().strftime("%Y-%m-%d %H:%M"),
        "window_days": WINDOW_DAYS,
        "keywords": DEFAULT_KEYWORDS,
        "kinds": {k: v for k, v in KINDS.items()},
        "sources": sources,
        "counts": counts,
        "total": len(items),
        "items": items,
        "disclaimer": "공개 출처 원문 제목·요약만 모은 목록입니다. 보도·판단 전 원문 사실관계 확인이 필요합니다.",
    }
    save_json(path, data)
    print("저장: %s (항목 %d건 / 갈래 %s)" % (path, len(items), counts))


if __name__ == "__main__":
    main()

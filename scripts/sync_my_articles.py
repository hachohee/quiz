#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""🎬 내 기사 아카이브 동기화 — 노션 보도 목록 ↔ my_articles.json(앱)

복직 후에 새 기사가 나오면, 노션 DB('하초희 기자 보도 목록')에 한 줄 추가하고
이 스크립트를 돌리면 앱의 [🎬 내 기사] 탭에 그대로 쌓입니다.

    python3 scripts/sync_my_articles.py            # 노션 → 앱 (my_articles.json 갱신)
    python3 scripts/sync_my_articles.py --dry-run  # 무엇이 바뀔지만 확인
    python3 scripts/sync_my_articles.py --push     # 갱신 + git 커밋·푸시(깃허브 페이지 반영)

    # 노션에 새 기사 한 줄 넣고 바로 동기화
    python3 scripts/sync_my_articles.py --add \
        --title "○○군 교육예산 30% 삭감…왜?" --date 2027-03-02 --cat 교육 \
        --url "https://news.kbs.co.kr/news/view.do?ncd=0000000"

    # 폰에서 [⚙️ 백업] 파일이나 내 기사 목록을 받아 노션에 올리기
    python3 scripts/sync_my_articles.py --from-phone 핫초-백업-20270302.json

규칙
- 노션에서 읽은 행은 제목·방송일자·분류·링크·재방송횟수만 씁니다(공개 기사 정보만).
- my_articles.json 에만 있는 기사(아카이브 페이지에서 옮긴 299편, 폰에서 추가한 것)는
  지우지 않고 그대로 둡니다 — 합집합으로 쌓입니다.
- 같은 기사는 '방송일자 + 제목(공백·문장부호 무시)'으로 판별합니다.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "my_articles.json")

DATA_SOURCE = "2b1d3b2b-fb2b-468d-a3c7-feec8c725b46"  # 노션 '하초희 기자 보도 목록 (2022~2026)'
CAT_ORDER = ["교육", "지방자치행정", "지역경제", "의료보건", "사회안전",
             "날씨재난", "환경재해", "문화축제", "정치선거", "기타"]
CAT_MAP = {
    "교육": "교육", "교육행정": "교육",
    "의료": "의료보건", "보건": "의료보건",
    "지역행정": "지방자치행정", "행정": "지방자치행정", "지역정책": "지방자치행정",
    "지역기관": "지방자치행정", "지역규제": "지방자치행정", "지역재정": "지방자치행정",
    "지역경제": "지역경제", "지역산업": "지역경제", "농업": "지역경제", "농축산": "지역경제",
    "고용": "지역경제", "지역개발": "지역경제", "기업": "지역경제", "지역인프라": "지역경제",
    "노동": "지역경제",
    "문화": "문화축제", "문화재": "문화축제", "축제": "문화축제", "지역문화": "문화축제",
    "스포츠": "문화축제", "레저": "문화축제", "지역문화갈등": "문화축제",
    "날씨": "날씨재난", "재난": "날씨재난", "기후": "날씨재난",
    "정치": "정치선거", "선거": "정치선거", "지역정치": "정치선거", "선거후속": "정치선거",
    "사건사고": "사회안전", "안전": "사회안전", "교통": "사회안전", "지역교통": "사회안전",
    "사법": "사회안전",
    "환경": "환경재해",
    "복지": "기타", "사회": "기타",
}


def canon(label):
    label = (label or "").replace("\\", "").strip()
    base = re.sub(r"\(.*?\)", "", label)
    for tok in re.split(r"[/·,]", base):
        tok = tok.strip()
        if tok in CAT_MAP:
            return CAT_MAP[tok]
        if tok in CAT_ORDER:
            return tok
    return "기타"


def norm(title):
    return re.sub(r"[^0-9a-z가-힣]", "", (title or "").lower())


def key(item):
    return (item.get("date") or "", norm(item.get("title")))


def run_notion(args):
    """notion CLI 를 부르고 JSON 엔벨로프를 돌려준다(큰 결과는 saved_to 파일에서)."""
    p = subprocess.run(["notion"] + args, capture_output=True, text=True)
    out = re.sub(r"<<<[^>]*>>>", "", p.stdout or "")
    i = out.find('{"ok"')
    if i < 0:
        raise SystemExit("노션 응답을 읽지 못했어요:\n" + (p.stderr or out)[:500])
    env = json.loads(out[i:])
    if not env.get("ok"):
        raise SystemExit("노션 오류: %s" % json.dumps(env, ensure_ascii=False)[:500])
    return env["data"]


def find_saved(path):
    """notion CLI 가 알려준 saved_to 경로(워크스페이스 기준 상대경로)를 실제 파일로 찾는다."""
    if os.path.isabs(path) and os.path.exists(path):
        return path
    d = ROOT
    for _ in range(4):
        p = os.path.join(d, path)
        if os.path.exists(p):
            return p
        d = os.path.dirname(d)
    p = os.path.join(os.getcwd(), path)
    if os.path.exists(p):
        return p
    raise SystemExit("노션 결과 파일을 찾지 못했어요: " + path)


def fetch_notion_rows():
    rows, cursor, page = [], None, 0
    while True:
        args = ["data-sources", "query", DATA_SOURCE, "--limit", "100"]
        if cursor:
            args += ["--cursor", cursor]
        data = run_notion(args)
        res = data.get("results")
        if isinstance(res, dict) and res.get("omitted"):
            saved = data.get("saved_to")
            full = json.load(open(find_saved(saved), encoding="utf-8"))
            res = full["data"]["results"]
        rows += res
        page += 1
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return rows


def row_to_item(r):
    p = r.get("properties") or {}
    t = p.get("제목")
    if isinstance(t, dict):
        title = "".join(x.get("plain_text", "") for x in (t.get("title") or []))
    else:
        title = t or ""
    dt = (p.get("방송일자") or {}).get("start") if isinstance(p.get("방송일자"), dict) else None
    item = {
        "date": dt,
        "title": title.strip(),
        "cat": canon(p.get("분류")),
        "url": (p.get("링크") or "").strip(),
    }
    if p.get("재방송횟수"):
        item["rerun"] = p["재방송횟수"]
    return item


def load_doc():
    if not os.path.exists(OUT):
        return {"app": "hotcho-my-articles", "version": 1, "items": []}
    with open(OUT, encoding="utf-8") as f:
        return json.load(f)


def rebuild_meta(doc):
    items = [i for i in doc["items"] if i.get("date") and i.get("title")]
    items.sort(key=lambda x: (x["date"], x["title"]), reverse=True)
    doc["items"] = items
    years, cats = {}, {}
    for i in items:
        y = i["date"][:4]
        years[y] = years.get(y, 0) + 1
        cats[i["cat"]] = cats.get(i["cat"], 0) + 1
    doc["version"] = 1
    doc["updated"] = date.today().isoformat()
    doc["total"] = len(items)
    doc["range"] = [items[-1]["date"], items[0]["date"]] if items else []
    doc["years"] = [{"y": int(y), "n": n} for y, n in sorted(years.items())]
    doc["cats"] = [{"k": k, "n": cats[k]} for k in CAT_ORDER if cats.get(k)]
    return doc


def notion_add(item):
    props = {
        "방송일자": item["date"],
        "분류": item["cat"],
    }
    if item.get("url"):
        props["링크"] = item["url"]
    print("노션에 추가:", item["date"], item["title"])
    run_notion([
        "pages", "create", "--parent-data-source", DATA_SOURCE,
        "--title", item["title"],
        "--set", json.dumps(props, ensure_ascii=False),
        "--allow-new-options",
        "--write-request-summary",
        "복직 후 새 보도 기사를 '하초희 기자 보도 목록'에 한 줄 추가(내 기사 아카이브 누적)",
    ])


def from_phone(path, dry_run=False):
    """폰 백업/내 기사 목록에서 기사를 꺼내 노션에 올린다(이미 있는 건 건너뜀)."""
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    mine = []
    if isinstance(raw, list):
        mine = raw
    elif isinstance(raw, dict):
        if isinstance(raw.get("items"), list) and (not raw["items"] or "date" in raw["items"][0]):
            mine = raw["items"]
        store = raw.get("store") or {}
        for k, v in store.items():
            if k == "hotcho_my_articles_v1":
                try:
                    mine += json.loads(v)
                except Exception:
                    pass
    if not mine:
        raise SystemExit("파일에서 내 기사 목록을 찾지 못했어요: " + path)
    have = {key(i) for i in load_doc()["items"]}
    added = 0
    for m in mine:
        it = {
            "date": m.get("date") or "",
            "title": (m.get("title") or "").strip(),
            "cat": canon(m.get("cat")),
            "url": (m.get("url") or "").strip(),
        }
        if not it["date"] or not it["title"]:
            continue
        if key(it) in have:
            continue
        if dry_run:
            print("[dry-run] 노션에 올릴 기사:", it["date"], it["title"])
        else:
            notion_add(it)
        have.add(key(it))
        added += 1
    print("새로 올린 기사:", added, "편")


def git_push():
    def g(*a):
        return subprocess.run(["git"] + list(a), cwd=ROOT, capture_output=True, text=True)
    g("add", "my_articles.json")
    if g("diff", "--cached", "--quiet").returncode == 0:
        print("바뀐 내용이 없어 커밋하지 않아요.")
        return
    today = date.today().strftime("%Y-%m-%d")
    g("commit", "-m", "🎬 내 기사 아카이브 갱신 (%s)" % today)
    r = g("push")
    print("푸시:", "완료" if r.returncode == 0 else (r.stderr or r.stdout)[:300])


def main():
    ap = argparse.ArgumentParser(description="🎬 내 기사 아카이브 동기화 (노션 → 앱)")
    ap.add_argument("--add", action="store_true", help="노션에 새 기사 한 줄 추가")
    ap.add_argument("--title")
    ap.add_argument("--date")
    ap.add_argument("--cat", default="기타")
    ap.add_argument("--url", default="")
    ap.add_argument("--from-phone", metavar="파일", help="폰 백업/내 기사 JSON → 노션")
    ap.add_argument("--push", action="store_true", help="갱신 뒤 git 커밋·푸시")
    ap.add_argument("--dry-run", action="store_true", help="바뀔 내용만 확인")
    a = ap.parse_args()

    if a.from_phone:
        from_phone(a.from_phone, a.dry_run)
    if a.add:
        if not a.title or not a.date:
            raise SystemExit("--add 에는 --title 과 --date 가 필요해요")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", a.date):
            raise SystemExit("--date 는 2027-03-02 형식으로 주세요")
        item = {"title": a.title.strip(), "date": a.date, "cat": canon(a.cat), "url": a.url.strip()}
        if a.dry_run:
            print("[dry-run] 노션에 추가할 기사:", item["date"], item["title"], "·", item["cat"])
        else:
            notion_add(item)

    doc = load_doc()
    before = len(doc["items"])
    merged = {key(i): i for i in doc["items"]}
    rows = fetch_notion_rows()
    new = 0
    for r in rows:
        it = row_to_item(r)
        if not it["date"] or not it["title"]:
            continue
        k = key(it)
        if k in merged:
            merged[k].update({kk: vv for kk, vv in it.items() if vv})
        else:
            merged[k] = it
            new += 1
    doc["items"] = list(merged.values())
    doc["source"] = ("노션 '하초희 기자 보도 목록 (2022~2026)' DB + "
                     "'하초희 기자 기사 아카이브 (검증본)' 페이지")
    doc = rebuild_meta(doc)
    print("노션 행 %d개 · 새로 더한 기사 %d편 · 합계 %d편 (%s ~ %s)"
          % (len(rows), new, doc["total"], doc["range"][0], doc["range"][1]))
    if a.dry_run:
        return
    if doc["total"] != before or new:
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        print("저장:", OUT)
    if a.push:
        git_push()


if __name__ == "__main__":
    main()

#!/bin/sh
# 뿌듯핫초 · 행복핫초 — 뉴스·카르텔워치·가족일정을 지금 받아 오고, 바뀐 게 있으면 저장소에 올립니다.
#
#   sh /workspace/work/toeic-bts-quiz/scripts/update_hotcho_live.sh
#
# · 아침 6시 20분 브리핑(또는 원하는 아무 스케줄)에서 이 한 줄만 돌리면 됩니다.
# · 뉴스·카르텔워치(update_hotcho_hub.py)는 어디서든 돌고,
#   가족일정은 이 폰/워크스페이스에서 gog 캘린더를 읽어 채웁니다(읽기 전용).
# · 일정에서 병원·진료 같은 민감한 갈래는 JSON에 넣지 않습니다(가족 이름도 역할말로).
set -e
cd "$(dirname "$0")/.."

git -c rebase.autoStash=true pull --quiet --rebase origin main || true

python3 scripts/update_hotcho_hub.py

CAL_JSON="$(mktemp)"
if gog --readonly calendar events primary --days 14 --all-pages --results-only \
      --select id,summary,start,end,location,status 2>/dev/null > "$CAL_JSON" \
   && grep -q '"result"' "$CAL_JSON"; then
  # gog 출력 앞뒤의 안내 줄을 걷어 내고 JSON만 남깁니다.
  python3 - "$CAL_JSON" <<'PY'
import json, re, sys
raw = open(sys.argv[1], encoding='utf-8').read()
i = raw.find('{')
open(sys.argv[1], 'w', encoding='utf-8').write(raw[i:raw.rfind('}') + 1] if i >= 0 else '{}')
PY
  python3 scripts/update_hotcho_family.py --calendar "$CAL_JSON" || echo "가족일정 갱신 실패 — 이전 일정을 그대로 둡니다."
else
  echo "캘린더를 읽지 못했습니다 — 가족일정은 이전 데이터를 그대로 둡니다."
fi
rm -f "$CAL_JSON"

if git diff --quiet -- hotcho_news.json hotcho_hub.json hotcho_family.json; then
  echo "변경 없음 — 올리지 않습니다."
  exit 0
fi

git add hotcho_news.json hotcho_hub.json hotcho_family.json
git -c user.name="봇똑핫초" -c user.email="hachohee@users.noreply.github.com" commit -q \
  -m "💼🏠 뿌듯·행복핫초 데이터 자동 갱신 ($(TZ=Asia/Seoul date +'%m/%d %H:%M') KST)"
git push --quiet origin HEAD:main
echo "올렸습니다 — GitHub Pages에 1분 안에 반영됩니다."

#!/bin/sh
# 똑똑핫초 📻 매일 라디오 — 최신 회차를 지금 받아 오고, 바뀐 게 있으면 저장소에 올립니다.
#
# GitHub Actions 워크플로(.github/workflows/update-radio.yml)를 쓸 수 없을 때
# 매일 아침(06:20)·저녁(18:00) 스케줄에서 이 한 줄만 돌리면 됩니다.
#   sh /workspace/work/toeic-bts-quiz/scripts/update_radio_live.sh
#
# - 회차 내용이 그대로면 파일이 바뀌지 않으므로 커밋도 생기지 않습니다.
# - 네트워크가 끊겨 일부 RSS가 실패해도 이전 회차를 유지하고 나머지는 갱신합니다.
set -e
cd "$(dirname "$0")/.."

git -c rebase.autoStash=true pull --quiet --rebase origin main || true
python3 scripts/fetch_radio.py

if git diff --quiet -- radio_episodes.json; then
  echo "변경 없음 — 올리지 않습니다."
  exit 0
fi

git add radio_episodes.json
git -c user.name="똑똑핫초" -c user.email="hachohee@users.noreply.github.com" commit -q \
  -m "📻 라디오 최신 회차 자동 갱신 ($(TZ=Asia/Seoul date +'%m/%d %H:%M') KST)"
git push --quiet origin HEAD:main
echo "올렸습니다 — GitHub Pages에 1분 안에 반영됩니다."

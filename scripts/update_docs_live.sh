#!/bin/sh
# 똑똑핫초 📰 시사·교양 최신 회차 — 지금 받아 오고, 바뀐 게 있으면 저장소에 올립니다.
#
# GitHub Actions 워크플로(.github/workflows/update-docs.yml)를 쓸 수 없을 때
# 매일 아침 스케줄에서 이 한 줄만 돌리면 됩니다.
#   sh /workspace/work/toeic-bts-quiz/scripts/update_docs_live.sh
#
# - 회차 내용이 그대로면 파일이 바뀌지 않으므로 커밋도 생기지 않습니다.
# - 네트워크가 끊겨 일부 채널이 실패해도 그 채널의 이전 회차를 유지합니다.
set -e
cd "$(dirname "$0")/.."

git -c rebase.autoStash=true pull --quiet --rebase origin main || true
python3 scripts/update_docs.py

if git diff --quiet -- docs_episodes.json; then
  echo "변경 없음 — 올리지 않습니다."
  exit 0
fi

git add docs_episodes.json
git -c user.name="똑똑핫초" -c user.email="hachohee@users.noreply.github.com" commit -q \
  -m "📰 시사·교양 최신 회차 자동 갱신 ($(TZ=Asia/Seoul date +'%m/%d %H:%M') KST)"
git push --quiet origin HEAD:main
echo "올렸습니다 — GitHub Pages에 1분 안에 반영됩니다."

# 똑똑핫초 (토익 BTS 잡기) 📱💜

초희의 토익 단어·문법 훈련 웹앱. 2026-11-21 앱 이름을 `똑똑핫초`로 변경
(앱 이름·홈 화면 이름은 `똑똑핫초`, 부제는 `토익 → BTS 잡기 · 2개월 공부방`). GitHub Pages로 배포해 안드로이드 Chrome에서
**홈 화면에 추가(앱 설치)** 로 쓸 수 있게 만든 PWA입니다.

- 앱: https://hachohee.github.io/quiz/
- 구조: `index.html` (앱 전체), `members/` (BTS 7인 대표 사진), `manifest.webmanifest`, `sw.js`, 아이콘
- 원본: `work/toeic_monster_quiz.html` (이 저장소의 `index.html`과 동일하게 유지)

## 📜 한국사·세계사 12강 연계 단계별 퀴즈 (2026-11-21 개편)

공부방의 `🇰🇷 한국사` `🌏 세계사` 12강과 **1:1로 붙은 퀴즈**로, 1강이 끝나면 바로
다음 강으로 넘어가게 만들었습니다. (예전의 얇고 랜덤하던 상식 문제를 대체)

- **문항**: 한국사 36문항(12강 × 3) · 세계사 36문항(12강 × 3) = **총 72문항**
  - 각 문항에 `lec`(1~12)·`lecTitle`·`track`(korea/world), 친절한 해설 `exp`, 그 강의 유튜브 링크 `yt`
  - 보기는 매번 순서가 섞입니다(정답이 늘 A이던 문제 해결)
- **공부방 강의 줄**: `▶ 강의` · `✓ 수강 완료` 옆에 `📝 퀴즈 (3문제)` 버튼과
  `시작 전 / 이어서 2/3 / 완료 3/3` 상태 표시. 히어로에 `📝 역사 퀴즈 N / 24강 완료`
- **강의 퀴즈 진행**: 그 강의 3문제만 순서대로 출제 → 완료 화면에서
  `➡️ 다음 N강으로 넘어가기 · 퀴즈 3문제` 버튼(+ `📺 N강 강의 먼저 보기` 링크).
  12강을 마치면 `🎉 전체 퀴즈로 마무리`
- **상식 퀴즈 단계**: `1단계 한국사` `2단계 세계사`는 **1강→12강 순서**로 출제되고
  문제마다 `[N강] 강 이름` 배지가 붙습니다. 단계를 마치면 `➡️ 다음 단계로 넘어가기`
- **기록**: 강의별 진도는 `localStorage` `tmq_lecquiz_v1`, 정답·오답은 기존
  `tmq_subj_stats_v1`의 `📜 한국사·세계사·시사`로 집계됩니다.
- 문제 배열이 통째로 바뀌어 예전 `s:번호` 오답이 다른 문제를 가리키던 것은
  `tmq_hist_migrate_v1`로 용어 이름을 기준으로 한 번만 다시 연결합니다(지우지 않음).

## 📊 과목별 내 실력 리포트 (2026-11-21 추가)

홈 화면 **카테고리 카드 아래**에 붙는 실시간 학습 리포트. 제목부터 "취약점" 대신
**강점 · 보완점 · 조언**으로 다정하게 말합니다.

- 상단: `누적 N문제 · 누적 정답률 XX%` **맨 앞** → `오늘 N문제` · `📺 공부방 N/84강` · `💜 BTS 포획 N/7명` 칩
  (누적은 날마다 이어서 쌓이고, `오늘` 카운터만 자정에 새로 시작)
- 🌟 **강점** — 가장 잘 하는 과목과 정답률
- 💡 **보완점** — 한 번 더 보면 좋을 과목(오답 개수) + `📝 약점 바로 복습` 버튼(오답 복습/해당 과목 퀴즈로 이동)
- 💬 **오늘의 조언** — 실제 점수에 맞춘 1~2줄 코칭 (3초 문법 공식, 재테크 강의 번호, 오답 지우기 등)
- 과목 6줄: 📘 도파민 단어 · ⚡ 3초 문법 · 📖 한 줄 해석 · 🎧 발음 듣기 ·
  📜 한국사·세계사·시사 · 💎 경제·재테크(4단계/재테크 문항)
  - 각 줄에 푼 문제 수, 정답률 막대, 오답 개수, **최근 오답 키워드 2개**(예: `최근 오답: resolve, ISA 비과세 한도`)
  - 상태: `🌟 탄탄`(85%↑ & 오답 0) · `📈 성장 중`(65%↑) · `💡 한 번 더` · `🌱 시작 전`
- 기록은 `localStorage` `tmq_subj_stats_v1`(누적 `all` + 날짜별 `today`). 퀴즈·오답 복습
  모든 답안에서 즉시 갱신되고, 홈으로 돌아오거나 날짜가 바뀌면 배지와 `오늘 N문제`가 새로 잡힘

### 기존 학습 기록 복원(백필, 2026-11-21 추가)

이 리포트는 2026-11-21에 생겨서, 그 전에 폰에 쌓인 기록은 과목별 통계에 하나도 없었습니다.
그래서 앱을 열 때 **근거가 있는 과목만 처음 한 번** 기존 `localStorage`에서 추정해 채웁니다
(`tmq_subj_stats_v1`의 `bf`에 과목별 1회 기록, 다시 더해지지 않음).

| 기존 기록 | 과목별 반영 |
|---|---|
| `tmq_stats_v1` 포획 수 (words/grammar/reading/listening) | 그 과목 **맞힌 문제**로 1:1 반영 (보수적 — 포획 1회는 실제 4문제 안팎) |
| `tmq_stats_v1` sense 포획 수 | 남은 오답이 있는 단계(역사/경제) 비율로 나눔. 오답이 없으면 문제 수 비율 |
| `tmq_wrong_v1` 남은 오답 1개 | 그 과목 **푼 문제 1개(오답)** |
| `tmq_room_v1` 수강 완료 | `📺 공부방 N/84강` 칩 |
| `tmq_btsdeck_v1` 포획 멤버 | `💜 BTS 포획 N/7명` 칩 |

`tmq_state_v1`·단계 클리어 기록은 이 앱에 저장되지 않아(포획 수만 남습니다) 포획으로 대신했습니다.
복원한 문제 수는 누적 옆에 `기존 기록 N 포함`으로 표시되고, 카드 맨 아래에 복원 안내가 붙습니다.

## 📺 2개월 공부방 (2026-11-20 추가)

옥토(OHTO) '성장·공부' 커리큘럼(역사·경제)을 2개월 로드맵으로 압축하고 시사·영어·재테크를 더한 학습 화면.
홈의 **📺 2개월 공부방** 버튼으로 들어갑니다.

- 탭: 영어(토익 800) · 역사(세계사/한국사) · 경제(기초경제/최신트렌드) · 시사 · 재테크
- 트랙마다 12강을 **1개월차(1~6강) / 2개월차(7~12강)** 로 나눠 표시, 총 84강
- `📘 영어`는 혼자 12강 로드맵 (2026-11-21 추가): 1개월차 기초 뼈대·3초 문법(P5·P6),
  2개월차 800점 실전·리스닝 셰도잉(LC·P7). 상단에 **핵심 개념 & 3초 공식 요약 카드**와
  **⚡ 지금 바로 토익 퀴즈 풀기** 버튼(홈 카테고리로 이동)
- `💎 재테크`는 12강 로드맵 (2026-11-21 추가): 1개월차 절세 계좌·비상금·ETF·채권 기초,
  2개월차 적립식·리밸런싱·부동산·금리·연금 인출·금융사기, 상단에 **핵심 개념 카드**
- 2026-11-21 재테크 탭 2026년 현행 기준 반영: 카드 숫자(연금저축 600/IRP 합산 900만·16.5%/13.2%,
  ISA 연 2,000만·총 1억·비과세 200/400만·초과 9.9%, 예금자보호 1억원, ETF 과세 15.4%/22%·250만 공제,
  금투세 폐지)와 함께 12강 제목·유튜브 검색어에 `2026`·`예금자보호 1억`·`2026 ISA`·`2026 부동산 세금`
  같은 연도·정책 키워드를 넣어 최신 영상이 검색되게 함. 상단에 **📌 2026년 현행 기준** 카드 추가
- `🌍 한국사·세계사·상식`의 4단계 경제에 **2026 재테크 8문항** 추가(태그 `경제 · 재테크`,
  설명 카드에 해당 `💎 재테크` 강의 링크 연결)
- 강의 제목은 옥토 학습자료 화면 그대로, 링크는 `youtube.com/results?search_query=<제목+채널>`
- 행을 누르면 유튜브 검색이 새 탭으로 열리고, ✓ 버튼으로 수강 완료를 이 폰(localStorage)에 기록
- 한국사·세계사·시사·경제·재테크 문제의 설명 카드와 훑어보기 카드에 **📺 관련 유튜브 강의 보기** 버튼

## 멤버 사진 (2026-11-20 추가)

`members/*.jpg` 480×480 정사각 크롭. 모두 Wikimedia Commons에서 받은 자유 라이선스
사진이며, CC BY 3.0 조건에 따라 아래와 같이 출처를 표시합니다.

| 파일 | 멤버 | 원본 | 촬영·저작자 | 라이선스 |
|---|---|---|---|---|
| `rm.jpg` | RM | [RM for BTS 5th anniversary party in LA photoshoot by Dispatch, May 2018 01](https://commons.wikimedia.org/wiki/File:RM_for_BTS_5th_anniversary_party_in_LA_photoshoot_by_Dispatch,_May_2018_01.jpg) | Dispatch | CC BY 3.0 |
| `jin.jpg` | 진 | [BTS' Jin Airport Departure, July 11, 2024 (1)](https://commons.wikimedia.org/wiki/File:BTS%27_Jin_Airport_Departure,_July_11,_2024_(1).png) | 티비텐 | CC BY 3.0 |
| `suga.jpg` | 슈가 | [Suga for BTS 5th anniversary party in LA photoshoot by Dispatch, May 2018 12](https://commons.wikimedia.org/wiki/File:Suga_for_BTS_5th_anniversary_party_in_LA_photoshoot_by_Dispatch,_May_2018_12.jpg) | Dispatch | CC BY 3.0 |
| `jhope.jpg` | 제이홉 | [J-Hope on the Billboard Music Awards red carpet, 1 May 2019](https://commons.wikimedia.org/wiki/File:J-Hope_on_the_Billboard_Music_Awards_red_carpet,_1_May_2019.jpg) | Dispatch | CC BY 3.0 |
| `jimin.jpg` | 지민 | [Park Ji-min on the Billboard Music Awards red carpet, 1 May 2019](https://commons.wikimedia.org/wiki/File:Park_Ji-min_on_the_Billboard_Music_Awards_red_carpet,_1_May_2019.jpg) | Dispatch | CC BY 3.0 |
| `v.jpg` | 뷔 | [V on the Billboard Music Awards red carpet, 1 May 2019 02](https://commons.wikimedia.org/wiki/File:V_on_the_Billboard_Music_Awards_red_carpet,_1_May_2019_02.jpg) | Dispatch | CC BY 3.0 |
| `jungkook.jpg` | 정국 | [Jungkook on the Billboard Music Awards red carpet, 1 May 2019](https://commons.wikimedia.org/wiki/File:Jungkook_on_the_Billboard_Music_Awards_red_carpet,_1_May_2019.jpg) | Dispatch | CC BY 3.0 |

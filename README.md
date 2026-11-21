# 똑똑핫초 (토익 BTS 잡기) 📱💜

초희의 토익 단어·문법 훈련 웹앱. 2026-11-21 앱 이름을 `똑똑핫초`로 변경
(앱 이름·홈 화면 이름은 `똑똑핫초`, 부제는 `매일 공부하고 매일 더 똑똑해진다!!`). GitHub Pages로 배포해 안드로이드 Chrome에서
**홈 화면에 추가(앱 설치)** 로 쓸 수 있게 만든 PWA입니다.

- 앱: https://hachohee.github.io/quiz/
- 구조: `index.html` (앱 전체), `members/` (BTS 7인 대표 사진), `manifest.webmanifest`, `sw.js`, 아이콘
- 원본: `work/toeic_monster_quiz.html` (이 저장소의 `index.html`과 동일하게 유지)

## 📻 매일 라디오 다시듣기 (CNN · BBC · 굿모닝팝스 · 시사) — 2026-11-21 추가

홈의 **📻 매일 라디오** 카드에서 8개 공식 팟캐스트의 최신 8회차를 앱 안에서 바로 듣습니다.

| 그룹 | 프로그램 | 방송사 |
|---|---|---|
| 🇬🇧🌍 | CNN 5 Things | CNN Audio |
| | BBC Global News Podcast | BBC World Service |
| | BBC 6 Minute English | BBC Learning English |
| 🇰🇷 | 조정현의 굿모닝 팝스 | KBS 2FM |
| | 김종배의 시선집중 | MBC 표준FM |
| | 박성태의 뉴스쇼 | CBS 표준FM |
| | 성공예감 이대호입니다 | KBS 1라디오 |
| | 오늘 세계는 | KBS 1라디오 |

- **최신 회차 수집**: `scripts/fetch_radio.py`(표준 라이브러리만 사용)가 각 RSS에서 최신 8개를 뽑아
  `radio_episodes.json`을 만듭니다. 회차 내용이 그대로면 갱신 시각도 그대로 두어 쓸데없는 커밋이 생기지 않습니다.
- **자동 갱신**: `.github/workflows/update-radio.yml`(한국시간 08·10·13·19시 + `workflow_dispatch`).
  GitHub App 토큰에 `workflows` 권한이 없어 아직 저장소에 못 올렸고, 그 전에는
  `sh scripts/update_radio_live.sh`를 아침·저녁 스케줄에서 돌리면 됩니다(바뀐 게 있을 때만 커밋·푸시).
- **앱 내장 플레이어**: 화면 아래 고정 플레이어에서 재생/일시정지, **15초 앞·뒤**, **진행바(seek)**,
  **배속 0.8x / 1.0x / 1.25x / 1.5x**. 30~47분짜리 시사 프로그램을 듣다가 나갔다 와도 이어서 재생됩니다.
- **들은 회차 체크**: 각 회차의 `✓` 또는 플레이어의 `✓ 들었어요` → `tmq_radio_heard_v1`. 끝까지 들으면 자동 체크.
  재생 위치·배속은 `tmq_radio_pos_v1` / `tmq_radio_spd_v1`, 마지막으로 본 방송은 `tmq_radio_last_v1`에 이 폰에만 저장됩니다.
- **HTTPS 음원**: BBC RSS는 `http://` enclosure만 주므로 `ppg:enclosureSecure`(또는 https 치환)를 써서
  Mixed Content로 재생이 막히지 않게 했습니다.
- **서비스 워커**: `toeic-bts-v15` · `radio_episodes.json`은 Network-First(온라인이면 항상 새 JSON, 오프라인일 때만 캐시).

## 📚 매일 18:00 자동 반영 — Day 10 (2026-11-21)

18:00 '저녁 토익 10분' 회차에서 낸 내용을 앱 데이터에 그대로 넣었습니다.

- **📜 도파민 단어 → Day 10(👥 인사·채용)**: 오늘 새 단어 8개 중 이미 있던 3개(promotion·salary·colleague)는 그대로 두고,
  **supervisor · certificate · policy · conference · efficiently** 5개를 이어 붙였습니다(Day 10 = 45단어).
- **⚡ 3초 문법**: Day 8~10 사흘째 같은 공식 **`a / the + [ ] + 명사`** 문제 1개 추가 (73개).
  "The supervisor shared a ___ policy with the team." → a와 policy 사이는 꾸며 주는 말 자리, 정답 clear.
- **🌍 상식**: '🧠 오늘의 상식 한 조각'으로 낸 **매몰비용(Sunk Cost)** 을 4단계 경제에 문항으로 추가 (107개).
- 현재 규모: 단어 **380**(397항목) · 문법 **73** · 해석 47 · LC 76 · 상식 **107**


## 🔥 토익 A to Z & 실전 LC 대폭 확충 (2026-11-21)

토익 파트를 **800점 실전형 A to Z**로 넓혔습니다. 기존 Day 1~9 · 3초 공식 · 상식 문제는
그대로 두고 **뒤에 덧붙이기만** 해서, 이미 쌓인 진도·오답·통계(`tmq_*`)는 그대로 이어집니다.

| 파트 | 전 | 후 | 내용 |
|---|---|---|---|
| 📜 도파민 단어 | 74 | **376** (392항목) | Day 1~9 유지 + A to Z 9개 영역 302단어 |
| ⚡ 3초 문법 | 24 | **72** | 품사·수일치·시제/태·준동사·접속사/전치사·관계사·대명사/비교/가정법/도치 |
| 📖 한 줄 해석 | 16 | **47** | 분사구문·도치·강조·가정법·관계절·양보 + 이메일/공지/계약/보고서 구문 |
| 🎧 실전 LC | 16 | **76** | Part 1 12 · Part 2 24 · Part 3 12 · Part 4 12 + 발음 워밍업 16 |

- **A to Z 9개 영역**: 👥 인사·채용(40) 💰 재무·회계(40) 📑 계약·법무(32) 📣 마케팅·영업(36)
  📦 물류·생산(32) 💻 IT·기술(30) 🗓️ 회의·일정(32) 🏢 시설·안전(28) 🗂️ 사무·일상(32)
  — 모든 단어에 **한국어 뜻 + 짝꿍 덩어리(collocation) + 3초 암기 썰**
- **10문제 라운드**: 단어·문법·해석·듣기 모두 `ROUND_SIZE=10`. 라운드마다
  **아직 안 본 문제를 먼저** 골라(`tmq_seen_v1`) 계속 새 문제로 넘어가고, 결과 화면에
  `➡️ 다음 10문제 이어서` · `다음 단계` · `📚 단계 목록으로` 버튼이 나옵니다.
- **보기 순서 랜덤**: 단어는 물론 문법·해석·듣기 보기까지 매번 섞습니다.
- **실전 LC**: Part 2는 **질문 텍스트를 화면에 보여 주지 않고** 음성으로만 듣고 (A)/(B)/(C)
  응답을 고릅니다 — `👀 스크립트` 토글로 확인. Part 3/4는 대화(M/W 다른 목소리)·안내방송을
  듣고 목적·장소·다음 할 일을 고릅니다. **속도 0.85x / 1.0x / 1.15x** 지원.
- **단계 목록**: 단어는 Day 1~9 + 9개 영역, 듣기는 Part 1~4 + 워밍업으로 나뉘고,
  각 줄에 `전체 N개 · 새 N`이 표시됩니다.


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
- 과목 6줄: 📘 도파민 단어 · ⚡ 3초 문법 · 📖 한 줄 해석 · 🎧 실전 LC 듣기 ·
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

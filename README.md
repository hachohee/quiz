# 토익 BTS 잡기 📱💜

초희의 토익 단어·문법 훈련 웹앱. GitHub Pages로 배포해 안드로이드 Chrome에서
**홈 화면에 추가(앱 설치)** 로 쓸 수 있게 만든 PWA입니다.

- 앱: https://hachohee.github.io/quiz/
- 구조: `index.html` (앱 전체), `members/` (BTS 7인 대표 사진), `manifest.webmanifest`, `sw.js`, 아이콘
- 원본: `work/toeic_monster_quiz.html` (이 저장소의 `index.html`과 동일하게 유지)

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

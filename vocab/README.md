# vocab/ — 라디오 문장별 핵심 단어·숙어·표현 원본

`radio_transcripts.json` 각 문장의 `v: [{"e": 표현, "m": 뜻}]` 를 만든 사람이 쓴 원본입니다.
파일 이름은 `<program>_<guid 앞 8자>.tsv` (6 Minute 은 `urn:bbc:podcast:` 다음 ID).

형식: `문장번호<TAB>표현<TAB>뜻` (구분자는 ` | ` 도 가능, 같은 번호 여러 줄 가능)

```
python3 scripts/apply_vocab.py "cnn5things::08492ca0-…" vocab/cnn5things_08492ca0.tsv
```

- 기본은 그 회차 표현을 TSV 내용으로 **통째로 교체**, `--append` 면 TSV에 없는 문장의 기존 표현 유지.
- 표현은 그 문장에 실제로 나오는 표기 그대로 적습니다(`check_data.py` 가 어긋난 것을 `!` 로 짚어 줌).
- 새 회차는 `scripts/build_radio_transcripts.py` 해석 파일의 `"v"` 키로도 넣을 수 있습니다(README 참고).

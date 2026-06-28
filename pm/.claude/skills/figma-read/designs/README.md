# designs/ — Figma read 다이제스트 아카이브

`figma-read` 스킬이 Figma를 읽을 때마다 정제한 디자인 정보를 여기 쌓는다. 매 세션이 0에서 시작하지 않게 하는 PM 정제 맥락(미션 박스와 같은 철학).

## 규칙 (스킬 §5와 동일)
- 한 Figma 파일 = 한 폴더 `<FILE_KEY>/`(또는 `<FILE_KEY>--<짧은영문>/`).
- 그 안 `digest.md`는 **필수** — read마다 최신 상태로 갱신(덮음), 끝의 "변경 이력"에만 누적.
- `frames/<YYYY-MM-DD_HHMM>/<프레임이름>__<nodeid>.png` — export 이미지는 **read 시점 폴더에 쌓는다**(덮지 않음). 디자인이 바뀌므로 시점별 스냅샷을 남겨야 변화 추적·diff가 된다. 파일명은 Figma 프레임 이름 + `__nodeid`(이름 중복·재export 대비).
- `raw/*.json`(노드 원본)은 선택.
- 여기 파일들은 **git에 올라간다**(디자인 지식 축적). 토큰·만료되는 S3 URL은 적지 않는다.
- Figma가 단일 진실. digest는 `last_read` 시점의 스냅샷이라 썩을 수 있다.

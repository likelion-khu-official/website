---
name: project-board
description: >-
  PM이 "멋사 사이트 로드맵" GitHub Project 보드를 관리한다 (PM 전용). 이슈를 보드에 올리고
  Team·시작일·목표일·Status 설정, Status 이동(Todo/In Progress/Done), 날짜 변경, 현황 보기.
  Use when 김우진(PM)이 "보드에 올려/추가", "상태 옮겨/진행중으로/완료", "날짜 바꿔",
  "보드 현황/로드맵 보여줘" 등을 말할 때. 이슈 *내용* 작성은 mission 스킬. 보드 라이프사이클은 PM만.
---

# project-board — 로드맵 보드 관리

"멋사 사이트 로드맵" 보드를 다룬다.

> **인증:** 모든 `gh`에 `GH_HOST=github.com GH_TOKEN=…` prefix. 토큰은 프로젝트 로컬 설정
> (`~/.claude/projects/-Users-tom-kim-personal-likelion-khu-site/CLAUDE.md`)에 있다. **여기 적지 않는다.**

## 보드 좌표 (고정)
- owner `likelion-khu-official` · project **#1** · URL https://github.com/likelion-khu-official/website/projects
- **project-id** `PVT_kwDOEZZ_V84BbPtZ`

| 필드 | field-id | 옵션 (이름 = option-id) |
|---|---|---|
| **Team** | `PVTSSF_lADOEZZ_V84BbPtZzhWBlF8` | 디자인 `2171eaba` · 프론트 `a2398a16` · 백엔드 `c2387007` · 인프라 `7d9a54b6` |
| **Status** | `PVTSSF_lADOEZZ_V84BbPtZzhWBlCY` | Todo `f75ad846` · In Progress `47fc9ee4` · Done `98236657` |
| **시작일** | `PVTF_lADOEZZ_V84BbPtZzhWBlF0` | (date) |
| **목표일** | `PVTF_lADOEZZ_V84BbPtZzhWBlF4` | (date) |

> ID가 안 맞으면(필드 재생성 등) 새로고침:
> `gh project field-list 1 --owner likelion-khu-official --format json --jq '.fields[]|{name,id,options:(.options//[]|map({name,id}))}'`

## 작업

공통: `PID=PVT_kwDOEZZ_V84BbPtZ; O=likelion-khu-official` (앞에 GH_HOST/GH_TOKEN prefix)

### 1. 이슈를 보드에 올리기 (+ 필드 세팅)
```
ITEM=$(gh project item-add 1 --owner $O --url <이슈URL> --format json --jq '.id')
gh project item-edit --id $ITEM --project-id $PID --field-id PVTSSF_lADOEZZ_V84BbPtZzhWBlF8 --single-select-option-id <팀옵션>
gh project item-edit --id $ITEM --project-id $PID --field-id PVTSSF_lADOEZZ_V84BbPtZzhWBlCY --single-select-option-id f75ad846   # Todo
gh project item-edit --id $ITEM --project-id $PID --field-id PVTF_lADOEZZ_V84BbPtZzhWBlF0 --date 2026-06-23   # 시작일
gh project item-edit --id $ITEM --project-id $PID --field-id PVTF_lADOEZZ_V84BbPtZzhWBlF4 --date 2026-07-04   # 목표일
```

### 2. Status 옮기기 (Todo→In Progress→Done)
item-id 먼저: `gh project item-list 1 --owner $O --format json --jq '.items[]|"\(.id) \(.content.title)"'`
```
gh project item-edit --id <ITEM> --project-id $PID --field-id PVTSSF_lADOEZZ_V84BbPtZzhWBlCY --single-select-option-id 47fc9ee4   # In Progress (Done=98236657)
```

### 3. 날짜 변경
```
gh project item-edit --id <ITEM> --project-id $PID --field-id PVTF_lADOEZZ_V84BbPtZzhWBlF4 --date YYYY-MM-DD
```

### 4. 현황 보기
```
gh project item-list 1 --owner $O --format json --jq '.items[] | .e=(to_entries|map({(.key|ascii_downcase):.value})|add) | "\(.title) | Team=\(.team) Status=\(.status) 기간=\([.e|to_entries[]|select(.key|test("일"))|.value]|join("~"))"'
```

## 규칙 / 함정 (실전에서 겪은 것)
- `item-edit`는 **호출당 필드 하나**.
- **뷰 레이아웃(Board/Roadmap)·Group by는 웹 UI 전용** — CLI/이 스킬로 못 바꾼다. (보드: 웹에서 Board + Group by Status 추천)
- `item-list` JSON의 **한글 필드 키(시작일·목표일)**는 jq 직접 매칭이 깨질 수 있다 → `to_entries`/`ascii_downcase`로 우회(위 4번처럼).
- `gh project create`는 이 gh 버전(2.87)에서 버그 → 새 프로젝트는 GraphQL `createProjectV2`. (단 보드는 이미 #1로 존재, 재생성 불필요.)
- **라이프사이클은 PM만.** 팀원은 보기만 — 카드 이동(Status)도 PM이 한다.
- 미션 이슈 *생성*과 **보드 추가(`item-add`)는 둘 다 `mission` 스킬의 "던져" 절차 안**(보드 추가는 별도 단계 아님 — 거기서 카드 붙음까지 검증). 이 스킬은 그 위에서 *필드 세팅·Status 이동·날짜·현황*을 다룬다.

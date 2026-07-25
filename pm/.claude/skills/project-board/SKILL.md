---
name: project-board
description: >-
  PM이 "멋사 사이트 로드맵" GitHub Project 보드를 관리한다 (PM 전용). 이슈를 보드에 올리고
  Team·시작일·목표일·Status 설정, Status 이동(Todo/Done), 날짜 변경, 현황 보기.
  Use when 김우진(PM)이 "보드에 올려/추가", "상태 옮겨/완료", "날짜 바꿔",
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
| **Team** | `PVTSSF_lADOEZZ_V84BbPtZzhWBlF8` | 디자인 `2171eaba` · FE `a2398a16` · BE `c2387007` · 인프라 `7d9a54b6` |
| **Status** | `PVTSSF_lADOEZZ_V84BbPtZzhWBlCY` | Todo `f75ad846` · Done `98236657` |
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

### 2. Status 옮기기 (Todo→Done)
item-id 먼저: `gh project item-list 1 --owner $O --format json --jq '.items[]|"\(.id) \(.content.title)"'`
```
gh project item-edit --id <ITEM> --project-id $PID --field-id PVTSSF_lADOEZZ_V84BbPtZzhWBlCY --single-select-option-id 98236657   # Done
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
- **뷰 레이아웃(Board/Roadmap)·Group by는 웹 UI 전용** — CLI/이 스킬로 못 바꾼다. 보드는 Epic(테마)/Story(슬라이스)/Sub-task·Task(미션) 4단을 보여주고, 각 이슈는 네이티브 **Issue Type**을 뱃지로 들고 있다. 추천 뷰 둘: **미션 뷰**(Board + Group by Status)로 팀 작업 흐름을, **구조 뷰**(Group by **Issue Type** 또는 **parent**)로 Epic→Story→Sub-task/Task 계층별 진행을 본다.
- `item-list` JSON의 **한글 필드 키(시작일·목표일)**는 jq 직접 매칭이 깨질 수 있다 → `to_entries`/`ascii_downcase`로 우회(위 4번처럼).
- `gh project create`는 이 gh 버전(2.87)에서 버그 → 새 프로젝트는 GraphQL `createProjectV2`. (단 보드는 이미 #1로 존재, 재생성 불필요.)
- Status는 **끝나지 않은 Todo / 끝난 Done** 두 값만 쓴다. 착수 여부를 Status로 따로 표시하지 않는다.
- **라이프사이클은 PM만.** 팀원은 보기만 — 카드 이동(Status)도 PM이 한다. **단 예외:** `claim-mission`으로 미션을 채간 팀원은 **IQ 게이트 통과 후 Todo→Done + 이슈 close**를 스스로 한다(미션은 연 사람이 닫는다 — human-on-the-loop). PM은 발주·방향만.
- 미션 이슈 *생성*과 **보드 추가(`item-add`)는 둘 다 `mission` 스킬의 "던져" 절차 안**(보드 추가는 별도 단계 아님 — 거기서 카드 붙음까지 검증). 이 스킬은 그 위에서 *필드 세팅·Status 이동·날짜·현황*을 다룬다.
- **Epic/Story 카드.** Epic(테마)·Story(슬라이스) 이슈도 다른 이슈처럼 보드에 자동 추가되고, 하위 항목의 진행률은 GitHub이 이슈 화면에서 (parent/sub-issue 기준으로) 자동 롤업한다. Epic·Story엔 Team·담당자가 없다(assignee 없는 층 — 담당·Team은 미션인 Sub-task/Task에서만 붙는다). **Story의 하위 Sub-task/Task가 전부 Done이 되면 Story를 닫고, 한 Epic의 하위 Story가 전부 닫히면 Epic을 닫는다**(보드 Done + 이슈 close — PM 또는 tidy-missions). 남은 하위 항목이 있으면 그 상위(Story/Epic)는 열어 둔다.

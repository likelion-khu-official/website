---
name: tidy-missions
description: >-
  완료됐거나 닫혔지만 뒷정리가 안 된 미션들을 일괄 정리한다. Use when PM(김우진)이 "완료된 미션
  정리하자 / 미션 정리해줘 / 끝난 미션들 마무리하자"라고 할 때. GitHub에서 닫힌 roadmap 이슈를
  찾아 각각의 번호별 미션 박스 result.md가 채워졌는지, 보드 Status가 Done인지,
  상위 Story가 하위 미션 롤업을 반영하는지(다 닫혔으면 Story도, 그 Story들이 다 닫혔으면 테마 Epic도 닫혔는지) 확인·보정하고, 재사용할 통찰은
  pm/docs/learnings.md로 졸업시킨다. 미션을 새로 쓰거나 발주하는 건 mission 스킬(이건 뒷정리 전용).
---

# tidy-missions — 닫힌 미션들 뒷정리를 한 번에

미션 하나가 끝나면 네 군데가 같이 맞아야 한다: **GitHub 이슈(닫힘)· 보드(Done)· 미션 박스(result.md)· 상위 Story(하위 미션(Sub-task/Task)이 다 닫혔으면 Story도, 그 Story들이 다 닫혔으면 테마 Epic도 닫힘)**. claim-mission으로 닫힌 건 보통 이 네 개가 이미 맞다(현황·진행률은 Story·Epic이 하위 상태로 자동 롤업하니 손댈 게 없다). 이 스킬은 **어긋난 것들을 찾아 한 번에 맞춘다** — PM이 직접 닫았거나, 급하게 닫혀 뒷정리가 밀린 경우.

## 흐름

### 1) 어긋난 미션 찾기
```
gh issue list --repo likelion-khu-official/website --label roadmap --state closed --limit 100 \
  --json number,title,closedAt,labels
```
각 닫힌 이슈에 대해 `pm/missions/<n>-*/` 박스가 있는지 확인한다.
- **박스가 없다** → 이 스킬 대상이 아닌 오래된 이슈일 수 있다(스킬 도입 전). 목록에만 표시하고 건드리지 않는다.
- **박스는 있는데 `result.md`가 스텁 그대로**(`## 산출물` 아래 내용 없음) → 정리 대상.
- **박스도 있고 result.md도 채워짐** → 이미 정리됨, 건너뛴다.

### 2) 보드 Status 확인
```
gh issue view <n> --repo likelion-khu-official/website --json projectItems
```
Status가 Done이 아니면 project-board 스킬 좌표로 Done으로 옮긴다. (이슈는 닫혔는데 보드만 Todo에 남아있는 게 실제로 발생하는 어긋남이다.)

### 3) 각 미션의 결과를 채운다
이슈 본문·코멘트·연결된 PR을 읽는다:
```
gh issue view <n> --repo likelion-khu-official/website --comments
gh pr list --repo likelion-khu-official/website --search "<n> in:body"
```
`result.md`에 정리:
```
## 산출물
<PR 링크·머지된 것·배포 상태 — 사실만>
## 결정
<진행 중 갈린 판단이 있었다면>
## 배운 것
<다음에도 쓸 통찰이면 — 없으면 비워둔다>
```
**배운 것이 재사용할 만하면 `pm/docs/learnings.md`로 졸업**시킨다(박스엔 이 미션 고유의 것만 남긴다 — 중복 금지).

### 4) 미션 타입·상위 Story 롤업·종료 확인
먼저 이 미션이 네이티브 Issue Type **Sub-task**(순수 기술 작업이면 **Task**)로 달려 있는지 확인한다. Sub-task라면 sub-issue로 달린 상위 **Story**를 연다(`proposal.md`의 `Target` Story 링크). Story 진행률은 하위 미션 상태로 **자동 롤업**되니 손으로 상태를 칠할 건 없다. **다만 이 Story의 하위 미션이 이번으로 전부 닫혔으면 Story도 닫고**(project-board 스킬로 보드 Done + 이슈 close), **그 Story가 속한 테마 Epic의 Story가 전부 닫혔으면 Epic도 닫는다.** 남은 하위 항목이 있으면 그 상위(Story/Epic)는 열어 둔다. *(미션이 아직 어떤 Story에도 안 달려 있으면 — 마이그레이션 전 옛 미션 — 해당 기능의 Story를 찾아 `pm/scripts/link-subissue.sh`로 걸어 둔다.)*

### 5) 요약 보고
정리한 미션마다 한 줄: `#<n> <제목> — result 채움 · 보드 Done · 상위 Story <닫힘/유지>`. 손대지 않은 것(박스 없음 등)도 이유와 함께 알린다.

## 하지 않는 것
- 열린 미션 손대지 않는다(진행 중은 이 스킬 대상 아님).
- 새 미션을 쓰거나 발주하지 않는다 — 그건 mission 스킬.
- result.md 내용을 지어내지 않는다 — 이슈·PR·코멘트에 없으면 "확인 안 됨"으로 비워두고 PM에게 묻는다.

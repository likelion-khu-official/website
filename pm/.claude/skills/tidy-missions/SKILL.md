---
name: tidy-missions
description: >-
  완료됐거나 닫혔지만 뒷정리가 안 된 미션들을 일괄 정리한다. Use when PM(김우진)이 "완료된 미션
  정리하자 / 미션 정리해줘 / 끝난 미션들 마무리하자"라고 할 때. GitHub에서 닫힌 roadmap 이슈를
  찾아 각각의 미션 박스(pm/missions/<n>-<slug>/result.md)가 채워졌는지, 보드 Status가 Done인지,
  기능 트리 노드(pm/features/) 상태가 결과를 반영하는지 확인·보정하고, 재사용할 통찰은
  pm/docs/learnings.md로 졸업시킨다. 미션을 새로 쓰거나 발주하는 건 mission 스킬(이건 뒷정리 전용).
---

# tidy-missions — 닫힌 미션들 뒷정리를 한 번에

미션 하나가 끝나면 네 군데가 같이 맞아야 한다: **GitHub 이슈(닫힘)· 보드(Done)· 미션 박스(result.md)· 기능 트리 노드(pm/features/)**. claim-mission으로 닫힌 건 보통 이 네 개가 이미 맞다. 이 스킬은 **어긋난 것들을 찾아 한 번에 맞춘다** — PM이 직접 닫았거나, 급하게 닫혀 뒷정리가 밀린 경우.

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
Status가 Done이 아니면 project-board 스킬 좌표로 Done으로 옮긴다. (이슈는 닫혔는데 보드만 Todo/In Progress에 남아있는 게 실제로 발생하는 어긋남이다.)

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

### 4) 기능 트리 노드 갱신 (있으면)
`proposal.md`의 `Target` 링크를 따라간 `pm/features/<노드>.md`를 연다. 이 미션의 결과로 그 노드의 상태 색과 `진행 상태`가 바뀌어야 하면 반영하고, 루트 `README.md` 트리의 같은 노드 색도 맞춘다. *(claim-mission으로 닫힌 미션은 대개 이미 반영돼 있다 — 여기선 어긋난 것만 고친다.)*

### 5) 요약 보고
정리한 미션마다 한 줄: `#<n> <제목> — result 채움 · 보드 Done · 노드 <색 변화>`. 손대지 않은 것(박스 없음 등)도 이유와 함께 알린다.

## 하지 않는 것
- 열린 미션 손대지 않는다(진행 중은 이 스킬 대상 아님).
- 새 미션을 쓰거나 발주하지 않는다 — 그건 mission 스킬.
- result.md 내용을 지어내지 않는다 — 이슈·PR·코멘트에 없으면 "확인 안 됨"으로 비워두고 PM에게 묻는다.

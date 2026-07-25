---
name: mission
description: >-
  Write a high-quality PM mission (roadmap work-item) assigning work to a team
  (디자인/FE/BE/인프라). Use when the PM(김우진) wants to assign work, draft or
  throw a roadmap issue, or says "미션 만들어 / 이슈 만들어 / 일 줘 / 일감". Also manages the
  mission's whole lifecycle in its box (pm/missions/<n>-<slug>/): "던져"(throw), "로그
  남겨"(log progress), "결과 정리 / 미션 닫아"(write result). Produces the 4-section body
  무엇(산출물) / 왜 / 완료기준 / 경계 — NO step-by-step task list (steps are the team's,
  that is their learning) — and ENFORCES a concrete, checkable 완료기준.
  Author/요청자 is 김우진. Not for escalation (team→PM) — that is the ask-pm skill.
---

# mission — 고품질 PM 미션 이슈를 쓴다

PM이 한 팀에 줄 일을 *미션*으로 쓴다. 단계 지시가 아니라 **무엇·왜·완료기준·경계**. 받는 사람이 *"뭘 내놓고, 뭐가 되면 끝"*을 즉시 알게 하는 게 목표.

## Story·Epic과 한 몸이다 (불변식 — 제일 먼저 읽어라)

미션은 공중에 뜬 일이 아니다. **한 Story(사용자 향 기능 슬라이스, 예: "방문자가 프로젝트 목록을 볼 수 있다")를 전진시키는 분야별 실작업(GitHub 네이티브 타입 Sub-task)**이다. Story는 다시 테마 **Epic** 밑에 산다. 이 계층이 미션 체계의 척추다:

- **위키 = 스펙(무엇이어야 하나) · Story = 추적 단위(이 사용자 기능이 뭐가 됐나) · 미션(Sub-task) = Story를 움직이는 분야별 실작업 · Epic = Story들을 묶는 테마.** 진행률은 Story·Epic이 하위 상태로 GitHub이 **자동 롤업**한다 — 손으로 상태를 유지하지 않는다. **타입은 네이티브 Issue Type(Epic/Story/Sub-task/Task), 분야(BE·FE·인프라·디자인)는 라벨, 제목엔 타입·분야 접두어를 안 붙인다.**
- **미션 백로그 = 아직 Sub-task가 안 달린 Story**(또는 위키에 스펙만 있고 Story가 없는 기능). "일 줘 / 미션 만들어"를 받으면 **먼저 열린 Story 중 다음에 밀 것을 고른다**(`gh issue list --repo likelion-khu-official/website --search "type:Story state:open"` 또는 보드). 없는 일을 지어내지 말고, 이미 정의된 기능에서 다음을 고른다.
- **미션의 무엇·왜는 Story·위키에서 나온다.** 대상 Story의 `## 목표`·`## 완료기준`과 그것이 링크한 위키 스펙이 *무엇·왜*다. 미션은 이걸 한 분야의 실행 단위로 옮길 뿐 새로 발명하지 않는다.
- **발주하면 그 미션을 Story에 sub-issue로 걸고 타입을 Sub-task로 찍는다(필수).** Story가 아직 없으면(위키에만 스펙이 있는 새 기능) **먼저 그 기능의 Story를 만들고**(아래 "Story 지연 생성"), 그 밑에 미션을 건다. 진행률·현황은 이 링크로 자동 굴러가니 상태를 손으로 갱신할 일이 없다(그 손유지가 2026-07-15 사고의 원인 — 손유지 트리 `pm/features`를 폐기했다). 사용자 향이 아닌 순수 기술작업(스택 셋업·인프라)은 Story 없이 타입 **Task**로 단다.

### Story 지연 생성 (미션 발주 시, Story가 없으면)
이 기능 슬라이스의 Story 이슈가 아직 없으면 발주 직전에 만든다 — 있으면 재사용(멱등). 타입 지정은 REST: `gh api -X PATCH /repos/likelion-khu-official/website/issues/<#> -f type=<Epic|Story|Sub-task|Task>`.
1. 열린 Story에서 이 기능이 있는지 찾는다: `gh issue list --repo likelion-khu-official/website --search "type:Story"` (또는 해당 테마 Epic의 하위를 본다).
2. 없으면 Story 이슈를 만든다 — 제목은 `<사용자가 ~할 수 있다>`(타입·분야 접두어 없이), 라벨 `area:<테마>`, **assignee·`roadmap` 라벨 없음**(그래야 claim-mission이 안 집는다). 본문 3부: `## 목표`(사용자 가치) · `## 완료기준`(위키·GWT 기반 안정 계약, 진행상태 안 섞고 검증 ID는 블록 끝에 한 줄로) · `## 스펙`(위키 링크만, 인라인 금지). 만든 뒤 타입을 Story로 찍는다.
3. 그 Story를 상위 테마 Epic 밑에 건다(`pm/scripts/link-subissue.sh <Epic#> <Story#>`). 테마 Epic이 없으면 그것도 만든다(제목=테마명, 타입 Epic, 라벨 `area:<테마>`, 본문=테마 목표 한두 줄).
4. 발주한 미션(Sub-task)을 그 Story 밑에 걸고 타입을 찍는다: `pm/scripts/link-subissue.sh <Story#> <미션#>` + `... -f type=Sub-task`.

## 실행 앵커 헤더 (claim-mission 대상 팀은 본문 맨 위 필수)

claim-mission이 도는 팀(FE·BE·인프라)의 `proposal.md`는 **맨 위 첫 줄**에 이 헤더를 넣는다. 미션을 받은 팀원이 뭘 할지 즉시 알게 하는 실행 앵커다.

```
> 🦁 **이 미션 수행** — Claude Code에게 **"나한테 할당된 미션 수행하자"**라고 하면 신원 확인 후 이 미션을 받아 R→P→I→Q로 진행합니다.
```

**디자인처럼 claim-mission 대상이 아닌 팀**(레포 밖·`handle: null`)엔 이 헤더 대신 기존 방식(카톡·Figma 링크 공유)을 쓴다. 헤더 아래로는 그대로 아래 본문 형식(인트로 + 네 부분).

## 본문 형식 (이것만 이슈에 붙여넣음)

이 미션이 뭔지 한두 문장으로 연 뒤, 아래 부분으로 쓴다. **소제목은 영문, 내용은 한국어.**

- **`Target`** — 이 미션이 전진시키는 **Story 이슈**(기능 슬라이스). Story 이슈 링크(예: `#179`)로 건다 — 미션은 반드시 한 Story의 sub-issue(타입 Sub-task)가 된다(이게 미션↔제품 현황을 잇는 고리다). Story가 아직 없으면 위 "Story 지연 생성"으로 먼저 만든다. `Deliverable`·`Why`·`Done`은 이 Story의 `## 완료기준`과 그것이 링크한 위키 스펙에서 파생한다.
- **`Deliverable`** — 구체적 결과물과 어디에 남는지 (PR·문서·Figma·실서버 URL 등).
- **`Why it matters`** — 목표와 맥락. 좋은 판단을 하라고 주는 것.
- **`Done`** — 이게 되면 끝. 체크 가능한 *결과 상태*. 단계가 아니다.
- **`Notes`** — 따라야 할 것·다른 팀과의 접점·하지 말 것. "어떻게 할지는 팀이 정한다"도 여기.
- (브리프 내장이 필요한 팀은 맨 위에 **`Brief`**)

> **레포 밖에서 일하는 팀(디자인=Figma)**에는 `brief.md`를 *가리키지* 말고, 필요한 맥락(무엇·왜·누구·범위)을 본문에 풀어 넣어 **자기완결**로 만든다. 레포에서 일하는 팀(FE·BE·인프라)은 `brief.md` 참조로 충분.

## GitHub 렌더링 (정돈된 모양으로)
- 제목은 `## <미션 한 줄>`(타입·분야 접두어 없이 — 타입은 네이티브 Issue Type, 분야는 라벨), 한두 문장 인트로, 그 아래 구분선(`---`).
- **`Done`**은 체크박스로: `- [ ] …` (GitHub에서 실제 체크 가능).
- **`Why it matters`**는 `> [!IMPORTANT]` 콜아웃 박스로.
- **`Notes`**의 핵심 가이드(결정 성격·타임박스 등)는 `> [!TIP]`/`> [!NOTE]` 콜아웃, 나머지는 일반 불릿.
- 콜아웃은 1~2개만 (남발하면 강조가 죽는다). **이모지 도배 금지.**
- **줄바꿈 주의:** GitHub은 단일 줄바꿈을 무시한다. 라벨 여러 줄을 나열할 땐 *불릿(`- `)*으로 쓰거나, 문단 사이에 *빈 줄*을 넣어야 줄이 갈라진다.

## 문체 — 가장 중요 (안 지키면 안 읽힌다)
- **자연스러운 완결 문장으로 써라.** 신입이 한 번 읽고 바로 이해되게.
- 기호로 잇지 마라: `=`·`+`·`→`·`·` 나열이나 괄호로 욱여넣은 전보체 금지. 동사가 있는 문장으로 풀어 써라.
- 약어·전문용어는 풀어서 한 번 설명. *짧게 쓰되, 읽히게* 짧게.

## 품질 루브릭 (저장/생성 전 자가검증)
- **대상 Story** — `Target`이 실재 Story 이슈를 가리키나. 없으면 미션이 Story에 안 걸린다(→ 위 "Story 지연 생성"으로 먼저 만든다).
- **만들 것** — 모호 금지("개선" ❌). 구체적 산출물과 어디에 남는지.
- **왜** — 반드시 있다. 빠지면 받는 사람이 맹목 실행.
- **다 됐다고 볼 기준** — *가장 중요.* 체크 가능한 **결과 상태**여야 한다. "잘 만든다" ❌ → "엔티티 7가지 필드 초안이 나온다" ⭕. 단, **단계를 적지 마라**(그건 팀의 학습).
- **금지** — 할 일 체크리스트·구현 단계 작성 금지. 미션은 *무엇·왜*지 *어떻게*가 아니다.

루브릭을 못 채우면 PM에게 1개 질문으로 메꿔라(특히 완료기준이 두루뭉술할 때).

## 필드 (GitHub 사이드바 / gh 플래그)
- 제목: `<미션 한 줄>` — **타입·분야 접두어를 붙이지 않는다.** 타입은 GitHub 네이티브 Issue Type(Sub-task/Task) 뱃지로, 분야는 라벨(`BE`/`FE`/`인프라`/`디자인`)로 표시된다. **날짜도 제목에 안 넣는다** — 목표일은 보드 필드(`mission-fields.sh`)에 산다(제목="무엇", 타입·분야·일정=필드/라벨).
- **어사인 = 특정 1인의 handle.** "해당 팀"이 아니라 *그 미션을 실제로 할 한 사람*을 지목한다. 이 assignee가 라우팅의 전부다 — 클레임(claim-mission)이 `assignee == 내 handle`인 이슈만 가져가기 때문에, 팀만 맞고 사람이 비면 아무도 못 받는다.
  - handle은 **`pm/roster.yml`에서 조회**한다(하드코딩 금지 — 이름·팀·handle의 단일 진실). 대상자의 `members[].handle`을 쓰고, 그 사람의 `team`이 미션 분야와 **일치**하는지 확인한다(예: 분야 라벨이 `BE`인 미션이면 assignee의 team이 `BE`).
  - **디자인 예외**(`handle: null`): GitHub 계정이 없어 assignee를 못 건다. 이슈에 assignee 없이 두거나 GitHub 이슈 자체를 만들지 않고, 미션 본문을 카톡·Figma 링크로 공유한다(아래 "레포 밖 팀" 경로). 이 경로는 claim-mission 대상이 아니다 — 깨지 말 것.
- **인당 열린 미션 1개(원칙).** 새로 발주하기 전에 그 사람 앞으로 이미 열린(roadmap 라벨 + open 상태) 미션이 있는지 확인한다:
  ```
  gh issue list --repo likelion-khu-official/website --assignee <handle> --label roadmap --state open
  ```
  이미 있으면 **PM에게 한 번 확인**한다 — "○○님은 지금 #n을 진행 중이에요. 이것도 같이 맡길까요, 아니면 다른 사람/다음으로 미룰까요?" 겹치기로 확정되면 진행하되, 조용히 겹치게 두지 않는다.
- **요청자(작성자) = 김우진(@xhae123)** · 라벨: `roadmap` + **분야 라벨**(`디자인`/`FE`/`BE`/`인프라`) · 네이티브 타입 `Sub-task`(순수 기술작업이면 `Task`)
  - 이 두 라벨이 **미션 뱃지**다. 클레임은 `roadmap` 라벨로 "이건 미션 이슈"임을 식별한다 — 유지 필수.
- Team · 목표일: GitHub Projects 필드(생성 후 설정)

> **발주 ↔ 클레임 계약 (요약):** 팀원은 Claude Code에서 `claim-mission`을 돌려, 로컬 신원(`/.identity.local.yml`)의 handle이 `roster.yml`의 누구인지 대조한 뒤 `assignee == 내 handle` + `roadmap` 라벨인 이슈를 자기 미션으로 가져간다. 그래서 발주가 (1) assignee를 **정확한 1인 handle**로, (2) `roadmap`+분야 라벨을, (3) 본문 맨 위에 **실행 앵커 헤더**(위 "실행 앵커 헤더" 참고)를 심어야 클레임이 미션을 찾고 바로 실행에 들어간다. 발주자(PM)는 개인 `/.identity.local.yml`에 관여하지 않는다.

---

# 미션 박스 — 한 미션의 전 생애 맥락

미션은 *던지고 끝*이 아니다. 미션 하나 = **상자(`pm/missions/<번호>-<슬러그>/`)**. 그 안에 제안→진행→결과의 일련 맥락이 쌓인다. 이게 다음 세션의 AI가 먹을 맥락이다.

```
pm/missions/<n>-<slug>/
  proposal.md   ← 던진 미션 (필드 ⚙️ + 본문). 던진 뒤엔 동결.
  log.md        ← 진행 맥락. PM이 판단·결정한 것만 시간순.
  result.md     ← 맺은 결과 + 배운 것.
```

> **불변식(역할 분담):** GitHub 이슈 = 팀의 *실시간 협업*(코멘트·PR·체크박스). 박스 = PM쪽 *정제된 맥락 아카이브*. 박스는 GitHub 복붙이 **아니다** — 안 그러면 이중관리로 죽는다.

`<slug>` = 제목을 영문 케밥으로 짧게(예: `backend-stack-setup`). `<n>` = GitHub 이슈 번호(던진 뒤 확정).

## 라이프사이클 — 무슨 말에 무엇을

### 1) 새 미션 작성 (아직 안 던짐)
1. PM 설명을 받아 위 본문 형식으로 작성 → 루브릭 자가검증.
2. `pm/missions/<slug>/proposal.md` 생성 (**번호 없이** 슬러그만). 필드 줄(⚙️) + `---` + **실행 앵커 헤더**(claim-mission 대상 팀이면) + 본문. → PM 검토 게이트.

### 2) "던져"
GitHub이 번호의 단일 진실 → **던진 뒤 번호를 붙인다**(미리 추측 금지, 레이스).

던지기 전 **assignee를 roster에서 확정**한다: `pm/roster.yml`에서 대상자의 `handle`을 찾고, 그 사람의 `team`이 미션 팀과 일치하는지 확인(불일치·미지정이면 PM에게 누구인지 1개 질문). `handle: null`(디자인)이면 assignee를 걸지 않고 레포 밖 경로(카톡·Figma)로 공유 — `gh issue create`를 돌리지 않는다.
```
gh issue create --assignee <roster에서 찾은 1인 handle> --label roadmap --label <분야> \
  --title "…" --body-file pm/missions/<slug>/proposal.md
```
던지고 나면 — **아래 6개는 한 묶음. 4를 빼먹으면 미션이 보드 밖에, 6을 빼먹으면 Story/롤업 밖에 떠서 안 보인다(실제로 한 번 났다).**
1. 반환된 이슈 번호 #n으로 폴더 rename: `pm/missions/<slug>/` → `pm/missions/<n>-<slug>/`.
2. proposal.md 맨 위에 이슈 URL 한 줄 박기.
3. `log.md`·`result.md` 스텁 생성(아래 템플릿).
4. **보드에 올린다 — 던지기의 일부지 "그다음 할 일"이 아니다.** `gh issue create`는 이슈만 만들고 Project엔 자동 연결하지 않는다. 곧바로 이어서:
   ```
   gh project item-add 1 --owner likelion-khu-official --url <반환된 이슈 URL>
   ```
   그다음 Team·Status(Todo)·시작일·목표일 필드 세팅은 **project-board 스킬**의 좌표·field-id로.
5. **검증(누락 방지):** 던진 직후 카드가 실제로 붙었는지 확인. `0`이면 4를 안 한 것 — 다시 올린다.
   ```
   gh issue view <n> --repo likelion-khu-official/website --json projectItems --jq '.projectItems|length'
   ```
6. **상위 Story에 sub-issue로 걸고 타입을 찍는다(필수).** 이 미션의 `Target` Story 밑에 연결하고 네이티브 타입을 Sub-task로 — Story가 없었으면 위 "Story 지연 생성"으로 먼저 만들고 건다.
   ```
   pm/scripts/link-subissue.sh <Story#> <n>
   gh api -X PATCH /repos/likelion-khu-official/website/issues/<n> -f type=Sub-task
   ```
   빼먹으면 미션이 Story/롤업 밖에 떠서 현황에 안 잡힌다.
- 전제: 레포가 origin에 push됨 + `gh` 인증.

### 3) "로그 남겨 / 이거 기록해"
해당 박스 `log.md`에 시간순 추가. `## YYYY-MM-DD` 아래 일어난 일 / 결정 / **왜**. PM이 판단·결정한 것만 — GitHub 코멘트 받아쓰기 아님.

### 4) "결과 정리 / 회고 / 미션 닫아"
`result.md`에 산출물·결정·배운 것. 다음에도 쓸 통찰은 `pm/docs/learnings.md`로 **졸업**시킨다(박스엔 이 미션 고유 결과만). 보드 Status는 project-board 스킬로 Done.

**현황은 자동으로 갱신된다 — 손으로 트리를 고치지 않는다.** 미션(Sub-task)을 닫으면 상위 Story의 진행률이 자동 롤업되고, 그 Story의 하위가 다 닫히면 Story를, 그 테마의 Story들이 다 닫히면 Epic을 닫는다(→ project-board / tidy-missions 스킬). 예전의 손유지 상태 트리(`pm/features`)는 폐기됐다 — 발주·닫기 때 상태 색을 칠할 일이 없다.

**이 미션이 전진시킨 기능에 `pm/qa/verification/<기능>.md`가 있으면(=GWT 커버 대상) 검증 결과도 같이 갱신한다.** 이번 변경으로 시나리오 결과(pass/fail/not-run)가 바뀌었으면 근거와 함께 고친다 — 작성 규칙은 `pm/qa/GUIDE.md`. 이 미션이 머지한 PR 번호가 criteria의 `status: pr-###`에 있으면 `dev`로 바꾸고, "PR #### 코드 리뷰(머지 전)" 근거의 pass는 `not-run`(재확인 필요)으로 되돌린다. 대상 기능이 아직 GWT 커버 밖(현재 익명 방문자 관점만 있음)이면 해당 없음.

## 스텁 템플릿 (던질 때 생성)
`log.md`:
```
# 진행 로그 — #<n> <분야> · <미션 한 줄>

> PM이 판단·결정한 것만 시간순. GitHub 코멘트 복붙 아님.
> 형식: `## YYYY-MM-DD` 아래 일어난 일 / 결정 / 왜.

<!-- 아직 없음 -->
```
`result.md`:
```
# 결과 — #<n> <분야> · <미션 한 줄>

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
## 결정
## 배운 것
```

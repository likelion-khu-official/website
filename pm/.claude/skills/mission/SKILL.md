---
name: mission
description: >-
  Write a high-quality PM mission (roadmap work-item) assigning work to a team
  (디자인/프론트/백엔드/인프라). Use when the PM(김우진) wants to assign work, draft or
  throw a roadmap issue, or says "미션 만들어 / 이슈 만들어 / 일 줘 / 일감". Also manages the
  mission's whole lifecycle in its box (pm/missions/<n>-<slug>/): "던져"(throw), "로그
  남겨"(log progress), "결과 정리 / 미션 닫아"(write result). Produces the 4-section body
  무엇(산출물) / 왜 / 완료기준 / 경계 — NO step-by-step task list (steps are the team's,
  that is their learning) — and ENFORCES a concrete, checkable 완료기준.
  Author/요청자 is 김우진. Not for escalation (team→PM) — that is the ask-pm skill.
---

# mission — 고품질 PM 미션 이슈를 쓴다

PM이 한 팀에 줄 일을 *미션*으로 쓴다. 단계 지시가 아니라 **무엇·왜·완료기준·경계**. 받는 사람이 *"뭘 내놓고, 뭐가 되면 끝"*을 즉시 알게 하는 게 목표.

## 본문 형식 (이것만 이슈에 붙여넣음)

이 미션이 뭔지 한두 문장으로 연 뒤, 네 부분으로 쓴다. **소제목은 영문, 내용은 한국어.**

- **`Deliverable`** — 구체적 결과물과 어디에 남는지 (PR·문서·Figma·실서버 URL 등).
- **`Why it matters`** — 목표와 맥락. 좋은 판단을 하라고 주는 것.
- **`Done`** — 이게 되면 끝. 체크 가능한 *결과 상태*. 단계가 아니다.
- **`Notes`** — 따라야 할 것·다른 팀과의 접점·하지 말 것. "어떻게 할지는 팀이 정한다"도 여기.
- (브리프 내장이 필요한 팀은 맨 위에 **`Brief`**)

> **레포 밖에서 일하는 팀(디자인=Figma)**에는 `brief.md`를 *가리키지* 말고, 필요한 맥락(무엇·왜·누구·범위)을 본문에 풀어 넣어 **자기완결**로 만든다. 레포에서 일하는 팀(FE·BE·인프라)은 `brief.md` 참조로 충분.

## GitHub 렌더링 (정돈된 모양으로)
- 제목은 `## [팀] — 미션 한 줄`, 한두 문장 인트로, 그 아래 구분선(`---`).
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
- **만들 것** — 모호 금지("개선" ❌). 구체적 산출물과 어디에 남는지.
- **왜** — 반드시 있다. 빠지면 받는 사람이 맹목 실행.
- **다 됐다고 볼 기준** — *가장 중요.* 체크 가능한 **결과 상태**여야 한다. "잘 만든다" ❌ → "엔티티 7가지 필드 초안이 나온다" ⭕. 단, **단계를 적지 마라**(그건 팀의 학습).
- **금지** — 할 일 체크리스트·구현 단계 작성 금지. 미션은 *무엇·왜*지 *어떻게*가 아니다.

루브릭을 못 채우면 PM에게 1개 질문으로 메꿔라(특히 완료기준이 두루뭉술할 때).

## 필드 (GitHub 사이드바 / gh 플래그)
- 제목: `[팀] <미션 한 줄> (~목표일)`   (팀 = 디자인/FE/BE/인프라)
- 어사인: 해당 팀원 · **요청자(작성자) = 김우진(@xhae123)** · 라벨: `roadmap` + **팀 라벨**(`디자인`/`프론트`/`백엔드`/`인프라`)
- Team · 목표일: GitHub Projects 필드(생성 후 설정)

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
2. `pm/missions/<slug>/proposal.md` 생성 (**번호 없이** 슬러그만). 필드 줄(⚙️) + `---` + 본문. → PM 검토 게이트.

### 2) "던져"
GitHub이 번호의 단일 진실 → **던진 뒤 번호를 붙인다**(미리 추측 금지, 레이스).
```
gh issue create --assignee <팀원핸들> --label roadmap --label <팀> \
  --title "[팀] … (~목표일)" --body-file pm/missions/<slug>/proposal.md
```
던지고 나면 — **아래 5개는 한 묶음. 4를 빼먹으면 미션이 보드 밖에 떠서 칸반에 안 보인다(실제로 한 번 났다).**
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
- 전제: 레포가 origin에 push됨 + `gh` 인증.

### 3) "로그 남겨 / 이거 기록해"
해당 박스 `log.md`에 시간순 추가. `## YYYY-MM-DD` 아래 일어난 일 / 결정 / **왜**. PM이 판단·결정한 것만 — GitHub 코멘트 받아쓰기 아님.

### 4) "결과 정리 / 회고 / 미션 닫아"
`result.md`에 산출물·결정·배운 것. 다음에도 쓸 통찰은 `pm/docs/learnings.md`로 **졸업**시킨다(박스엔 이 미션 고유 결과만). 보드 Status는 project-board 스킬로 Done.

## 스텁 템플릿 (던질 때 생성)
`log.md`:
```
# 진행 로그 — #<n> <팀> · <미션 한 줄>

> PM이 판단·결정한 것만 시간순. GitHub 코멘트 복붙 아님.
> 형식: `## YYYY-MM-DD` 아래 일어난 일 / 결정 / 왜.

<!-- 아직 없음 -->
```
`result.md`:
```
# 결과 — #<n> <팀> · <미션 한 줄>

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
## 결정
## 배운 것
```

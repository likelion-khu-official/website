---
name: ask-pm
description: >-
  Escalate a PM-decision to 김우진(PM, @xhae123) by opening a GitHub issue.
  Use PROACTIVELY and IMMEDIATELY — without asking the user first — the moment a
  team member hits a question that is the PM's responsibility, NOT a technical one.
  DO escalate (PM-domain): scope ("should we build this / is it in scope?"),
  priority ("which first?"), product direction (brief is ambiguous about what
  something should do), a cross-team tradeoff that can't be settled at team level
  (e.g. design intent vs implementation feasibility), a change needing a PM gate
  (new dependency, directory/structure change, or a shared/ contract change that
  affects another team), or being blocked waiting on another team's deliverable.
  Do NOT escalate (the team solves these — that is the learning): technical how-to,
  bugs, debugging, library usage, or any implementation choice inside the team's
  own ownership.
---

# ask-pm — PM 결정 사항을 이슈로 즉시 올린다

팀원이 **PM이 결정해야 할 것**(무엇·왜·우선순위·범위)에 부딪혔을 때, 멈추거나 멋대로 정하지 않게 — 그 질문을 PM(@xhae123) GitHub 이슈로 **즉시** 올린다. 확인 받지 말고 빠르게.

## 1. 발동 전 자가점검 (즉시)
- 이게 **무엇·왜·우선순위·범위**(PM) 문제인가, **어떻게**(팀) 문제인가? → *어떻게*면 발동하지 말고 그냥 도와라. 기술 난이도·버그·구현 선택은 팀의 학습이다.
- 답이 `pm/docs/brief.md`·`pm/docs/learnings.md`·`shared/`에 이미 있나? → 있으면 올리지 말고 그 답을 알려줘라.
- 둘 다 아니면 → PM 결정이다. 즉시 올린다.

## 2. 결정으로 포장한다 (열린 질문 금지)
"어떻게 하죠?"가 아니라 **"A냐 B냐, 팀 추천은 A"**로 만든다. PM이 한 글자로 답할 수 있게 하는 것이 핵심이다.

## 3. 이슈 생성
현재 레포에 `gh`로 즉시 생성한다(레포는 origin에서 자동 인식). 제목 `[ASK-PM] <한 줄>`, **@xhae123 어사인**.

본문 형식:
```
## 결정 필요 (PM)
<무엇을 정해야 하나, 한 줄>

## 맥락
- 팀/사람: <예: BE / 홍길동>
- 작업: <무슨 미션·작업 중>
- 부딪힌 지점: <왜 막혔나>

## 왜 PM 결정인가
범위 / 우선순위 / 제품방향 / 크로스팀 / 게이트 / 조율   (해당 하나)

## 선택지 + 팀 추천
- A) … ← 팀 추천
- B) …
→ 골라주세요.

## 그동안 팀은
<병렬로 할 수 있는 것, 또는 "정해질 때까지 블록">
```

명령 예:
```
gh issue create --assignee xhae123 \
  --title "[ASK-PM] 지원폼에 학번 필드를 넣을지" \
  --body "$(cat <<'EOF'
## 결정 필요 (PM)
지원폼에 '학번' 필드를 받을지

## 맥락
- 팀/사람: BE / 홍길동
- 작업: 지원폼 데이터 모델
- 부딪힌 지점: 브리프에 지원 항목이 안 정해져 있음

## 왜 PM 결정인가
제품방향 (무엇을 받을지)

## 선택지 + 팀 추천
- A) 이름·학과·지원동기만 ← 팀 추천(최소)
- B) + 학번
→ 골라주세요.

## 그동안 팀은
필드 무관한 폼 제출·검증 로직 먼저 진행
EOF
)"
```

## 4. 올린 뒤
사용자에게 한 줄로 보고한다(확인이 아니라 사후 통지): **"PM 결정 사항이라 #<번호>로 올렸어요. 그동안 <병렬 작업> 진행하면 됩니다."**

## 규칙
- 기술 난이도·버그·구현 선택엔 **절대 발동 금지** — 그건 팀의 학습이다.
- 확인 묻지 말고 **즉시 생성**. 단 *무엇을 올렸는지*는 사용자에게 투명하게 알린다.
- 열린 질문이 아니라 **선택지 + 팀 추천**으로 포장한다.
- 전제: 레포가 origin에 push돼 있고 `gh`가 인증됨. 안 되면 그 사실을 사용자에게 알려라.

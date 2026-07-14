> 이슈: https://github.com/likelion-khu-official/website/issues/100

⚙️ 제목 `[백엔드] [테스트] claim-mission 플로우 검증 (~7/11)` · assignee `@xhae123` · 라벨 `roadmap`+`백엔드` · Team `백엔드` · 시작 2026-07-11 · 목표 2026-07-11

---

> 🦁 **이 미션 수행** — Claude Code에서 `claim-mission` 실행 → 신원 확인 후 이 미션을 받아 R→P→I→Q로 진행합니다.

## [백엔드] — claim-mission 발주·클레임 플로우가 실제로 도는지 테스트

이 미션은 **하네스 테스트용**이다. 실제 제품 기능을 만드는 게 아니라, PM이 미션을 던지면(mission 스킬) 팀원이 `claim-mission`으로 그 미션을 받아 R→P→I→Q 루프의 첫 게이트까지 문제없이 도달하는지를 한 바퀴 돌려 확인하는 것이 목적이다.

---

### Deliverable

`claim-mission`을 실행해 이 미션을 자기 큐에서 찾아 받고, 신원 확인(Step 0)과 미션 확정(Step 1), 착수(Step 2, 보드 카드 In Progress)를 거쳐 **RP 게이트**까지 도달한 스크린샷 또는 대화 로그 한 편. 별도 코드 산출물은 필요 없다 — 파이프라인이 끝까지 이어지는지가 결과물이다.

### Why it matters

> [!IMPORTANT]
> 발주(mission)↔클레임(claim-mission)은 이 팀 운영의 핵심 배관이다. 실제 미션을 팀원에게 쏘기 전에, 이 두 스킬이 assignee 라우팅·roadmap 라벨·보드 카드 이동까지 실제로 맞물려 도는지 한 번은 실물로 확인해 둬야 첫 진짜 미션에서 새는 곳이 안 생긴다.

### Done

- [ ] `claim-mission`이 이 이슈를 "내 미션"으로 정확히 집어냈다 (assignee·roadmap 필터가 동작).
- [ ] 착수 시 보드 카드가 Todo → In Progress로 이동했다.
- [ ] R(research) 요약과 함께 RP 게이트에서 정상적으로 멈춰 사람 승인을 기다렸다.
- [ ] 위 과정에서 막힌 지점(에러·누락 필드·인증 실패 등)이 있으면 무엇이었는지 기록됐다.

### Notes

> [!NOTE]
> 어떻게 검증할지는 팀이 정한다. 이 미션의 초점은 "플로우가 도는가"이므로, 실제 코드 변경이나 PR은 만들지 않아도 된다. RP 게이트까지 확인했으면 그 자리에서 멈추고 결과를 PM에게 알린다.

- 테스트가 끝나면 이 이슈와 보드 카드는 PM(@xhae123)이 정리(Close·Done)한다.
- 진행 중 배관 문제(스크립트 에러·필드 id 불일치 등)를 발견하면 그게 이 미션의 진짜 수확이다 — 반드시 남긴다.

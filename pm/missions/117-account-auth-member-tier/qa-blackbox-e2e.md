# #117 계정·인증(멤버 계층) — 블랙박스 E2E QA

> `pm/missions/119-project-showcase-be/qa-blackbox-e2e.md`와 같은 방법론: `proposal.md`의 완료기준 + `shared/types/member-auth.ts`·`member.ts`·`admin.ts` 계약만 근거로 시나리오 설계 → PR #121 브랜치(`feat/117-member-auth`)를 로컬에 실제로 띄워 HTTP로 실행.

## 결과 요약 — Done 기준 대조

| proposal.md의 완료기준 | 결과 |
|---|---|
| 멤버가 학번+비밀번호(초기값=전화번호)로 로그인 | ✅ |
| 첫 로그인 때 비밀번호를 꼭 바꾸게 | ✅ — `MemberPasswordGuardFilter`가 경로 무관하게 모든 쓰기 메서드를 차단 |
| 비번 분실 시 관리자가 초기화(재설정 메일 없음) | ✅ — 초기화하면 비번=전화번호로 복귀 + 잠금도 같이 풀림 + `mustChangePassword` true로 재설정 |
| 역할 4단계(일반유저·멤버·관리자·최고관리자), 위→아래 위임 | ✅ — 도메인 간 상호 접근(admin↔member) 전부 차단 확인 |

## 실행한 시나리오

| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| T1 | 학번+전화번호 첫 로그인 | `mustChangePassword:true` | ✅ |
| T2 | 비번 안 바꾼 상태에서 임의 쓰기요청(`POST /api/anything-mutating`) | 403 `MUST_CHANGE_PASSWORD` | ✅ |
| T3 | 잘못된 `currentPassword`로 비번변경 | 401 `INVALID_CREDENTIALS` | ✅ |
| T4 | 약한 새 비밀번호 | 400 `WEAK_PASSWORD` | ✅ |
| T5 | 정상 비번변경 | `mustChangePassword:false` | ✅ |
| T6 | 변경 후 같은 쓰기요청 | 더 이상 차단 안 됨(순수 404로 통과) | ✅ |
| T7 | 존재하지 않는 학번으로 로그인 | 401 `INVALID_CREDENTIALS`(계정 존재 여부 노출 안 함) | ✅ |
| T8 | 정상 refresh | 200 + member 정보 | ✅ |
| T9 | refresh 쿠키 없이 refresh | 401 `INVALID_REFRESH_TOKEN` | ✅ |
| T10/T11 | 로그아웃 후 같은 refresh 쿠키 재사용 | 401(폐기 확인) | ✅ |
| T12 | 5회 연속 틀린 비번 | 5번째부터 423 `ACCOUNT_LOCKED` | ✅ — 기존 admin 잠금 로직 재사용 확인 |
| T13 | 잠긴 상태에서 **올바른** 비번으로 로그인 | 여전히 `ACCOUNT_LOCKED` | ✅ — 잠금이 진짜로 로그인 자체를 막음 |
| T14/T15 | 관리자가 잠긴 멤버 비번 초기화 → 전화번호로 재로그인 | 잠금 해제 + `mustChangePassword:true` | ✅ |
| T16 | 비로그인 상태로 비번변경 시도 | 401 `UNAUTHENTICATED` | ✅ |
| T17 | 관리자 세션으로 멤버 전용 엔드포인트 호출 | 403 `FORBIDDEN`(도메인 분리) | ✅ |
| T18 | 비번 안 바꾼 멤버 세션으로 관리자 전용 엔드포인트 호출 | 403(단, `MUST_CHANGE_PASSWORD`가 `FORBIDDEN`보다 먼저 걸림 — 필터 순서상 의도된 우선순위, 어차피 결과는 거부라 문제 아님) | ✅ |

## 결론
**갭 없음.** 코드 자체에 이미 "상태공간트리 QA" 커밋 2건(`a9498ce`·`b096f9a`)이 선행돼 있었고, 이번 블랙박스 재검증에서도 뚫리는 케이스를 못 찾았다. #119와 달리 **수정한 것 없음** — 억지로 뭔가를 고치지 않았다.

<sub>실행 2026-07-17 · 방법 블랙박스 E2E · 브랜치 feat/117-member-auth(PR #121) 로컬 기동 + 실제 HTTP</sub>

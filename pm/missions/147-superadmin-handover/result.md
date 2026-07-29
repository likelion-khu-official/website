# 결과 — #147 BE · 최고관리자 승계 — 자리를 다음 사람에게 넘기기

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- PR [#282](https://github.com/likelion-khu-official/website/pull/282) (`feat/super-admin-handover` → `dev`) — 아직 머지 전, 프론트팀(박일하·김현정) 리뷰 승인 대기 중.
- 백엔드: `POST /api/admin/admins/{id}/handover` (SUPER_ADMIN 전용). 승급+강등을 한 트랜잭션으로 묶어 원자적으로 처리(`AdminManagementService.handover`). 자기자신 대상(400 `HANDOVER_SELF_TARGET`)·대상이 ADMIN 아님(409 `HANDOVER_TARGET_NOT_ADMIN`)·대상 없음(404)을 거부 — 세 경우 모두 mutation 이전에 예외를 던져 아무 것도 안 바뀜을 보장. 넘긴 뒤 양쪽 refresh 토큰 정리(기존 역할변경과 동일 수준).
- 계약: `shared/types/admin.ts`에 `AdminHandoverResponse` + 에러코드 2종(`HANDOVER_SELF_TARGET`·`HANDOVER_TARGET_NOT_ADMIN`) 추가.
- 프론트: `AdminDashboard.tsx`에 "자리 넘기기" 버튼 → 대상 선택(운영진만) → "되돌릴 수 없습니다" 확인 화면 → 확정 시 자동 로그아웃. 별도 모달 라이브러리 없이 기존 인라인 패널 패턴을 그대로 따름.
- 테스트: `AdminManagementControllerTest`에 5개 케이스 추가(성공/자기자신/대상비관리자/대상없음/권한없음), 전체 12개 통과. 백엔드 전체 스위트 343개 중 실패 7개는 전부 Docker(Testcontainers/Mailpit) 필요한 기존 이메일 테스트 — 이 환경에 Docker가 없어 원래도 실패, 이번 변경과 무관.
- 스키마 변경 없음(신규 테이블·컬럼 없음) — Flyway 마이그레이션 불필요.

## 결정
- **"최고관리자 정확히 1명" 불변식은 이 handover 쌍(현재↔대상)의 원자적 전이로만 보장하고, 시스템 전체에 "지금 SUPER_ADMIN이 정확히 1명이어야 handover 허용" 같은 사전조건은 넣지 않았다.** 기존 코드베이스가 이미 "최소 1명"(복수 SUPER_ADMIN 허용) 모델이고, 미션 Notes도 "기존 불변식은 안 깬다"고 명시했기 때문 — 새 사전조건은 Done에 없는 확장이라 넣지 않음(YAGNI).
- **자기자신 거부를 "대상은 ADMIN이어야 함" 검증과 별개의 명시적 체크로 분리**했다. 호출자가 SUPER_ADMIN이라 자기자신을 대상으로 하면 role 검증만으로도 어차피 걸리지만, Done이 "자기자신 거부"를 별도 항목으로 요구했고 더 명확한 에러코드(`HANDOVER_SELF_TARGET` vs `HANDOVER_TARGET_NOT_ADMIN`)를 프론트가 구분할 수 있어야 해서 분리.
- **확인 화면은 별도 모달 컴포넌트/라이브러리를 새로 만들지 않고, 기존 초대 폼과 같은 인라인 패널 패턴(2단계: 대상선택→확인)으로 구현.** 이 레포에 모달 시스템이 없고, YAGNI상 이 미션 하나 때문에 새로 들일 이유가 없었음.
- **실제 브라우저 클릭 테스트는 생략.** 로컬에서 이메일 발송 없이 SUPER_ADMIN 계정을 만들려면 DB에 직접 bcrypt 해시를 심어야 하는 등 비용이 커서, 백엔드 통합테스트(실제 DB·시큐리티필터 포함)와 프론트 `tsc`/`eslint`/`next build`로 대체했다 — PR에 이 한계를 명시하고 프론트팀에게 실제 화면 확인을 요청함.
- **미션 이슈(#147)는 지금 안 닫음.** Done의 마지막 항목이 "프론트팀 승인"이라 PM(claim-mission 스킬)과 무관하게 미션 정의 자체가 외부 승인을 완료조건에 넣었음 — PR만 올리고 이슈엔 상태 코멘트만 남김. 승인 후 이슈를 닫는 건 후속 조치로 남음.

## 배운 것
`pm/docs/learnings.md`로 졸업: 테스트 애노테이션의 컴파일타임 `id()` 한계와 우회법, SQLite 단일 커넥션 풀이 다중 엔티티 원자적 전이를 별도 락 없이 보장해주는 이유.

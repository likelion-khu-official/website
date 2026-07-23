# 결과 — #76 백엔드 · 멤버 API — 멤버 데이터 · 최고관리자 관리

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- PR [#98 feat(backend): 멤버 API — 목록 조회·생성·수정 + shared 계약](https://github.com/likelion-khu-official/website/pull/98) — 머지 2026-07-11, 작성 안시현(@xihxxn). 이슈 #76은 같은 날(2026-07-11) CLOSED.
- 엔드포인트 3종: `GET /api/members`(공개 전체 목록) · `POST /api/admin/members`(생성, 랜덤 이모지 배정 + `created_by` 기록) · `PATCH /api/admin/members/{id}`(수정 + `updated_by` 기록). 관리 API 2종은 `@PreAuthorize("hasRole('SUPER_ADMIN')")`로 최고관리자만.
- 코드: `backend/.../member/`에 Member 엔티티·Controller·Service·Repository·MemberRole·DTO 3종, 테스트 2종(Service 10 + Controller 12 = 22개 통과), `SecurityConfig` 수정.
- 계약: `shared/types/member.ts` 추가(FE↔BE).
- 의존: 최고관리자 권한 체크는 #74/#90(어드민 인증) 계열의 PR #97(JwtAuthenticationFilter) 머지 후 실제 동작. PR #98 시점엔 #97 미머지라 `POST`·`PATCH`의 SUPER_ADMIN 경로는 Postman 실동작 확인이 미완(테스트 코드로는 커버, 이슈 본문 Test Plan 기준).

## 결정
- 불변 필드(`cohort`·`emoji`)는 `MemberUpdateRequest` DTO에서 필드 자체를 빼 전달 경로를 원천 차단. 이모지는 생성 시 서버가 `MemberService.EMOJI_POOL` 상수에서 랜덤 배정.
- 엔티티는 기존 `Post` 패턴 그대로 — 정적 팩토리 + 수동 타임스탬프(JPA Auditing 없음). `roles`는 `@ElementCollection(EAGER)` + `@Enumerated(STRING)`로 별도 `member_roles` 테이블.
- PATCH 규약: `null`=필드 유지, `name:""`=`@Size(min=1)`로 400, `photoUrl:""`=`null` 저장(사진 삭제).

## 배운 것
- (없음)

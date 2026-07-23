# 결과 — #96 백엔드 · 블로그 검수 어드민 (#74 서브)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- **BE — 신규 작업 없음(이미 충족).** `SecurityConfig.java`가 `/api/admin/posts/**`·`/api/admin/comments/**`를 이미 `.authenticated()`로 막고 있고(`permitAll`·`TODO: #74` 주석 소멸), role 게이트는 #90/#97(운영진 인증) 부산물로 이미 완료. 이슈가 발주한 BE 접근제어 항목은 이 미션 착수 시점에 이미 닫혀 있었음.
- **FE — PR #120 리뷰중(아직 OPEN, 미머지).** `feat(fe): 블로그 관리 어드민 화면 — 사후 숨김·재게시 (#96)` (https://github.com/likelion-khu-official/website/pull/120). 어드민 `/admin/blog`에 전체 글 목록 + 숨김/재게시 토글. `BlogManager.tsx`·`lib/adminApi.ts`(`getAdminPosts`·`updatePostStatus`), BE·`shared` 변경 없음. 정적 검증(tsc·lint·`next build`)과 스테이지 백엔드 읽기 검증(응답 형태 `shared` 일치·`GET /api/admin/posts` 401 게이트) 통과. **로그인 필요한 숨김/재게시 실동작은 미확인**(스테이지 글 0개 — 계정·글 있는 사람이 후속 확인 예정).
- 이슈 #96은 07-15 CLOSED, 하지만 **PR #120이 미머지 → FE 산출물은 아직 dev에 안 들어감.**

## 결정
- **07-15 스코프 재정의: "검수(사전 승인)" → "사후 숨김".** 07-14 서비스 위키 결정(#94 클로징, #115)으로 사전검수(관리자 승인 후 게시)가 폐지되고 "로그인 세션이 작성자 보증 → 즉시 게시 + 문제 시 사후 숨김"으로 정책이 뒤집힘. 이슈 본문이 전제한 "승인해야 게시" 워크플로 자체가 사라져, FE는 `DRAFT` 승인 목록이 아니라 **전체 글 목록 + 숨김↔재게시 토글**만 남음(승인 버튼 삭제). BE는 이미 완료 상태로 확인돼 신규 작업 없음.

## 배운 것
- (없음 — 관련 통찰은 backend/docs/member-auth-module.md에 이미 기록됨)

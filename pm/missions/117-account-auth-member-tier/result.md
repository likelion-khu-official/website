# 결과 — #117 백엔드 · 계정·인증(멤버 계층)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- **[PR #121](https://github.com/likelion-khu-official/website/pull/121)** (MERGED 2026-07-20) — 학번 로그인 기반 멤버 계정 체계 본체. Done 4항목 전부 충족:
  1. **학번 + 비밀번호 로그인** (초기 비번=전화번호) — `MemberAuthService`·`MemberAuthController`, #97의 JWT/쿠키/잠금 로직 재사용. ✅
  2. **첫 로그인 강제 비밀번호 변경** — `MemberPasswordGuardFilter`가 미변경 멤버 요청을 서버단에서 차단(FE 안내로는 우회 가능해서 필터로 강제). ✅
  3. **관리자의 비밀번호 초기화** — `POST /api/admin/members/{id}/password/reset` (ADMIN 이상). 전화번호로 되돌리고 첫 로그인 상태로 재진입. 재설정 메일 없음. ✅
  4. **역할 4단** — 기존 `SUPER_ADMIN`/`ADMIN` 2단에 `MEMBER` 추가(일반 유저=비로그인 방문자 포함 4종), 권한은 위→아래로만 위임. ✅
  - 멤버 refresh 토큰은 어드민과 별도 테이블(`member_refresh_tokens`)로 분리 — id 충돌·기존 어드민 흐름 훼손 방지.
  - 미션 조건인 리뷰 게이트(선우·시현 승인) 충족 후 머지. 함께 진행한 코드리뷰에서 멤버 로그인 도입으로 드러난 4건 동반 수정: `/api/admin/posts/**` 권한 상승 차단(`@PreAuthorize`), 404 계약 바디 정합(`MemberNotFoundException`), 비번 변경 시 `currentPassword` 필수화, 전역 가드 필터의 공개 API 오차단 범위 축소(`/api/member/` 네임스페이스로 한정).
  - 설계 결정 기록: `backend/docs/member-auth-module.md`.
- **[PR #132](https://github.com/likelion-khu-official/website/pull/132)** (MERGED 2026-07-20) — 후속 보정. 멤버 로그인 응답(`MemberAccountResponse`)에 `role` 필드 누락(어드민 응답엔 있었음) → FE의 멤버/관리자 화면 분기 값 부재. `JwtProvider.MEMBER_ROLE`을 `public`으로 열어 응답 바디가 JWT 클레임과 같은 상수를 참조하게 함(드리프트 제거), `shared/types/member-auth.ts`에 `MemberAuthRole` 타입 추가.
- 이번 범위 밖(다음 미션): 관리자의 멤버 계정 대량 등록/발급 화면·API(미션 Notes에서 명시적으로 미룸).

## 결정
- **#97 어드민 인증 파운데이션(로그인·JWT·쿠키·비번 처리)을 갈아엎지 않고 그 위에 MEMBER 계층 하나를 얹는 방식** — 미션 발주 조건이자 PR 리뷰 게이트(신선우·안시현 승인)로 강제. 백엔드 인증 컨벤션은 기반을 만든 사람이 판단.
- **첫 로그인 비번 변경을 FE 안내가 아닌 서버 필터로 강제** — 우회 가능성 차단.
- **멤버 refresh 토큰을 별도 테이블로 분리** — 어드민 흐름과 id 충돌·훼손 방지.

## 배운 것
- 로그인 응답 계약 테스트가 `jsonPath(...).value(...)` 식 개별 필드 검증이면 **값 오류는 잡아도 필드 누락은 원리적으로 못 잡는다** — #121 당시 `role` 누락이 안 드러난 원인이자 #132의 재발이 됐다. 나란한 두 응답(어드민 vs 멤버) 스키마를 대조하는 검증이 없으면 사람이 우연히 알아챌 때까지 샌다.

# 결과 — #74 어드민 파운데이션 — 운영진 로그인·초대 기반

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물

파운데이션(로그인·초대·역할·화면 골격)이 BE·FE 양쪽에서 머지됨. 이슈 #74 CLOSED.

- **PR #85** — feat(backend): 이메일 발송 모듈 — email_log 트래킹 + 초대·재설정 템플릿 (#74 선행) — MERGED 2026-07-10 — https://github.com/likelion-khu-official/website/pull/85
  - `likelion.khu.website.email` 패키지: `EmailService`(주소검증 → Thymeleaf 렌더링 → SMTP 발송 → 성공/실패 무조건 `email_log` 기록), 초대·재설정 템플릿, 단위 9 + 통합 3(Testcontainers+Mailpit) 테스트. 머지 시점엔 컨트롤러 미연결(#97이 나중에 호출).
- **PR #97** — feat(backend): 어드민 인증 파운데이션 — 로그인·초대·비밀번호재설정·운영진관리 (#90) — MERGED 2026-07-11 — https://github.com/likelion-khu-official/website/pull/97
  - #74의 실제 BE 구현 스펙 서브이슈 #90(`[BE] 어드민 파운데이션 - 구현 plan`)을 닫음. 이메일=아이디 로그인, JWT를 HttpOnly 쿠키(access 15분·refresh 7일)로 발급, `SUPER_ADMIN`/`ADMIN` 2역할(`@EnableMethodSecurity`+`@PreAuthorize`, 코드베이스 최초 도입), 초대(khu.ac.kr 72h)·재설정(30분), 5회 실패 시 계정 15분 잠금(423), 최소 1명 SUPER_ADMIN 불변식(409), env 기반 초기 시드. `/api/admin/posts/**`·`/api/admin/comments/**`를 `permitAll()` → `authenticated()`로 전환.
- **PR #99** — feat(fe): 어드민 로그인·초대·비밀번호재설정·대시보드 뼈대 (#74) — MERGED 2026-07-13 — https://github.com/likelion-khu-official/website/pull/99 — 본문 `closes #74`
  - `/admin/login`, `/admin`(대시보드 뼈대: 운영진 목록·초대·역할변경·로그아웃), `/admin/invite/[token]`, `/admin/forgot-password`, `/admin/reset-password/[token]`. tsc·eslint·next build·Playwright 통과.

의존(별도 미션): 메일 발송 인프라는 선행 서브이슈 #75(PR #81, OCI Email Delivery)에서 이미 해소돼 있었고, 그 위에 #85가 얹혔다.

배포 상태: 이슈·PR·코멘트에 프로덕션 배포 완료를 단정할 근거는 없음(확인 안 됨). PR #85 본문은 PROD 자격증명 실발송 검증을 "#74 배포 후 나가는 최초의 진짜 초대 메일을 `email_log`로 조회"하는 것으로 대체 예정이라 남겨둠.

## 결정

- **인증 방식: 초대 등록(이메일=아이디 + 링크로 비번 설정) 채택.** 구글 OAuth2 제외(셋업 무게 + 공용 계정 승계 부담), id/pw 단독 제외(비번 생명주기 부담). 초대 등록은 어차피 만드는 메일 인프라 위에 얹히고 초기 비번 유출 지점도 없앰. (log.md 2026-07-05)
- **접근 게이트: 도메인 제한만으론 부족** — 경희대생 전원 khu.ac.kr이라 접근권은 초대/명단 등재가 판단. (log.md)
- **선행 부채 승계(#66 코멘트):** `SecurityConfig`가 `/api/admin/posts/**`·`/api/posts/*/comments/**`·`POST /api/feed/tokens`를 임시 `permitAll`로 열어둔 것을 #74에서 좁히기로 완료조건에 포함. → #97이 `/api/admin/posts/**`·`/api/admin/comments/**`를 `authenticated()`로 전환(본문 명시). `POST /api/feed/tokens` 처리 여부는 PR #97 본문에 명시 없음(확인 안 됨).
- **코드리뷰 중 발견·수정한 실제 버그(#97):** ① 로그인 실패 카운터가 예외 던질 때 Spring 기본 롤백으로 사라져 423이 안 뜨던 것 → `@Transactional(noRollbackFor=...)`. ② 초대 취소가 없는 id에 400을 내던 것 → 토큰 조회 실패(400)와 id 조회 실패(404)를 분리.

## 배운 것

- Spring 기본 롤백 정책이 "예외와 함께 커밋하려던 부수효과(로그인 실패 카운터)"까지 되돌려 계정 잠금이 영영 안 걸리는 함정 — `noRollbackFor`로 명시해야 함. (#97 코드리뷰)
- 성공/실패를 무조건 `email_log`에 남기는 설계는, 실발송을 테스트에서 미리 못 하는 PROD 자격증명 검증을 배포 후 로그 조회로 대체하는 수단이 된다. (#85)

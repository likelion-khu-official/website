# 결과 — #118 프론트 · 멤버 로그인 화면

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- PR [#134](https://github.com/likelion-khu-official/website/pull/134) `feat(fe): 멤버(학번) 로그인 화면 (#118)` — MERGED 2026-07-21 (dev).
  - `/member/login` — 학번 + 비밀번호 로그인 화면 신규.
  - 첫 로그인이면 같은 화면에서 새 비밀번호 단계로 전환 (`mustChangePassword`).
  - `/member/forgot-password` — "관리자에게 문의" 정적 안내 (재설정 메일 흐름 없음).
  - 로그인 성공 시 `Record<MemberAuthRole, string>` 매핑으로 역할별 화면 이동.
  - #99(어드민 로그인)의 `NoticeScreen`·`validateAdminPassword`를 import 재사용, 어드민 파일은 수정 안 함.
- 검증(PR 기재): `tsc --noEmit`·eslint 통과, `/member/login`·`/member/forgot-password` 200, 잘못된 학번/비밀번호 제출 시 에러 메시지 렌더링(Playwright 확인).

## 결정
- 역할별 이동을 `Record<MemberAuthRole, string>` exhaustive 매핑으로 구현 — role 값이 늘면 컴파일 타임에 누락을 잡기 위함(PR 기재).

## 배운 것
- stage 백엔드가 미등록 학번에 401 대신 500을 반환하는 것을 발견 — FE는 폴백 메시지로 처리하나 백엔드(#117) 확인 필요(PR #134 Test plan 기재).

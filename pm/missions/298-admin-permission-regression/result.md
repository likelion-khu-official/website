# 결과 — #298 FE · 단일 관리자 권한 회귀 테스트

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- [PR #422](https://github.com/likelion-khu-official/website/pull/422) — 단일 관리자 화면(#293)이 2단계 권한으로 회귀하지 않게 프론트 테스트로 고정.
- e2e `frontend/e2e/admin-dashboard-permissions.spec.ts`를 단일관리자 모델로 재작성: 모든 관리자 세션이 초대 어포던스를 보고 · 역할 배지/드롭다운 없음 · 비로그인 방문자는 `/admin/login`으로 리다이렉트.
- 유닛 `AdminAccountManagement.test.tsx`에 초대 버튼 노출 명시 assertion 1줄 추가.

## 결정
- **유닛을 회귀 잠금의 본체로, e2e는 브라우저 보강.** 리서치에서 완료기준 6개 중 5개(초대 노출·역할 없음·목록/삭제 role 없음·접근 경계·LAST_ADMIN)가 이미 `AdminAccountManagement.test.tsx`·`AdminShell.test.tsx`에 커버되어 통과 중임을 확인. 실제로 깨져 있던 건 e2e 스펙 하나였다 — 그래서 신규 유닛을 늘리지 않고(중복 회피) e2e 재작성 + 유닛 1줄 보강으로 최소 범위로 끝냄.
- **역할 변경 API는 테스트로 "없음"을 강제할 필요가 없었다.** adminApi에 역할 변경 함수 자체가 없고 `AdminSummary` 타입에 role 필드가 없어 구조적으로 보장된다. UI 부재(최고관리자 배지·combobox 없음) 검증으로 충분.

## 배운 것
- "회귀 방지 테스트를 추가하라"는 미션은 먼저 **이미 있는 테스트부터 훑어야** 한다. 절반 이상이 이미 커버돼 있었고, 진짜 위험은 *옛 모델을 고정하고 있던 낡은 e2e 스펙*이었다 — 없는 테스트를 새로 쓰는 것보다 잘못된 테스트를 걷어내는 게 핵심이었다.
- e2e는 실서버+시드계정(`E2E_*`) 없이는 이 환경에서 실행 불가 — `playwright test --list`로 컴파일·구조만 검증하고 실제 pass는 CI에 맡기는 게 현실적인 분업.

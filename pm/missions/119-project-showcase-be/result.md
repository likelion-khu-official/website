# 결과 — #119 백엔드 · 프로젝트 쇼케이스 API + 계약

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- **PR [#122](https://github.com/likelion-khu-official/website/pull/122)** — MERGED (2026-07-17, dev 반영 커밋 `f75c75b`). 담당 장찬욱(인프라, 이번만 백엔드 대타).
- **공개 목록·상세 API** — `GET /api/projects`(대표 이미지·제목·한 줄 소개·기수·스택), `GET /api/projects/{id}`(이미지 전부·참여 멤버 이름·파트·기수·개발 기간·스택·GitHub 링크). 숨김 프로젝트는 둘 다 제외.
- **멤버 CRUD** — `POST /api/projects`(로그인 멤버, 요청 참여자 목록에 본인 포함 필수), `PATCH`/`DELETE /api/projects/{id}`(참여자만 가능, 비참여자 403 — 참여자면 만든 사람이 아니어도 가능).
- **관리자 숨김** — `PATCH /api/admin/projects/{id}/hidden`(`ADMIN`/`SUPER_ADMIN`, 숨김/복원 양방향, 데이터는 보존).
- **`shared/types/project.ts` 계약** — 요청·응답 타입 전부 정리, `feed.ts`·`member.ts`와 동일 스타일.
- 상태공간트리 기반 QA 기록: `backend/src/test/STATE_SPACE_QA.md`(트리 C), JaCoCo로 교차검증.
- **후속 분리** — 이미지·참여자 부분 추가/삭제 API(`.../images`, `.../participants`)와 OCI 고아 파일 정리는 이슈 Done 범위 밖이라 별도 브랜치 `feat/119-project-images`로 분리(미머지).

## 결정
- **브랜치 의존성** — CRUD가 "로그인한 멤버"를 전제로 해서 #117(멤버 학번 로그인, PR #121) 위에서 작업. #117이 dev에 먼저 머지된 뒤 #122가 뒤따라 머지되는 순서로 진행.
- **리뷰 게이트 미충족(사실 기록)** — 발주문의 "선우·시현 리뷰 승인 없이는 머지 금지" 조건이 실제로는 지켜지지 않았다. `@sunwoo1256`·`@xihxxn`에게 리뷰 요청됐으나 두 분의 approve 기록 없음. 대신 PM(`@xhae123`)이 코멘트로 리뷰 결과를 남겼고, PR은 작성자 본인이 머지(PM 이슈 코멘트 2026-07-21 확인).

## 배운 것
- 멤버 전용 쓰기 가드는 "경로 목록"이 아니라 "쓰기 메서드(POST/PUT/PATCH/DELETE)인가"로 일반화해야 새 멤버 기능마다 구멍이 반복되지 않는다 — `MemberPasswordGuardFilter`가 `/api/member/` 네임스페이스만 봐서 `/api/projects` 쓰기가 `mustChangePassword=true` 멤버에게 뚫렸던 문제에서 나옴(#117 필터에 반영, #122가 상속).

# 결과 — #87 BE · 운영진 소개 API

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- [PR #129](https://github.com/likelion-khu-official/website/pull/129) — 공개 `GET /api/staff`와 운영진 카드 생성·수정·삭제 API, `Staff` 엔티티·서비스·테스트, `shared/types/staff.ts` 계약을 구현했다.
- 목록은 `sortOrder ASC, id ASC`로 안정 정렬하고, 사진은 새 저장 경로를 만들지 않고 기존 `/api/feed/images` 업로드 뒤 URL만 저장한다. 최초 구현은 `SUPER_ADMIN` 쓰기 권한이었고, 이후 단일 `ADMIN` 권한 모델로 통합됐다.

## 결정
- 권한 주체인 admin과 소개 리소스 이름이 충돌하지 않도록 리소스를 `Staff`로 명명했다.
- 전체 멤버 로스터와 운영진 소개 카드는 별도 엔티티로 뒀다. 공개 필드와 교체 주기·소개 목적이 다르기 때문이다.

## 배운 것
- 정렬값만으로 순서를 정할 때 동률 기준이 없으면 DB 반환 순서가 흔들린다. `id` 같은 안정적인 두 번째 정렬키를 계약에 포함해야 화면 순서가 재현된다.

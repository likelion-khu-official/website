# 결과 — #7 백엔드 · 모집 알림 저장 API (walking skeleton)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업시킨다(여기엔 이 미션 고유의 결과만).

## 산출물
- **모집 알림 저장 API** (PR #62, base=dev, 머지됨)
  - `POST /api/notifications/subscribe` (`NotificationController`)
  - 엔티티 `NotificationSubscription` → 테이블 `notification_subscriptions`(email unique, createdAt), SQLite(`jdbc:sqlite:${DB_PATH}`, single-writer 풀=1)
  - `NotificationSubscriptionService`(중복 체크 `existsByEmail`), `GlobalExceptionHandler`로 400 처리
  - 테스트 4종(정상/중복/이메일형식/공백) + `test/resources/application.yml`(인메모리 SQLite)
  - `SecurityConfig`: subscribe·health·swagger permitAll
- **shared 계약 일치** — `shared/types/notification.ts`(request `{email}`, response `{success,message?}`)와 BE DTO 정확히 일치, FE 폼이 이 엔드포인트로 실제 저장(E2E 한 줄 물림)

## 결정
- **"저장"만 이번 범위**로 확정. FE 폼→저장→중복 응답까지 완결.
- 스키마는 Hibernate `ddl-auto: update`로 자동 생성 (Flyway 마이그레이션은 이 테이블 밖 — 운영 이관 시 재검토).

## 후속 (비시급) — ⚠️ admin/조회는 다음 미션
- 미션 목표문의 **"다시 꺼내볼 수 있게"**에 해당하는 **조회·admin 엔드포인트가 미구현.** 운영진이 모은 이메일을 볼 경로가 아직 없다. → **admin은 나중에 별도 미션으로.** (issue #18에 코멘트로 남김)
- 중복 구독을 `success:true`로 조용히 처리 — UX 재검토 여지

## 배운 것
- → learnings 후보: walking skeleton은 목표문을 **좁게 해석해 "저장"만 관통**시키는 게 맞다 — "꺼내보기/admin"까지 한 미션에 넣으면 수직 슬라이스가 두꺼워진다. 단, 미룬 범위를 result·이슈에 **명시적으로 남겨야** 잊히지 않는다.

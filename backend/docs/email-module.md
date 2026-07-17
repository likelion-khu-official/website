# 이메일 발송 모듈 (`likelion.khu.website.email`)

#75(OCI Email Delivery 발송 기반) 위에서, 실제 메일을 만들고·보내고·기록하는 백엔드 모듈. `#74` 어드민 초대·비밀번호 재설정이 이 모듈을 호출해서 쓴다 (현재는 컨트롤러가 아직 없어 `EmailService`를 직접 호출하는 진입점만 존재).

## 구성 요소

| 파일 | 역할 |
|---|---|
| `EmailType.java` | 메일 종류(`INVITE`, `PASSWORD_RESET`)마다 템플릿 이름 + 고정 제목 매핑 |
| `EmailStatus.java` | `SUCCESS` / `FAILURE` |
| `EmailLog.java` | `email_log` 테이블 엔티티 — recipient·emailType·subject·status·errorMessage·messageId·sentAt (본문·토큰은 저장 안 함) |
| `EmailLogRepository.java` | JPA 리포지토리 |
| `EmailLogEvent.java` | `email_log` 저장에 필요한 값만 담는 이벤트 페이로드(record) — 활성 트랜잭션 안에서 호출됐을 때만 씀, 아래 "트랜잭션 경계" 절 참고 |
| `EmailLogEventListener.java` | `EmailLogEvent`를 받아 `@Async` + `@TransactionalEventListener(AFTER_COMPLETION)`로 별도 스레드·트랜잭션 완료 후에 `email_log` 저장 |
| `EmailService.java` | 수신자 주소 검증(`InternetAddress.validate()`) → Thymeleaf 렌더링 → `JavaMailSender` 발송 → 성공/실패 기록. 활성 트랜잭션이 없으면 그 자리에서 즉시 저장(기존과 동일), 있으면 `EmailLogEvent`를 발행해 트랜잭션 완료 후 별도 스레드에서 저장(아래 "트랜잭션 경계" 절 참고). stage 프로파일이면 제목에 `[stage] ` 접두어 |
| `exception/EmailSendException.java` | 발송 실패 시 던지는 unchecked 예외 |
| `templates/email/invite.html` | 초대 메일 템플릿 (`inviteUrl`, `expiresAt`) |
| `templates/email/password-reset.html` | 재설정 메일 템플릿 (`resetUrl`, `expiresAt`) |

## 구현 항목별 입출력 예시 × 검증 테스트

각 행은 "이 입력을 넣으면 이 출력이 나와야 한다"는 명세이자, 그걸 실제로 확인하는 테스트 위치다.

| # | 구현 항목 | 입력 예시 | 기대 출력 | 검증 테스트 |
|---|---|---|---|---|
| 1 | 초대 메일 발송 | `sendInviteEmail("new-admin@khu.ac.kr", "https://admin.likelion-khu.com/invite?token=abc123", 2026-07-08T15:30)` | 제목 `[멋쟁이사자처럼 경희대] 운영진 초대`, 본문에 초대 링크와 `2026.07.08 15:30` 포함, 발신자 `noreply@likelion-khu.com` | `EmailServiceTest#sendInviteEmail_Success_SendsMailWithInviteValuesAndLogsSuccess` (목 SMTP, 로직 단위) |
| 2 | 재설정 메일 발송 | `sendPasswordResetEmail("admin@khu.ac.kr", "https://admin.likelion-khu.com/reset-password?token=xyz789", 2026-07-09T09:00)` | 제목 `[멋쟁이사자처럼 경희대] 비밀번호 재설정`, 본문에 재설정 링크와 `2026.07.09 09:00` 포함 | `EmailServiceTest#sendPasswordResetEmail_Success_...` |
| 3 | 발송 성공 시 `email_log` 기록 | 1·2번과 동일 호출 | `email_log`에 `status=SUCCESS`, `errorMessage=null`, `subject`=실제 보낸 제목과 동일 | 단위: `EmailServiceTest` 1·2번 테스트(목 리포지토리) / 통합: `EmailServiceIntegrationTest` 두 테스트(진짜 SQLite, 아래 7번과 동일 지점) |
| 4 | 발송 실패 시 처리(SMTP 연결·전송 단계) | SMTP 서버 연결 실패 | `EmailSendException` 던짐, `email_log`에 `status=FAILURE`, `errorMessage`에 원인 포함, **`messageId=null`**(연결 자체가 안 돼서 `saveChanges()`까지 못 감 — 실측 확인) | 단위: `EmailServiceTest#sendInviteEmail_MailServerRejects_...`(목이 `MailSendException` 던짐) / 통합: `EmailServiceFailureIntegrationTest#sendInviteEmail_SmtpServerUnreachable_...`(Mailpit 컨테이너를 실제로 내려서 진짜 연결 실패 유발) |
| 4-1 | 발송 실패 시 처리(주소 형식 검증 단계) | 형식이 깨진 수신자 주소 — `not-an-email-address`(`@` 없음), `broken<address@@khu.ac.kr`(꺾쇠 안 닫힘) | `mailSender.send()`를 시도조차 안 함(`verify(never())`), `EmailSendException` 던짐, `email_log`에 `status=FAILURE`, **`messageId=null`** | 단위: `EmailServiceTest#sendInviteEmail_AddressWithNoAtSign_...`, `#sendInviteEmail_AddressWithUnbalancedAngleBracket_...` — 로컬 주소 파싱 문제라 실제 SMTP·환경과 무관하게 항상 같은 결과, 통합테스트는 중복이라 안 둠 |
| 5 | stage 제목 접두어 | active profile = `stage`로 초대 발송 | 제목이 `[stage] [멋쟁이사자처럼 경희대] 운영진 초대`, `email_log.subject`도 접두어 포함 그대로 | 단위: `EmailServiceTest#sendInviteEmail_StageProfile_...` / 통합: `EmailServiceStageProfileIntegrationTest#sendInviteEmail_StageProfileRealSmtp_...`(`@ActiveProfiles("stage")` + 실제 Mailpit 수신함에서 확인) |
| 6 | prod(비-stage) 접두어 없음 | active profile = `prod`로 동일 발송 | 접두어 없이 원래 제목 그대로 | 단위: `EmailServiceTest#sendInviteEmail_ProdProfile_...` / 통합: `EmailServiceIntegrationTest`(`@ActiveProfiles("prod")` 클래스 레벨로 명시, 두 테스트 모두 접두어 없는 제목 확인) |
| 7 | `email_log` 실제 DB 저장 | 1번과 동일 호출, **목이 아닌 진짜 `EmailLogRepository`** (SQLite) | `emailLogRepository.findAll()`에 실제 row 1건 — recipient·emailType·status·subject·sentAt 전부 채워짐 | `EmailServiceIntegrationTest`·`EmailServiceStageProfileIntegrationTest`·`EmailServiceFailureIntegrationTest` 전부 (Spring이 실제로 주입한 리포지토리 빈 사용) — 성격상 "통합"에만 속하는 항목 |
| 8 | 실제 SMTP 프로토콜 왕복 (Thymeleaf 렌더링 → `JavaMailSender` → SMTP → 수신함) | `EmailService` 실빈 + Testcontainers로 띄운 Mailpit(실제 SMTP 서버)에 발송 | Mailpit API로 조회한 수신 메일의 제목·발신자·수신자·HTML 본문이 입력값과 정확히 일치 | `EmailServiceIntegrationTest#sendInviteEmail_RealSmtpRoundTrip_...`, `#sendPasswordResetEmail_RealSmtpRoundTrip_...` — 성격상 "통합"에만 속하는 항목 |
| 8-1 | 발송 성공 시 `messageId` 캡처(OCI Logging 연동 대비 조인키) | 8번과 동일 발송 | `email_log.messageId`가 `<...>` 형식으로 채워지고, 그 값(꺾쇠 제거)이 Mailpit이 실제로 받은 메일의 `MessageID`와 정확히 일치 | `EmailServiceIntegrationTest` 두 테스트 모두 — `saveChanges()`가 실제로 실행돼야 생기는 값이라 목으로는 검증 불가, 통합에만 속하는 항목 |
| 9 | OCI STAGE 자격증명으로 실제 발송 (수동, 1회) | STAGE SMTP 자격증명, 수신자 인프라 오너 개인 Gmail 메일함 | Gmail 수신함 도착 확인(사용자 보고) | ⚠️ 자동화 테스트 아님 — 이 개발 세션에서 임시 테스트 클래스로 1회 실행 후 삭제. 재현하려면 실제 자격증명 필요 |
| 10 | OCI PROD 자격증명 AUTH 확인 (수동, 1회) | PROD SMTP 자격증명, STARTTLS+AUTH LOGIN만 (메일 미발송) | `AUTH_OK` | ⚠️ 자동화 테스트 아님 — 스크립트 실행 후 즉시 삭제 |
| 11 | 활성 트랜잭션 안에서 호출 시(성공) `EmailLogEvent` 발행(직접 저장 아님) | `@Transactional` 메서드 안에서 `sendInviteEmail(...)` 호출(발송 성공) | `email_log`를 즉시 `save()`하지 않고 `EmailLogEvent`(SUCCESS)를 발행 | `EmailServiceTest#send_CalledWithActiveTransaction_PublishesEventInsteadOfSavingDirectly`(`TransactionSynchronizationManager`를 직접 조작해 DB·Spring 컨텍스트 없이 재현) |
| 11-a | 활성 트랜잭션 안에서 호출 시(실패) `EmailLogEvent` 발행(직접 저장 아님) | `@Transactional` 메서드 안에서 `sendInviteEmail(...)` 호출, SMTP 실패 | `email_log`를 즉시 `save()`하지 않고 `EmailLogEvent`(FAILURE, errorMessage 포함)를 발행 | `EmailServiceTest#send_MailServerRejectsWithActiveTransaction_PublishesFailureEventInsteadOfSavingDirectly` — 성공만 이벤트로 가고 실패는 예전처럼 직접 저장하는 식으로 갈라지지 않았는지 별도 확인 |
| 11-1 | 실패 로그가 바깥 트랜잭션 롤백과 무관하게 결국 남음 | 진짜 `@Transactional` 프록시(`TransactionalEmailInviter`) 안에서 발송 → SMTP 실패로 바깥 트랜잭션 롤백 | 바깥 트랜잭션은 롤백되지만, `email_log`에 `status=FAILURE` 행이 결국(비동기) 남음 | 통합: `EmailServiceFailureTransactionBoundaryIntegrationTest#sendInviteEmail_CalledInsideTransactionThatRollsBack_FailureLogEventuallySurvivesRollback`(별도 스레드 저장을 폴링으로 확인) |
| 11-2 | 성공 로그가 이후의 무관한 롤백과 무관하게 결국 남음 | `@Transactional` 프록시 안에서 발송 성공 → 이후 다른 이유로 트랜잭션 롤백 | 바깥 트랜잭션은 롤백되지만, `email_log`에 `status=SUCCESS` 행이 결국(비동기) 남음 | 통합: `EmailServiceIntegrationTest#sendInviteEmail_SucceedsButOuterTransactionLaterRollsBackForUnrelatedReason_SuccessLogEventuallySurvivesRollback` |
| 11-3 | 정상 커밋(롤백 없음) 경로도 이벤트 저장이 실제로 도착함 | `@Transactional` 프록시 안에서 발송 성공, 트랜잭션 그대로 정상 커밋 | `email_log`에 `status=SUCCESS` 행이 결국(비동기) 남음 — 롤백 재현 테스트만 있고 "정상적인 가장 흔한 경로"가 빠져 있던 빈틈을 메움 | 통합: `EmailServiceIntegrationTest#sendInviteEmail_CalledInsideTransactionThatCommitsNormally_SuccessLogEventuallyPersists` |
| 11-4 | `EmailLogEvent → EmailLog` 변환·저장 로직 자체(success/failure 분기) | `EmailLogEventListener.onEmailLogEvent(event)`를 직접 호출(Spring·Docker 없이) | success 이벤트는 `EmailLog.success(...)`와 동일한 필드로, failure 이벤트는 `EmailLog.failure(...)`와 동일한 필드로 저장 | 단위: `EmailLogEventListenerTest` 2개 — 무거운 통합테스트가 이 변환 로직까지 매번 간접 검증하게 두지 않고 분리 |
| 11-5 | 비동기 리스너 안에서 저장 자체가 실패해도 예외가 새어나가지 않음 | `emailLogRepository.save()`가 예외를 던지도록 목 설정 | `onEmailLogEvent()` 호출이 예외 없이 조용히 끝남(로그 한 줄 유실은 감수, 예외 전파는 안 됨) | 단위: `EmailLogEventListenerTest#onEmailLogEvent_RepositorySaveThrows_SwallowsExceptionInsteadOfPropagating` |
| 11-6 | 발송 실패했지만 호출자가 예외를 삼켜서 트랜잭션이 롤백 없이 정상 커밋되는 경우 | `@Transactional` 프록시 안에서 발송 실패 → 호출자가 `EmailSendException`을 잡고 안 던짐 → 트랜잭션 정상 커밋 | 롤백이 전혀 없었는데도 `email_log`에 `status=FAILURE` 행이 결국(비동기) 남음 — 11-1(롤백되는 경우)과 다른 조합, 지금까지 실패 시나리오는 전부 롤백까지 같이 재현해서 "롤백 없이 실패 로그만 남는" 경우가 안 다뤄져 있던 빈틈을 메움 | 통합: `EmailServiceFailureTransactionBoundaryIntegrationTest#sendInviteEmail_FailsButCallerSwallowsExceptionAndCommitsNormally_FailureLogEventuallyPersists` |

**1:1 매칭 원칙**: 4·5·6번처럼 "우리 코드의 조건 분기"를 검증하는 항목은 단위(빠른 피드백, 목으로 경우의 수 다양화)와 통합(실제 SMTP·DB로 그 분기가 실환경에서도 똑같이 동작하는지) 둘 다 필요해서 1:1로 맞췄다. 7·8번은 애초에 "진짜 인프라를 쓰는가"가 검증 대상이라 목으로 만드는 순간 의미가 없어져 통합에만 존재한다.

## 트랜잭션 경계 — email_log가 호출자 트랜잭션 롤백에 휩쓸리지 않아야 한다

**#85 PR 리뷰(신선우)에서 발견**: `EmailService.send()`는 자체적으로 트랜잭션을 열지 않아서, 이 메서드가 어떤 트랜잭션 안에서 실행되는지는 전적으로 호출자에게 달려 있다. 지금은 호출자가 없어(`#74` 컨트롤러 미구현) 드러나지 않지만, `#74`가 아래처럼 짜일 가능성이 높다:

```java
@Transactional
public void inviteAdmin(String email) {
    InviteToken token = inviteTokenRepository.save(new InviteToken(email, ...)); // ① DB insert
    emailService.sendInviteEmail(email, buildInviteUrl(token), token.getExpiresAt()); // ② 메일 발송
}
```

`①`과 `②`가 같은 트랜잭션(같은 DB 커넥션)에서 실행된다. SMTP 연결이 실패하면 `EmailService`가 실패 로그를 저장하지만 아직 커밋 전이고, 곧이어 `EmailSendException`(unchecked)이 `inviteAdmin()` 바깥으로 던져지며 Spring이 바깥 트랜잭션을 rollback-only로 마킹한다 — 토큰 저장(①)도 방금 남긴 실패 로그(②)도 둘 다 사라진다. "발송 결과는 무조건 email_log에 남아야 한다"는 이 모듈의 불변식이 이 경로에서만 깨지는 것.

기존 테스트(`EmailServiceFailureIntegrationTest`)는 `emailService`를 트랜잭션 없이 직접 호출해서 이 경로를 재현하지 못했다 — "바깥에 트랜잭션이 있을 때"라는 조건 자체가 테스트에 없었다.

### 1차 시도(REQUIRES_NEW) — CI에서 실패, 이 프로젝트 DB와 근본적으로 안 맞음

처음엔 `email_log` 저장을 `EmailLogRecorder`라는 별도 빈으로 분리하고 `@Transactional(propagation = REQUIRES_NEW)`를 붙였다(self-invocation 프록시 문제 때문에 `EmailService` 내부 메서드가 아니라 별도 빈이어야 함 — 이건 맞는 접근). CI에 올렸더니 새로 추가한 재현 테스트 2개가 실패했다:

```
EmailServiceFailureIntegrationTest > ...FailureLogSurvivesRollback() FAILED
    java.lang.IllegalStateException — 컨텍스트 로딩 단계에서 실패

EmailServiceIntegrationTest > ...SuccessLogSurvivesRollback() FAILED
    java.lang.AssertionError — IllegalStateException을 기대했는데 다른 예외가 잡힘
```

원인은 `application.yml`(메인·테스트 둘 다): `hikari.maximum-pool-size: 1` (`# SQLite는 single-writer — 풀 크기 1 고정`). `REQUIRES_NEW`는 "풀에서 새 커넥션을 하나 더 받아 독립 트랜잭션을 연다"는 뜻인데, **풀에 커넥션이 1개뿐이면 바깥 트랜잭션이 그 하나를 붙잡고 있는 동안 `REQUIRES_NEW`가 새 커넥션을 못 받아 커넥션 타임아웃으로 실패**한다. `ApplicationEventPublisher` + `@TransactionalEventListener(AFTER_COMPLETION)`로 우회하는 것도 검토했지만, Spring 내부 구현상 트랜잭션 커넥션 반납(`cleanupAfterCompletion`)이 `AFTER_COMPLETION` 콜백 발동보다 늦게 일어나서 같은 문제가 재현될 가능성이 높다고 판단해 시도하지 않았다. 풀 크기를 늘려도 근본 해결이 안 된다 — SQLite 자체가 파일 레벨에서 동시 쓰기 트랜잭션 2개를 못 버텨서, 결국 커넥션 2가 커넥션 1의 잠금을 기다리다 셀프 데드락이 난다. **REQUIRES_NEW(및 동급의 "독립 커밋" 트릭)는 이 프로젝트의 SQLite + 풀 크기 1 조합과 구조적으로 안 맞는다.**

### 2차 시도 — 가드(즉시 실패)로 일단 막음, 그런데 원래 목표가 아니었음

REQUIRES_NEW 대신, `EmailService.send()`가 활성 트랜잭션 안에서 호출되면 아무것도 시도하지 않고 그 자리에서 즉시 `IllegalStateException`을 던지는 가드를 넣었다(`TransactionSynchronizationManager.isActualTransactionActive()`). 그런데 이건 "로그가 조용히 사라지는 버그"를 "발송 자체가 아예 안 되는 것"으로 바꾼 것일 뿐 — 신선우가 원래 요구한 "발송 결과는 무조건 email_log에 남아야 한다"는 불변식을 달성한 게 아니라 회피한 것이었다(리뷰 중 지적받음). 원래 목표(로그가 실제로 남는 것)를 SQLite 제약 안에서 진짜로 달성할 방법을 다시 찾았다.

### 최종 수정 — 트랜잭션 완료 후 별도 스레드에서 저장(비동기 이벤트)

`REQUIRES_NEW`가 안 되는 이유는 **같은 스레드**에서 새 커넥션을 요청하기 때문이다(바깥 트랜잭션이 커넥션을 쥔 채 우리를 기다리고, 우리는 그 커넥션이 반납되길 기다리는 순환 대기). `@TransactionalEventListener(phase = AFTER_COMPLETION)`만으로는 이 순환을 못 끊는다 — 콜백이 트랜잭션을 실행한 바로 그 스레드에서 동기 호출되고, 커넥션 반납(`cleanupAfterCompletion`)은 그 콜백이 끝난 *뒤*에 일어나서 REQUIRES_NEW와 똑같은 순환 대기가 재현된다.

**`@Async`를 얹으면 순환이 끊긴다**: 콜백이 별도 스레드에서 실행되므로, 원래 스레드는 콜백을 기다리지 않고 바로 다음 단계(커넥션 반납)로 넘어간다. 그러면 우리 스레드가 새 커넥션을 요청할 때는 이미(또는 곧) 반납된 커넥션을 받을 수 있다 — 동기 대기가 없어 데드락이 안 생긴다.

```java
@Async
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION, fallbackExecution = true)
void onEmailLogEvent(EmailLogEvent event) {
    emailLogRepository.save(event.toEmailLog());
}
```

`EmailService`는 활성 트랜잭션 여부로 저장 경로를 나눈다 — **트랜잭션이 없으면(지금까지의 모든 호출 경로) 예전처럼 그 자리에서 즉시 저장**해서 기존 동작·테스트를 그대로 유지하고, **트랜잭션이 있을 때만** `EmailLogEvent`를 발행해 위 경로를 탄다. `AFTER_COMPLETION`이라 바깥 트랜잭션이 커밋되든 롤백되든 상관없이 항상 실행된다.

앱에 `@EnableAsync`를 추가해야 했다(`WebsiteBackendApplication`).

**실측 검증**: 로컬에 Docker가 떠서 진짜로 Testcontainers + 실제 `@Transactional` 프록시로 돌려봤다 — 실패 로그·성공 로그 둘 다 바깥 트랜잭션이 롤백된 뒤에도 (비동기로) `email_log`에 결국 남는 걸 확인했다(표 11-1·11-2). 이번엔 CI를 기다릴 필요 없이 로컬에서 이미 실증된 상태.

**트레이드오프**: 트랜잭션 안에서 호출되는 경로에 한해 로그 저장이 **최종적 일관성(eventually consistent)**이 된다 — `send()`가 반환된 직후엔 아직 `email_log`에 안 보일 수 있고(별도 스레드가 처리 중), 그래서 재현 테스트(11-1·11-2)는 즉시 assert하지 않고 짧게 폴링한다. 트랜잭션 밖 호출(현재 모든 실제 사용처)은 영향 없음 — 예전처럼 동기 즉시 저장.

**4-1번 관련 — 테스트 작성 중 발견한 실제 버그**: 처음엔 `"not-an-email-address"`로 4-1번 테스트를 짰는데, `MimeMessageHelper.setTo(String)`이 내부적으로 느슨한 파싱만 해서 이 값을 그냥 통과시켜버렸다(예외 없음). 테스트를 통과시키려고 값을 다른 걸로 바꾸는 대신, "그럼 애초에 이 값이 걸러져야 하는 게 맞나?"를 확인했고 — 맞았다(`InternetAddress.validate()`로 검사하면 `Missing final '@domain'`으로 정확히 거부됨). `EmailService`가 발송 전 주소를 `.validate()`하지 않고 있던 게 진짜 결함이었고, 이번에 그 검증을 추가했다. 그래서 4-1번은 서로 다른 두 형식 오류(`@` 없음 / 꺾쇠 안 닫힘) 둘 다 테스트로 남겨뒀다.

## Testcontainers 도입 배경

기존엔 `EmailServiceTest`가 `JavaMailSender`·`EmailLogRepository`를 전부 목(mock) 처리해서, **실제 SMTP 프로토콜로 진짜 나가는지**와 **`email_log`에 진짜 저장되는지** 두 가지는 자동화 테스트로 확인이 안 됐다(9·10번처럼 수동 1회성 검증에만 의존). `EmailServiceIntegrationTest`는 Testcontainers로 실제 SMTP 서버(Mailpit, 목적: 메일 캡처·조회 API 제공)를 띄워서 이 둘을 CI에서도 반복 가능하게 메꾼다 — OCI 자체를 대상으로 하지 않으므로 외부 자격증명·네트워크 의존 없이 매 빌드마다 실행 가능하다.

- 이미지: `axllent/mailpit:v1.21` (SMTP 1025 + 조회용 HTTP API 8025)
- `@DirtiesContext(classMode = AFTER_EACH_TEST_METHOD)`로 테스트 간 `email_log` 격리 (기존 컨트롤러 테스트들과 동일 패턴)
- GitHub Actions `ubuntu-latest`는 Docker가 기본 설치돼 있어 `ci.yml` 추가 설정 없이 그대로 동작
- 통합테스트 4개로 분리: `EmailServiceIntegrationTest`(성공 경로, `@ActiveProfiles("prod")`) · `EmailServiceStageProfileIntegrationTest`(`@ActiveProfiles("stage")`, 접두어 확인) · `EmailServiceFailureIntegrationTest`(컨테이너를 실제로 내려서 연결 실패 유발) · `EmailServiceFailureTransactionBoundaryIntegrationTest`(컨테이너를 내리는 트랜잭션 경계 재현, 별도 클래스로 둔 이유는 그 파일 주석 참고) — 각자 프로파일·컨테이너 상태가 달라 한 클래스에 억지로 합치지 않음

### Mailpit이 "실제 OCI와 같은 형식"인지 — 처음엔 증명 안 돼 있었음

리뷰 중 지적받아 확인한 내용. 최초 버전은 `spring.mail.properties.mail.smtp.auth=false`, `starttls.enable=false`로 Mailpit을 띄웠는데, **이건 실제 OCI에 쓰는 설정(`application.yml`: `auth: true`, `starttls.enable: true`)과 다른 조건**이었다 — AUTH LOGIN·STARTTLS 협상 코드 경로 자체가 통합테스트에서 한 번도 실행된 적이 없었다는 뜻.

Mailpit이 `--smtp-require-starttls`, `--smtp-auth-accept-any` 옵션을 지원하는 걸 확인하고, 자체서명 TLS 인증서(`src/test/resources/mailpit-tls/{cert,key}.pem`, 테스트 전용 fixture, 10년 유효)를 컨테이너에 물려서 **실제로 STARTTLS+AUTH LOGIN을 거치도록** 고쳤다. `mail.smtp.ssl.trust=*`로 자체서명 인증서를 신뢰하도록 설정(테스트 전용이라 문제없음).

**그래도 증명되는 것과 안 되는 것은 구분해야 한다:**

| | Mailpit(고친 뒤)로 증명됨 | 여전히 증명 불가 |
|---|---|---|
| MIME 구조·헤더·제목 인코딩 | ✅ | |
| AUTH LOGIN + STARTTLS 협상 코드 경로 | ✅ (2026-07-07 수정 후) | |
| OCI Approved Sender 정책(미등록 발신주소 거부) | | ❌ OCI 고유 비즈니스 규칙, 로컬 도구로 재현 불가 |
| SPF/DKIM/DMARC | | ❌ 수신 서버·DNS 영역, SMTP 프로토콜 밖 — Mailpit은 이걸 검사 안 함 |

뒤의 두 개는 이 프로젝트에서 로컬 테스트로 영원히 못 잡고, 실제 OCI를 때린 1회성 수동 검증(위 9·10번, 그리고 인프라가 별도로 한 SPF/DKIM/DMARC 확인)이 유일한 증거다.

## 아직 못 메꾼 빈틈

| 항목 | 이유 |
|---|---|
| ~~초대·재설정 **HTTP 엔드포인트** 단위 end-to-end~~ | → 완료(#113). `AdminInvitationControllerTest`/`AdminPasswordControllerTest`는 `EmailService`를 목으로 대체해서 "보내려고 시도했나"만 확인했고, `EmailServiceIntegrationTest`는 서비스 레이어만 실증했다 — 실제 `POST /api/admin/invitations`·`POST /api/admin/password/forgot` HTTP 호출이 목 없이 `email_log`까지 실제로 남기는 전체 경로는 검증한 적이 없었다. `email/AuthEmailHttpEndToEndIntegrationTest`(Testcontainers Mailpit, `EmailService` 실빈)로 메움. `cd.yml` 스모크 테스트는 여전히 없음 — 필요성 낮음(이미 CI에서 실제 SMTP 왕복까지 매 빌드 검증됨). |
| `management.health.mail.enabled=false` 동작 확인 | 설정 자체는 있으나 `/actuator/health`에서 실제로 mail 상태가 빠지는지 검증하는 테스트는 없음 (낮은 리스크) |
| Naver 등 Gmail 외 실제 수신함 스팸 판정 | 이번엔 Gmail만 확인 (요청 범위) |
| PROD 자격증명으로 **실제 발송**(AUTH 아님) | 실사용자 오발송 방지를 위해 의도적으로 미수행 — `#74` 배포 후 첫 실제 초대 때 `email_log` 확인으로 대체 예정 |
| `EmailSendException` 원인별 세분화 | 지금은 주소 형식 오류(클라이언트 문제)와 SMTP 연결·인증 실패(인프라 문제)가 예외 타입 하나로 뭉뚱그려짐. 컨트롤러가 아직 없어 원인별로 다른 HTTP 상태(400 vs 503)를 응답할 소비자가 없으므로 지금 쪼개는 건 시기상조 — `#74` 컨트롤러가 붙고 실제 구분 요구가 생기면 후속 PR에서 `InvalidRecipientAddressException`/`MailDeliveryException` 등으로 분리 검토 |
| SMTP 타임아웃 반복 실패 알림 | `connectiontimeout`/`timeout`/`writetimeout`을 5초로 명시해 요청 스레드가 무한정 잡히는 것만 막아둔 상태(2026-07-08). 타임아웃이 반복적으로 발생하면(=OCI SMTP 장애 가능성) 인프라 쪽에 알림이 가도록 하는 건 아직 없음 — 별도 이슈로 인프라와 협의 필요 |
| 메일 발송 비동기 큐 처리 | 지금은 `send()`가 요청 스레드에서 동기 실행 — 타임아웃 상한(5초×3)을 둬도 동시 실패가 몰리면 스레드 풀이 일시적으로 압박받을 수 있음. 근본 해결은 발송을 큐(`@Async`, 메시지 큐 등)로 빼서 요청 스레드가 SMTP 왕복을 아예 기다리지 않게 하는 것 — `#74` 컨트롤러 연결 시점에 트래픽 규모를 보고 필요성 재판단 |
| 발송 실패 시 자동 재시도 | 지금은 재시도 로직 전혀 없음(한 번 실패하면 그대로 `EmailSendException`). **순서 중요**: 재시도를 멱등성 보장 없이 먼저 넣으면 위험 — `mailSender.send(message)`가 SMTP 서버엔 이미 전달됐는데 응답 확인 전 연결이 끊긴 경우, 재시도가 중복 발송으로 이어질 수 있음. 그래서 **동일 토큰 기준 멱등성 보장(예: 같은 초대/재설정 토큰으로는 한 번만 발송되도록)을 먼저 구현한 뒤에** 재시도 로직을 추가하는 순서로 진행 |

## 코드 리뷰 진행 상황 (직접 리뷰 중)

읽는 순서와 진행 상태. 다음 세션(다른 기기 포함)은 여기서부터 이어가면 됨.

- [x] 1. `EmailLog.java` — `success()`/`failure()`가 생성자가 아니라 정적 팩토리 메서드라는 것, `private` 생성자로 밖에서 임의 생성 못 막은 것, `sentAt` 자동 채움, static vs 동적 바인딩까지 논의 완료. 필드명 `type`→`emailType` 리네임 반영(테스트 5곳 `getType()`→`getEmailType()` 수정, DB 컬럼명도 `type`→`email_type`로 바뀜 — 아직 배포 전이라 안전)
- [x] 2. `EmailLogRepository.java` — 커스텀 쿼리 메서드 없는 순수 `JpaRepository` 상속, 아직 파생 쿼리 불필요한 이유 논의 완료
- [x] 3. `templates/email/invite.html`, `password-reset.html` — `xmlns:th` 자연 템플릿, `th:href`/`th:text`가 각각 링크·표시텍스트를 Context 변수로 치환, 인라인 style을 쓰는 이유(메일 클라이언트가 `<style>` 블록 무시) 논의 완료
- [x] 4. `EmailService.java` 전체(검증·messageId·stage접두어가 `send()` 안에서 어떻게 이어지는지) — 생성자 주입/필드 주입 차이, `final`/`private`, Thymeleaf `Context` 역할, `inviteUrl`/`resetUrl`/`expiresAt`은 호출자가 넘겨야 하는 값이고 아직 그 호출자(#74)가 없다는 것까지 논의 완료. `STAGE_SUBJECT_PREFIX`를 `[STAGE 테스트] `→`[stage] `로 변경(테스트 5곳 + 문서 2곳 + infra 문서 예시 동반 수정)
- [x] 5. `exception/EmailSendException.java` — unchecked 예외로 만든 이유, `(type, recipient, cause)` 생성자가 메시지·원인 체인을 어떻게 감싸는지 논의 완료. 원인별 예외 세분화(주소오류 vs SMTP실패)는 컨트롤러 붙기 전이라 시기상조 판단, 후속 PR 대상으로 위 "아직 못 메꾼 빈틈"에 기록
- [x] 6. `EmailServiceTest.java` 전체(7개 테스트, `createService(String... activeProfiles)` 헬퍼) — templateEngine만 실제 협력자로 남기고 mailSender/emailLogRepository만 목 처리한 이유, `mailSender.createMimeMessage()`가 진짜 MimeMessage를 반환해야 하는 이유, `ReflectionTestUtils.setField`가 왜 필요한지(필드 주입이라 생성자로 못 넣음) 논의 완료. `sendPasswordResetEmail_Success`가 `sendInviteEmail_Success`보다 검증 범위 좁은 것(getFrom 등 누락)은 확인해볼 만한 지점으로 남김
- [x] 7. 통합테스트 3개 — `@DynamicPropertySource`가 왜 필요한지(컨테이너 랜덤 포트), `@DirtiesContext`가 `EmailServiceIntegrationTest`(테스트 2개, 인메모리 SQLite 공유 문제)에만 있고 나머지엔 없는 이유, `awaitMessageTo` 폴링, messageId 꺾쇠 스트립 비교, `EmailServiceFailureIntegrationTest`의 `mailpit.stop()`+짧은 타임아웃으로 진짜 연결 실패 재현 논의 완료
- [ ] 8. `application.yml`(메인) → `application.yml`(test) → `.env.example` — 환경변수 흐름 추적
- [ ] 9. `build.gradle` — mail/thymeleaf/testcontainers 의존성
- [ ] 10. 이 문서의 "구현 항목별 입출력 예시 × 검증 테스트" 표 전체와 읽은 코드 대조
- [x] 11. 트랜잭션 경계 리뷰(#85, 신선우) 반영. 1차 시도(`EmailLogRecorder` + `REQUIRES_NEW`)는 CI에서 실패 — SQLite 커넥션 풀(=1)과 구조적으로 안 맞음을 실측. 2차 시도(활성 트랜잭션 즉시 실패 가드)는 "로그가 남는다"는 원래 목표를 회피한 것이라 재검토. 최종적으로 `EmailLogEvent` + `EmailLogEventListener`(`@Async` + `@TransactionalEventListener(AFTER_COMPLETION)`)로 트랜잭션 완료 후 별도 스레드에서 저장하는 방식 채택 — 위 "트랜잭션 경계" 절 참고. 이후 빈틈 점검을 두 차례 거쳐 5개 더 채움(표 11-a·11-3·11-4·11-5·11-6): 실패 경로 단위테스트, 정상 커밋(롤백 없음) 경로, 리스너 자체 순수 단위테스트, 리스너 내부 저장 실패 방어 코드·테스트, "실패했지만 호출자가 예외를 삼켜 롤백 없이 커밋"되는 조합 — (트랜잭션 유무)×(발송 성공/실패)×(커밋/롤백) 전체 경우의 수를 표로 펼쳐서 빠짐없이 확인. 백엔드 전체 테스트(85개) 로컬 Docker로 실제 실행해 전부 통과 확인(더 이상 CI 대기 불필요)

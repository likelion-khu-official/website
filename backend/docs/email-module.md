# 이메일 발송 모듈 (`likelion.khu.website.email`)

#75(OCI Email Delivery 발송 기반) 위에서, 실제 메일을 만들고·보내고·기록하는 백엔드 모듈. `#74` 어드민 초대·비밀번호 재설정이 이 모듈을 호출해서 쓴다 (현재는 컨트롤러가 아직 없어 `EmailService`를 직접 호출하는 진입점만 존재).

## 구성 요소

| 파일 | 역할 |
|---|---|
| `EmailType.java` | 메일 종류(`INVITE`, `PASSWORD_RESET`)마다 템플릿 이름 + 고정 제목 매핑 |
| `EmailStatus.java` | `SUCCESS` / `FAILURE` |
| `EmailLog.java` | `email_log` 테이블 엔티티 — recipient·type·subject·status·errorMessage·messageId·sentAt (본문·토큰은 저장 안 함) |
| `EmailLogRepository.java` | JPA 리포지토리 |
| `EmailService.java` | 수신자 주소 검증(`InternetAddress.validate()`) → Thymeleaf 렌더링 → `JavaMailSender` 발송 → 성공/실패 무조건 `email_log` 기록. stage 프로파일이면 제목에 `[STAGE 테스트] ` 접두어 |
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
| 5 | stage 제목 접두어 | active profile = `stage`로 초대 발송 | 제목이 `[STAGE 테스트] [멋쟁이사자처럼 경희대] 운영진 초대`, `email_log.subject`도 접두어 포함 그대로 | 단위: `EmailServiceTest#sendInviteEmail_StageProfile_...` / 통합: `EmailServiceStageProfileIntegrationTest#sendInviteEmail_StageProfileRealSmtp_...`(`@ActiveProfiles("stage")` + 실제 Mailpit 수신함에서 확인) |
| 6 | prod(비-stage) 접두어 없음 | active profile = `prod`로 동일 발송 | 접두어 없이 원래 제목 그대로 | 단위: `EmailServiceTest#sendInviteEmail_ProdProfile_...` / 통합: `EmailServiceIntegrationTest`(`@ActiveProfiles("prod")` 클래스 레벨로 명시, 두 테스트 모두 접두어 없는 제목 확인) |
| 7 | `email_log` 실제 DB 저장 | 1번과 동일 호출, **목이 아닌 진짜 `EmailLogRepository`** (SQLite) | `emailLogRepository.findAll()`에 실제 row 1건 — recipient·type·status·subject·sentAt 전부 채워짐 | `EmailServiceIntegrationTest`·`EmailServiceStageProfileIntegrationTest`·`EmailServiceFailureIntegrationTest` 전부 (Spring이 실제로 주입한 리포지토리 빈 사용) — 성격상 "통합"에만 속하는 항목 |
| 8 | 실제 SMTP 프로토콜 왕복 (Thymeleaf 렌더링 → `JavaMailSender` → SMTP → 수신함) | `EmailService` 실빈 + Testcontainers로 띄운 Mailpit(실제 SMTP 서버)에 발송 | Mailpit API로 조회한 수신 메일의 제목·발신자·수신자·HTML 본문이 입력값과 정확히 일치 | `EmailServiceIntegrationTest#sendInviteEmail_RealSmtpRoundTrip_...`, `#sendPasswordResetEmail_RealSmtpRoundTrip_...` — 성격상 "통합"에만 속하는 항목 |
| 8-1 | 발송 성공 시 `messageId` 캡처(OCI Logging 연동 대비 조인키) | 8번과 동일 발송 | `email_log.messageId`가 `<...>` 형식으로 채워지고, 그 값(꺾쇠 제거)이 Mailpit이 실제로 받은 메일의 `MessageID`와 정확히 일치 | `EmailServiceIntegrationTest` 두 테스트 모두 — `saveChanges()`가 실제로 실행돼야 생기는 값이라 목으로는 검증 불가, 통합에만 속하는 항목 |
| 9 | OCI STAGE 자격증명으로 실제 발송 (수동, 1회) | STAGE SMTP 자격증명, 수신자 `cjang6199@gmail.com` | Gmail 수신함 도착 확인(사용자 보고) | ⚠️ 자동화 테스트 아님 — 이 개발 세션에서 임시 테스트 클래스로 1회 실행 후 삭제. 재현하려면 실제 자격증명 필요 |
| 10 | OCI PROD 자격증명 AUTH 확인 (수동, 1회) | PROD SMTP 자격증명, STARTTLS+AUTH LOGIN만 (메일 미발송) | `AUTH_OK` | ⚠️ 자동화 테스트 아님 — 스크립트 실행 후 즉시 삭제 |

**1:1 매칭 원칙**: 4·5·6번처럼 "우리 코드의 조건 분기"를 검증하는 항목은 단위(빠른 피드백, 목으로 경우의 수 다양화)와 통합(실제 SMTP·DB로 그 분기가 실환경에서도 똑같이 동작하는지) 둘 다 필요해서 1:1로 맞췄다. 7·8번은 애초에 "진짜 인프라를 쓰는가"가 검증 대상이라 목으로 만드는 순간 의미가 없어져 통합에만 존재한다.

**4-1번 관련 — 테스트 작성 중 발견한 실제 버그**: 처음엔 `"not-an-email-address"`로 4-1번 테스트를 짰는데, `MimeMessageHelper.setTo(String)`이 내부적으로 느슨한 파싱만 해서 이 값을 그냥 통과시켜버렸다(예외 없음). 테스트를 통과시키려고 값을 다른 걸로 바꾸는 대신, "그럼 애초에 이 값이 걸러져야 하는 게 맞나?"를 확인했고 — 맞았다(`InternetAddress.validate()`로 검사하면 `Missing final '@domain'`으로 정확히 거부됨). `EmailService`가 발송 전 주소를 `.validate()`하지 않고 있던 게 진짜 결함이었고, 이번에 그 검증을 추가했다. 그래서 4-1번은 서로 다른 두 형식 오류(`@` 없음 / 꺾쇠 안 닫힘) 둘 다 테스트로 남겨뒀다.

## Testcontainers 도입 배경

기존엔 `EmailServiceTest`가 `JavaMailSender`·`EmailLogRepository`를 전부 목(mock) 처리해서, **실제 SMTP 프로토콜로 진짜 나가는지**와 **`email_log`에 진짜 저장되는지** 두 가지는 자동화 테스트로 확인이 안 됐다(9·10번처럼 수동 1회성 검증에만 의존). `EmailServiceIntegrationTest`는 Testcontainers로 실제 SMTP 서버(Mailpit, 목적: 메일 캡처·조회 API 제공)를 띄워서 이 둘을 CI에서도 반복 가능하게 메꾼다 — OCI 자체를 대상으로 하지 않으므로 외부 자격증명·네트워크 의존 없이 매 빌드마다 실행 가능하다.

- 이미지: `axllent/mailpit:v1.21` (SMTP 1025 + 조회용 HTTP API 8025)
- `@DirtiesContext(classMode = AFTER_EACH_TEST_METHOD)`로 테스트 간 `email_log` 격리 (기존 컨트롤러 테스트들과 동일 패턴)
- GitHub Actions `ubuntu-latest`는 Docker가 기본 설치돼 있어 `ci.yml` 추가 설정 없이 그대로 동작
- 통합테스트 3개로 분리: `EmailServiceIntegrationTest`(성공 경로, `@ActiveProfiles("prod")`) · `EmailServiceStageProfileIntegrationTest`(`@ActiveProfiles("stage")`, 접두어 확인) · `EmailServiceFailureIntegrationTest`(컨테이너를 실제로 내려서 연결 실패 유발) — 각자 프로파일·컨테이너 상태가 달라 한 클래스에 억지로 합치지 않음

## 아직 못 메꾼 빈틈

| 항목 | 이유 |
|---|---|
| 초대·재설정 **HTTP 엔드포인트** 단위 end-to-end | 컨트롤러 자체가 아직 없음(`#74` 본작업 범위) — 생기면 `MockMvc` 기반 컨트롤러 테스트 + `cd.yml` 스모크 테스트 추가 필요 |
| `management.health.mail.enabled=false` 동작 확인 | 설정 자체는 있으나 `/actuator/health`에서 실제로 mail 상태가 빠지는지 검증하는 테스트는 없음 (낮은 리스크) |
| Naver 등 Gmail 외 실제 수신함 스팸 판정 | 이번엔 Gmail만 확인 (요청 범위) |
| PROD 자격증명으로 **실제 발송**(AUTH 아님) | 실사용자 오발송 방지를 위해 의도적으로 미수행 — `#74` 배포 후 첫 실제 초대 때 `email_log` 확인으로 대체 예정 |

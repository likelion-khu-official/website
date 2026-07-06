# 이메일 발송 기반 — OCI Email Delivery (#75)

> 인프라 문서. #74(어드민 초대·비밀번호 재설정)의 선행 서브이슈 — 초대·재설정 링크 메일이 나가려면 이 발송 기반이 먼저 있어야 한다.

## 왜 OCI Email Delivery인가

BE가 수신자 메일서버(Gmail 등)에 직접 SMTP로 붙어 보내는 것도 기술적으로는 가능하지만, 신규 클라우드 IP는 평판이 없어 대부분 스팸함행이거나 거부된다. 포트 25 아웃바운드 차단, PTR·워밍업·불만 피드백 루프 관리까지 직접 하는 건 이미 풀린 문제를 재발명하는 것 — 그래서 이미 쓰고 있는 OCI의 Email Delivery(신규 업체/계정 불필요, 월 3,000통 무료)로 대행한다.

**핵심 전제**: BE는 수신자에게 직접 보내지 않는다. BE는 OCI 릴레이(SMTP)에 인증만 하고, 실제 인터넷 발송·발신 IP 평판 관리·DKIM 서명은 전부 OCI 쪽에서 일어난다.

```
BE(Spring Boot) --SMTP AUTH--> OCI Email Delivery 릴레이 --실제 발송--> 수신자 메일서버(SPF/DKIM/PTR 검증)
```

## 설계 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 리전 | `ap-tokyo-1` (홈 리전 고정) | Always Free 3,000통/월이 홈 리전 한정 — 다른 리전에서 만들면 과금 |
| 발신 주소 | `noreply@likelion-khu.com` | 이슈 요구사항 |
| 발송 방식 | SMTP 자격증명 (API 키 아님) | Spring Boot `JavaMailSender`가 SDK 의존성 없이 표준 SMTP로 바로 붙음 |
| 인증 계정 | 전용 IAM 유저 신규 생성 (`smtp-mailer`, 콘솔 로그인 없이 SMTP 자격증명만) | 사람 계정(Administrator) 재사용 안 함 — `dbclient`와 동일한 최소권한 패턴, 유출돼도 블라스트 반경이 "메일 발송"으로 국한 |
| DNS 등록 | 호스팅케이알에 SPF(TXT) + DKIM(CNAME) 수동 등록 | Claude/CLI가 registrar에 접근 불가 — 인프라 오너가 직접 |
| stage/prod 분리 범위 | **SMTP 자격증명만 분리**(`smtp-mailer` 유저에 자격증명 2개, 유저당 최대치). 발신주소·Email Domain·DKIM은 공유 | DB·Storage처럼 나누는 이유가 "실제 데이터 오염 방지"인데, 메일은 stage가 보내도 결국 같은 실제 수신자에게 감 — 주소를 나눠도 오염 자체는 못 막음. 대신 자격증명을 나누면 "한쪽 유출 시 다른 쪽은 회전 안 해도 됨"이라는 실질적 이득을 최소 비용으로 얻음 |

## 설정 항목 개념 요약

- **Email Domain**: DNS 도메인이 아니라 OCI 내부 등록 단위 — "이 tenancy가 이 도메인 이름으로 보낼 수 있다"는 위임. 리전별 자산.
- **Approved Sender**: From 주소 게이트. 등록 안 된 주소로는 OCI가 발송 자체를 거부(스팸 방지 — 받는 사람 등록과는 무관, 발신 주소만 대상).
- **DKIM**: 키쌍은 OCI가 생성·보관(개인키는 우리도 열람 불가). 서명은 OCI 릴레이가 메일을 받은 직후 붙이고, 검증은 수신 서버가 DNS에서 그때 공개키를 조회해서 함(사전 공유 아님, 실시간 조회). DNS엔 공개키 값이 아니라 Oracle 존을 가리키는 CNAME만 등록 — OCI가 키를 로테이션해도 우리 DNS는 안 건드림.
- **SPF**: 암호학 없음. "지금 접속한 IP가 우리 도메인 SPF에 등록된 IP 대역(OCI 것)에 있나"만 대조. 보안 근거는 "TCP 연결의 실제 발신 IP는 텍스트처럼 위조 불가"라는 점.
- **PTR**: IP→호스트네임 역방향 DNS. OCI IP 쪽에 이미 세팅돼 있어 우리가 건드릴 레코드 아님.

## 실행 상태 (2026-07-06)

1. ✅ `oci email domain create` — Email Domain `likelion-khu.com`, `ap-tokyo-1` (ACTIVE)
2. ✅ `oci email dkim create` — selector `mail-tokyo-20260706` 생성 (NEEDS_ATTENTION: NEED_DNS — DNS 등록 대기)
3. ✅ `oci email sender create` — Approved Sender `noreply@likelion-khu.com` (ACTIVE, `is-spf: false` — DNS 등록 전)
4. ✅ IAM 최소권한 세팅 완료:
   - 그룹 `email-senders` + 정책 `email-senders-policy` (`Allow group email-senders to use email-family in tenancy`)
   - 전용 유저 `smtp-mailer` (콘솔 로그인 미설정, SMTP 자격증명만 사용) — IDCS가 이메일 필수라 인프라 오너 개인 메일 주소에 `+smtp-mailer` 별칭을 붙여 등록(실사용 안 함·알림 수신용. 실제 주소는 레포에 남기지 않음)
   - SMTP 자격증명 발급 완료 → **`infra/.env.email.local`**에 보관 (gitignore `*.local`, 레포에 없음)
5. ✅ **DNS 등록 완료 (호스팅케이알, 인프라 오너가 직접, 2026-07-06)**:

   | 타입 | 이름(호스트) | 값 |
   |---|---|---|
   | TXT | `@` (루트, `likelion-khu.com`) | `v=spf1 include:ap.rp.oracleemaildelivery.com ~all` |
   | CNAME | `mail-tokyo-20260706._domainkey` | `mail-tokyo-20260706.likelion-khu.com.dkim.nrt1.oracleemaildelivery.com` |

   등록 전 확인함: 기존 TXT/MX 레코드 없음(SOA만 응답) — 충돌 없음. `nslookup`으로 양쪽 다 정확히 전파 확인함.

   **검증 상태**: SPF는 등록 직후 바로 반영(`oci email domain get` / `email sender get` 모두 `is-spf: true`). **DKIM은 DNS가 정확한데도 한동안 `NEEDS_ATTENTION(NEED_DNS)`로 남아있었음** — 생성 후 약 65분 만에 `ACTIVE`로 전환(OCI가 SPF와 DKIM을 서로 다른 주기로 재확인하는 것으로 보임). DNS가 맞다면 조급해하지 말고 기다리면 됨 — 상세는 learnings 참고.
6. ✅ **DMARC 레코드도 추가 등록**(이슈 필수 요구사항은 아니지만 사칭 방지 차원에서 같이 처리):

   | 타입 | 이름 | 값 |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<모니터링 수신 메일 1>,mailto:<모니터링 수신 메일 2>` |

   `p=none` — 정렬 실패해도 거부/격리 안 하고 관찰만 하는 최소 단계. 안정성 확인되면 `quarantine`→`reject`로 단계적으로 올릴 수 있음.
7. ✅ **테스트 발송 완료 (Python `smtplib`로 SMTP 직접 호출, 2026-07-06)** — 인프라 오너 개인 테스트 메일함으로 2회 발송(1차: DMARC 레코드 등록 전 → SPF PASS·DKIM PASS·DMARC FAIL(레코드 없음이 원인, 정렬 실패 아님). 2차: DMARC 등록 후 재발송 → **SPF PASS·DKIM PASS·DMARC PASS 전부 확인**). 받은편지함 도착, 스팸 아님.

   **테스트 범위 밖(별도 확인 필요)**: Gmail 한 곳만 테스트(네이버 등 다른 수신처 미확인), rua 집계 리포트 실제 수신 여부(하루 단위라 아직 미확인), BE 실제 코드(`JavaMailSender`) 연동은 #74에서 별도 실측 필요.
8. ✅ **SMTP 자격증명 stage/prod 분리 + 서버 실적용 완료 (2026-07-06)** — `smtp-mailer` 유저에 자격증명 2개 발급(PROD/STAGE로 description 라벨링), `likelion-oci` 서버의 실제 `.env.stage`·`.env.prod`에 각각 다른 자격증명으로 `MAIL_*` 값 추가함. BE 코드가 아직 이 값을 안 읽으니 컨테이너 재시작은 안 함 — 다음 배포 때 자연스럽게 반영됨.
9. ⬜ **다음 할 일 — `infra/.env.email.local`의 값을 BE(신선우·안시현)에 안전한 채널로 전달** (레포 커밋 금지 — 이미 gitignore로 방지됨. GitHub 이슈 코멘트에도 평문 금지)

## BE에 남기는 요청 (인프라 범위 밖, #74 구현 시 반영 요청)

- **stage에서 보내는 메일은 제목에 구분 표시를 붙여주세요** (예: `[STAGE 테스트] ...`). 발신주소·Email Domain·DKIM을 stage/prod가 공유하기 때문에(위 표 참고), 실제 수신자가 받았을 때 "이게 테스트 메일인가 진짜인가" 헷갈리지 않게 하는 안전장치. 인프라 쪽엔 별도 환경변수를 심어두지 않았음 — 이건 BE 코드 관례로 처리하기로 함(예: `SPRING_PROFILES_ACTIVE=stage`일 때 subject 앞에 접두어 붙이기).

**리소스 OCID**: 레포에는 남기지 않음(내부 인프라 식별자 노출 방지). 회수·로테이션이 필요하면 인프라 오너 로컬 `~/.oci` 세션에서 아래로 조회:
```
oci email domain list --compartment-id <tenancy-ocid>
oci email dkim list --email-domain-id <email-domain-ocid>
oci email sender list --compartment-id <tenancy-ocid>
oci iam user list --compartment-id <tenancy-ocid> --query "data[?name=='smtp-mailer']"
oci iam smtp-credential list --user-id <smtp-mailer-user-ocid>
```
(SMTP 자격증명 비밀번호는 발급 시 1회만 노출 — 분실 시 재발급. 유저당 최대 2개라 PROD/STAGE로 이미 꽉 참, 로테이션하려면 기존 걸 지우고 재발급)

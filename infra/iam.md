# OCI IAM 구조 (2026-07-27 실측)

> 인프라 문서. 테넌시: `kwj_likelion`(Cloud Account Name과 동일). 아래는 `oci iam user/group/dynamic-group/policy list`로 실측한 것 — 콘솔 `Identity & Security`에서도 같은 걸 볼 수 있다. 문서와 실제가 어긋나 있진 않은지, 이런 식으로 가끔 CLI로 직접 대조해볼 것(`pm/docs/handoff.md` "평소 루틴"과 같은 이유).

## 사용자 (7명)

> 로그인 이메일은 개인정보라 여기 안 적는다(이 레포는 public — `email-delivery.md`가 이미 같은 원칙). OCI 콘솔 `Identity & Security → Domains → Default → Users`에서 실제 목록 확인 가능.

| 사용자 | 소속 그룹 | 콘솔 로그인 | 용도 |
|---|---|---|---|
| 장찬욱(인프라 오너) | Administrators | 가능(MFA) | 본인 계정 |
| 김우진(PM) | Administrators | 가능(MFA) | DB·리소스 직접 확인이 필요한 PM 책임 때문(`db-access.md` "접근 대상" 참고) |
| 신선우(BE) | be-dev-stage | 가능(MFA) | |
| 안시현(BE) | be-dev-stage | 가능(MFA) | |
| 동아리 공용 계정(Outlook — 도메인·호스팅 로그인, UptimeRobot 가입 계정과 동일) | likelion-spring-boot | 가능(MFA 미설정) | 백엔드 Object Storage(likelion-stage/prod 버킷) Customer Secret Key 보유용으로 등록. 다목적 공용 계정 |
| `backup-svc` (서비스 계정) | likelion-backup-writer | **불가**(설명에 "no console login" 명시, 이메일 필드는 IDCS 필수 요구사항이라 채워둔 것뿐) | 백업 스크립트 전용 — Customer Secret Key만 사용 |
| `smtp-mailer` (서비스 계정) | email-senders | **불가** | 이메일 발송 전용 — SMTP 자격증명만 사용, 로그인 이메일은 장찬욱 개인 메일에 `+smtp-mailer` 별칭을 붙인 것(`email-delivery.md` 참고, 실주소는 레포에 안 남김) |

## 그룹 · 다이나믹 그룹 · 정책 (최소권한 매핑)

| 그룹 | 멤버 | 정책(Policy) | 실제 권한 |
|---|---|---|---|
| `Administrators` | 장찬욱, 김우진 | `Tenant Admin Policy` | `manage all-resources in tenancy` — 테넌시 전체 관리 |
| `be-dev-stage` | 신선우, 안시현 | `likelion-storage-policy` | `likelion-stage` 버킷만 manage |
| `likelion-spring-boot` | 동아리 공용 계정 | `likelion-storage-policy` | `likelion-stage`+`likelion-prod` 버킷 manage(백엔드 실제 운영 자격증명 — `be-dev-stage`보다 범위 넓음, prod 포함) |
| `email-senders` | `smtp-mailer` | `email-senders-policy` | `email-family` 사용(발송만 — 발신주소·도메인 관리 권한 아님) |
| `likelion-backup-writer` | `backup-svc` | `likelion-backup-policy` | `likelion-backups` 버킷만 manage |
| `likelion-monitoring-dyngroup`(다이나믹 그룹 — 사람이 아니라 매칭되는 인스턴스 자신) | likelion-prod 인스턴스(instance principal) | `likelion-monitoring-policy` | `metrics` 사용(커스텀 메트릭 전송). 같은 정책의 두 번째 문장(`Allow service monitoring to use ons-topics in tenancy`)은 그룹이 아니라 **Monitoring 서비스 자신**이 Alarm→ONS로 발행하는 데 필요한 서비스 주체용 |

**설계 원칙(실측으로 확인된 패턴)**: 사람 계정(Administrators)과 애플리케이션/서비스 자격증명(smtp-mailer·backup-svc·인스턴스 principal)을 철저히 분리 — 서비스 계정은 전부 콘솔 로그인이 안 되거나(smtp-mailer, backup-svc) 인스턴스 자신의 identity(다이나믹 그룹)를 쓴다. 버킷 접근도 그룹별로 stage만/stage+prod로 나뉘어(`be-dev-stage` vs `likelion-spring-boot`) 한 자격증명이 유출돼도 영향 범위가 제한된다.

<a id="new-user"></a>
## 새 인프라 담당자용 IAM 사용자 만들기 (인수인계 시 실제 절차)

1. **콘솔 로그인 계정 생성**: `Identity & Security → Domains → Default → Users → Add User` — 후임자 본인 이메일로 생성(그 사람이 자기 비밀번호를 직접 설정하는 초대 메일이 감).
2. **`Administrators` 그룹에 추가** — `Groups → Administrators → Add User to Group`.
3. **CLI용 API 서명 키 발급** — 후임자 본인이 로그인해서 `우측상단 프로필 → My Profile → API Keys → Add API Key`(로컬에서 만든 공개키를 업로드하거나, 콘솔이 만들어주는 키페어를 다운로드) → 로컬 `~/.oci/config`에 `user`·`fingerprint`·`tenancy`·`region`·`key_file` 채우기(장찬욱 로컬 세팅과 동일 패턴, `infra/CLAUDE.md`의 "OCI CLI 세팅" 참고) → `oci iam user list --query data[0]`로 접속 테스트.
4. 이 계정은 **서버 SSH 접속과는 완전히 무관**하다 — SSH는 별도로 `ubuntu` 계정 `authorized_keys`에 공개키를 등록해야 한다(`pm/docs/handoff.md` "계정 인벤토리" 참고). 콘솔·CLI로 OCI 리소스(Monitoring·Storage 등)는 만질 수 있어도 그걸로 서버(compute 인스턴스) 안에 들어갈 수 있는 건 아니다 — 이 둘을 헷갈리지 말 것.

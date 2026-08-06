---
name: run-fullstack
description: >-
  Start the frontend (Next.js, :3000) and backend (Spring Boot, :8080) together
  on Windows for local UI testing/QA of a feature branch. Use when the user says
  "프론트 백 띄워줘", "풀스택 띄워줘", "로컬에서 띄워서 확인", "UI 고치려는데 서버 띄워줘"
  or similar — i.e. they want to click around a real running app, not just read code.
  Covers backend env vars that have no defaults, the e2e-profile trick for a
  local admin login, the default port mismatch between backend and frontend's
  proxy, and a Windows-specific npm install gotcha. NOT for staging/prod — this
  repo's own learning is "이미 떠 있는 환경엔 로컬에 복제하지 말고 직접 붙어라" for
  everyday FE dev; use this skill specifically when the user asks for a *local*
  full stack (e.g. testing a branch not yet on stage, or offline work).
---

# 로컬 풀스택 실행 (Windows)

이 레포는 로컬 실행 문서가 따로 없다 — `backend/.env.example`엔 있는데 `application.yml`이 기본값 없이 요구하는 변수(OCI_STORAGE_*)가 빠져 있고, 프론트 프록시 기본 포트(8081)와 백엔드 기본 포트(8080)가 어긋나 있다. 아래는 2026-08-06에 실제로 삽질해서 확인한 절차.

## 1. 백엔드 `.env` (gitignore 대상, `backend/.env`)

`application.yml`이 `${VAR}`(기본값 없음)로 요구하는 게 많아서, 로컬에서 실제로 안 쓸 값(메일·OCI)도 더미로 채워야 기동된다. `me.paulschwarz:spring-dotenv`가 자동으로 읽는다.

```
DB_PATH=./data/local.db
JWT_SECRET=<openssl rand -base64 48 로 생성>
JWT_ACCESS_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000
ADMIN_LOCKOUT_MAX_ATTEMPTS=10
ADMIN_LOCKOUT_DURATION_MINUTES=15
ADMIN_SEED_ADMINS=
FRONTEND_BASE_URL=http://localhost:3000
PUBLIC_SITE_URL=http://localhost:3000
COOKIE_SECURE=false
RECRUITMENT_APPLICATION_FORM_READY=true
ADMIN_E2E_ADMIN_EMAIL=e2e-admin@likelion-khu.com
ADMIN_E2E_ADMIN_PASSWORD=E2eAdmin!2026
MAIL_SMTP_HOST=smtp.email.ap-tokyo-1.oci.oraclecloud.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USERNAME=dummy
MAIL_SMTP_PASSWORD=dummy
MAIL_FROM_ADDRESS=noreply@likelion-khu.com
OCI_STORAGE_ENDPOINT=http://localhost:9000
OCI_STORAGE_REGION=us-east-1
OCI_STORAGE_ACCESS_KEY=dummy
OCI_STORAGE_SECRET_KEY=dummy
OCI_STORAGE_BUCKET=dummy
OCI_STORAGE_PUBLIC_URL=http://localhost:9000/dummy
```

`mkdir -p backend/data` 먼저 (SQLite 파일이 들어갈 디렉터리, `backend/data/`는 이미 gitignore됨). `OciStorageConfig`의 `S3Client` 빈은 생성 시점에 실제 연결을 안 하므로 더미 자격증명으로도 기동은 된다 — 실제 업로드 기능을 누르면 그때 깨진다(로컬 UI 테스트 범위 밖).

## 2. 로그인 — `SPRING_PROFILES_ACTIVE=e2e`

운영 계정은 랜덤 비번 + 재설정 메일 방식이라 로컬에서 비번을 알 방법이 없다. `e2e` 프로필을 켜면 `E2eAdminSeedRunner`(`@Profile("e2e")`)가 고정 비번 어드민 계정을 하나 시드한다 — stage/prod `.env`엔 이 프로필이 없어서 안전.

- 계정: `e2e-admin@likelion-khu.com` / `E2eAdmin!2026`

> **깃가디언이 이 줄을 "Company Email Password"로 오탐할 수 있음 — 실제 위협 아님.** 이건 실제 메일함이 아니라 `E2eAdminSeedRunner`(`@Profile("e2e")`)가 심는 이 앱 자체의 admin 계정이고, `SPRING_PROFILES_ACTIVE=e2e`를 명시하지 않는 한 빈 자체가 안 생겨 stage/prod엔 존재하지 않는다(`E2eAdminSeedRunnerProfileGateTest`로 고정 검증됨, `.env.stage`/`.env.prod`엔 이 프로필 자체가 없음). 이 고정값은 코드 기본값(`E2eAdminSeedRunner`의 `@Value` 기본값)으로 이미 공개 저장돼 있던 값이라 여기 적었다고 새로 유출되는 것도 아니다 — 프로필 게이트가 보안 경계라 값 자체는 비밀일 필요가 없다. 경보가 뜨면 로테이션 대신 false positive로 dismiss.

## 3. 백엔드 기동

```
cd backend
SPRING_PROFILES_ACTIVE=e2e ./gradlew bootRun
```

`server.port` 지정이 없어서 **기본 8080**으로 뜬다(`infra/`의 127.0.0.1 바인딩 설정은 컨테이너 배포용이라 로컬엔 안 걸림).

## 4. 프론트 `.env.local` (gitignore 대상, `frontend/.env.local`)

`next.config.ts`의 rewrite 기본값은 `BACKEND_URL ?? 'http://localhost:8081'` — 백엔드 기본 포트(8080)와 다르다. 반드시 맞춰준다:

```
BACKEND_URL=http://localhost:8080
```

## 5. 프론트 기동

```
cd frontend
npm ci   # node_modules가 stale하면(예: echarts처럼 최근 추가된 의존성이 안 깔려 있으면) 여기서 잡힘
npm run dev
```

**Windows 함정:** 프론트 dev 서버(Turbopack)가 떠 있는 상태로 `npm ci`를 돌리면 `lightningcss.win32-x64-msvc.node` 같은 네이티브 바이너리가 프로세스에 로드돼 있어서 `EPERM: operation not permitted, unlink`로 실패한다. **먼저 기존 dev 서버 프로세스를 죽이고** `npm ci` → `npm run dev` 순서로.

## 6. (선택) 어드민 인프라 배포 이력 차트를 데이터 있는 채로 보고 싶으면

`DeployHistoryService`는 `DEPLOY_HISTORY_PATH`(기본 `/app/deploy-history`, 컨테이너 전용 마운트)가 로컬엔 없어서 빈 배열만 준다 — 에러는 아니지만 차트가 텅 빈다. `/admin/infra`의 배포 트랙 차트처럼 실제 데이터로 겹침·실패 표시를 확인해야 하면:

1. `backend/.env`에 `DEPLOY_HISTORY_PATH=./deploy-history-local` 추가
2. `mkdir -p backend/deploy-history-local`
3. `backend/deploy-history-local/stage.jsonl`에 한 줄당 레코드 하나, 필드는 `DeployRecord`(`timestamp, env, sha, outcome, migrations[], expectedMigrationCount, actualMigrationCount`) 그대로. `outcome`은 `confirmed | rolled_back | rollback_failed | manual_intervention_needed | migration_check_blocked | build_failed | unknown` 중 하나 — 시나리오 확인하려면 여러 개 섞어 넣는다.
4. 이 디렉터리는 `.gitignore`에 이미 등록돼 있음 (`backend/deploy-history-local/`).

## 7. 확인

```
curl -s -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-admin@likelion-khu.com","password":"E2eAdmin!2026"}' \
  -c cookies.txt
```
200이면 로그인 성공. 이후 브라우저에서 `http://localhost:3000`으로 같은 계정으로 로그인해서 확인.

## 끝낼 때
`Get-Process -Name java,node -ErrorAction SilentlyContinue | Stop-Process -Force` (PowerShell) 로 정리. 둘 다 백그라운드로 띄웠으면 프로세스가 남아있을 수 있다.

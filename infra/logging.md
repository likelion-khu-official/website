# 애플리케이션 로그 영속화 — 재배포해도 안 사라지게 (2026-07-22)

> 인프라 문서. stage에서 `POST /api/posts` 400 whitebox 에러(스프링 기본 에러, 커스텀 핸들러 미적용)를 디버깅하려다
> 재배포로 컨테이너가 교체되며 직전 로그가 통째로 사라진 걸 발견 → 근본 수정.

## 문제

도커 기본 로그(json-file 드라이버)는 **컨테이너의 쓰기 레이어**에 저장된다. `docker-compose.yml`엔 `./data:/app/data`만 볼륨으로 영속화돼 있었고 로그는 아니었다 — 그래서 CD가 배포마다 컨테이너를 `docker rm`으로 교체할 때(`docker compose up -d`가 이미지 태그 변경을 감지하면 재생성) 직전 버전의 로그가 함께 삭제됐다. 디버깅하려던 시점엔 이미 재배포가 한 번 더 지나가서 원하던 스택트레이스는 복구 불가능했다.

## 해법

1. **Spring Boot가 파일로도 로그를 쓰게** (`backend/src/main/resources/application.yml`):
   ```yaml
   logging:
     file:
       name: ${LOG_FILE_PATH:logs/website-backend.log}
     logback:
       rollingpolicy:
         max-file-size: 20MB
         max-history: 14
         total-size-cap: 1GB
   ```
   콘솔 출력(`docker logs`)은 그대로 유지 — 파일은 추가일 뿐 대체가 아니다.

2. **배포 태그를 파일명에 그대로 사용** (`infra/docker-compose.yml`):
   ```yaml
   backend-stage:
     environment:
       - LOG_FILE_PATH=/app/logs/${STAGE_TAG:-stage-latest}.log
     volumes:
       - ./logs/stage:/app/logs
   ```
   `STAGE_TAG`/`PROD_TAG`는 CD가 이미지 태그(`stage-<커밋SHA>`)로 이미 쓰던 값 — 새 변수를 안 만들고 재사용해서 로그 파일명과 배포 버전이 항상 1:1로 대응한다. prod는 `./logs/prod` + `PROD_TAG`로 동일 구조.

3. **호스트 바인드 마운트로 컨테이너 생사와 분리** — `/app/logs`는 컨테이너 내부 경로지만 실제 저장소는 호스트(`infra/logs/{stage,prod}/`). 컨테이너가 재생성돼도 마운트를 다시 걸 뿐 파일은 그대로 남는다.

## git-drift 알람과의 상호작용 (놓치기 쉬운 지점)

`infra/data/`처럼 `infra/logs/`도 **`.gitignore`에 반드시 추가**해야 한다. 안 그러면 컨테이너가 로그 파일을 쓰는 순간부터 서버 워킹트리에 untracked 파일이 생겨 `push-git-drift-metric.py` 기반 CRITICAL 알람(`observability.md` 참고)이 오탐 발동한다. 이번 작업에서 `infra/data/` 바로 아래 줄에 `infra/logs/`를 추가해 처리함.

## 배포 경로 — 이번에 실제로 겪은 제약

- **`infra/**` 단독 변경은 CD를 트리거하지 않는다** (`.github/workflows/cd.yml` paths 필터가 `backend/**`, `shared/**`만 감시). `docker-compose.yml`만 고친 두 번째 커밋(접두사 버그 수정)은 push해도 자동 배포가 안 돌아서, 서버에 SSH로 들어가 `git pull` + `docker compose up -d backend-stage`를 수동으로 해야 했다.
- **OCI 서버의 배포용 SSH 키(deploy key)는 GitHub에 read-only로 등록돼 있다.** 서버의 git 체크아웃에서 커밋까지는 되지만 `git push`가 `key ... marked as read only`로 거부된다 — 서버가 origin보다 여러 커밋 앞서 있던 것도 이 때문(과거에 서버에서 만든 로컬 전용 sync 커밋들이 애초에 push가 안 됐던 것). 이 세션에서는 로컬 머신에 `gh` CLI로 인증된(레포 write 권한 있는) 계정이 있어, 서버에서 만든 커밋과 동일한 파일을 로컬 클론에 재현해 그쪽에서 push했다. **서버 SSH 세션에서 레포 변경이 필요하면, 커밋은 거기서 해도 push는 write 권한이 있는 다른 경로로 해야 한다.**

## 파일

| 파일 | 역할 |
|---|---|
| `backend/src/main/resources/application.yml` | `logging.file.name`/`logging.logback.rollingpolicy` — 파일 로깅 + 롤링 정책 |
| `infra/docker-compose.yml` | `backend-stage`/`backend-prod`에 `LOG_FILE_PATH` 환경변수 + `./logs/{stage,prod}:/app/logs` 볼륨 |
| `infra/logs/{stage,prod}/` | 실제 로그 파일 저장 위치 (서버에만 존재, gitignore) — 파일명 = 배포 태그(`stage-<sha>.log`) |

## 실측 검증 (2026-07-22)

- 배포 후 `infra/logs/stage/`에 `stage-05a02e299030a7090b0d014724453e7acecd88c5.log` 생성 확인, Spring 시작 로그부터 정상 기록.
- 접두사 중복 버그(`LOG_FILE_PATH=/app/logs/stage-${STAGE_TAG}.log`에서 `STAGE_TAG` 자체가 이미 `stage-`로 시작해 `stage-stage-<sha>.log`가 된 것) 발견 → `docker-compose.yml`에서 리터럴 접두사 제거 → 재생성 후 `stage-<sha>.log`로 정상화. 이전 컨테이너가 남긴 중복 접두사 파일은 무해하게 그대로 남아있음(수동 정리 가능, 급하지 않음).
- 재배포(컨테이너 교체) 이후에도 이전 버전 로그 파일이 호스트에 남아있는 것 확인 — 원래 목적(재배포해도 로그 유실 안 됨) 달성.

## 미결 사항

- 배포가 잦아지면 `infra/logs/{stage,prod}/` 아래 버전별 파일이 무한정 쌓인다(파일당 롤링은 걸려있지만 파일 자체를 지우진 않음) — 디스크 사용량이 문제가 되면 오래된 로그 파일을 주기적으로 정리하는 cron 추가 검토(`push-disk-metric.py` 알람이 80% 넘으면 먼저 알려주긴 함).
- 중복 접두사로 남은 `stage-stage-....log` 잔존 파일 — 급하지 않은 수동 정리 대상.

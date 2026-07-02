# 결과 — #8 인프라 · stage/prod 추상화 (프론트가 붙는 서버 + 배포 뼈대)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업시킨다(여기엔 이 미션 고유의 결과만).

## 산출물
- **stage/prod 격리 + CI/CD 뼈대**
  - `infra/docker-compose.yml`: `backend-stage`(8081→8080)·`backend-prod`(8080) 별도 서비스, 별도 `env_file`(.env.stage/.env.prod), 독립 이미지 태그(STAGE_TAG/PROD_TAG), DB도 `DB_PATH`로 stage.db/prod.db 분리
  - `.github/workflows/cd.yml`: 브랜치 분기(dev→stage, main→prod), QEMU arm64 빌드, GHCR 푸시, SSH 배포, 헬스체크·스모크, 실패 시 자동 롤백
  - `.github/workflows/ci.yml`: PR 테스트+코멘트
  - `infra/CLAUDE.md`: 브랜치↔환경 매핑 = 개발팀 인터페이스("dev 머지→stage, main 머지→prod")

## 결정
- **프론트↔stage 연결은 B안(rewrite 프록시)** 으로 선회 — CORS 불필요 + 백엔드 주소 은닉. stage는 `랜덤문자열.likelion-khu.com`(git 비노출).
- **브랜치=환경 1:1** 로 CI/CD 분기를 브랜치 이름 하나로 결정 (환경별 워크플로 분리보다 단순).
- prod 보호는 GitHub 브랜치 protection(일반 머지만 허용)으로.

## 후속 (비시급)
- **실동작 검증의 마지막 1cm**: 장찬욱 실서버 접속 확인 + 프론트의 stage 실연결을 실제 URL에서 확인 (nginx.conf는 gitignore라 레포로 증명 불가)
- CI 빌드·스모크가 아직 stub(백엔드 코드 붙으면 실게이트로) · **SQLite 백업 미결**(단일 노드 DB 유실 위험)

## 배운 것
- → learnings 졸업분 다수(브랜치=환경 매핑·프록시·데이터 격리·무료티어 등은 이미 `learnings.md`에). 이 미션 고유의 남은 통찰: **뼈대는 다 짰는데 "작동 확인"의 마지막 검증이 레포 밖(콘솔·nginx)에 남으면 "됐다"를 증명할 단일 출처가 사라진다** — 검증 결과도 레포 안(또는 정해진 비공개 단일 출처)에 남겨야.

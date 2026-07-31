# CI/CD 절차 — `.github/workflows/ci.yml` · `cd.yml`

> 인프라 문서. 아래는 `cd.yml` 실제 스텝을 그대로 옮긴 것 — 코드가 바뀌면 이 다이어그램도 같이 갱신한다.

## 배포 파이프라인 (CD)

PR이 `dev`/`main`에 머지되면(`backend/**` 또는 `shared/**` 변경 시에만 트리거) 아래 파이프라인이 돈다. 박스 왼쪽 열은 GitHub Actions 러너, 오른쪽 열은 OCI 서버(SSH)에서 실행되는 구간이다.

```mermaid
flowchart TD
    Trigger["PR → dev/main 머지<br/>(backend/** 또는 shared/** 변경 시에만)"] --> S1

    subgraph GHA["GitHub Actions: build-and-deploy"]
        S1["① 환경 판별<br/>dev→stage / main→prod<br/>(또는 수동 workflow_dispatch)"] --> S2
        S2["② 마이그레이션 위험도 판단<br/>새 마이그레이션 파일에 drop/rename<br/>또는 update/delete(DML) 패턴 grep<br/>push=이전 커밋과 diff / dispatch=판단불가→위험"] --> S3
        S3["③ 이미지 빌드<br/>docker buildx(arm64) → GHCR 푸시"]
    end

    S3 -->|"SSH (appleboy/ssh-action)"| S4

    subgraph OCI["OCI 서버 (likelion-oci)"]
        S4["④ 이전 태그 백업<br/>PREV_TAG → .prev_backend_tag_{env}"] --> Risky{"⑤ ②에서<br/>위험/판단불가?"}
        Risky -->|"예"| Backup["배포 전 DB 자동 백업<br/>실패하면 배포 자체 중단"]
        Risky -->|"아니오(추가형)"| S7
        Backup --> S7
        S7["⑥ git reset --hard origin/&lt;브랜치&gt;<br/>⑦ docker compose pull + up -d<br/>← 이 안에서 Flyway가 마이그레이션 적용"] --> S8
        S8["⑧ 헬스체크 루프<br/>GET localhost/actuator/health<br/>3초 간격, 최대 120초"]
    end

    S8 -->|"통과"| Smoke
    S8 -->|"타임아웃"| Failed{"②에서<br/>위험 판정?"}

    Smoke["⑨ 스모크 테스트 (GitHub Actions → 공개 도메인)<br/>GET /api/{members,staff,posts,projects}"]
    Smoke -->|"전부 200"| Confirm["⑩ 배포 확정<br/>.prev_backend_tag_* 삭제<br/>(이때부터 새 버전이 '확정')"]
    Smoke -->|"하나라도 실패"| Failed

    Failed -->|"아니오 — 추가형(안전)"| Rollback["자동 롤백<br/>PREV_TAG로 up -d 재실행<br/>→ 롤백 후에도 헬스체크로 복구 확인<br/>→ 통과해야만 '롤백 완료', 아니면 실패 유지"]
    Failed -->|"예 — 삭제/변경형 또는 판단불가"| Manual["자동 롤백 생략<br/>실패 상태 유지 + 안내 로그만 출력<br/>사람이 fix-forward 우선 검토<br/>(필요시 RUNBOOK 수동 복구, ⑤ 백업 활용)"]

    style Confirm fill:#1a7f37,color:#fff
    style Rollback fill:#9a6700,color:#fff
    style Manual fill:#b32b2b,color:#fff
```

**읽는 법 — 왜 순서가 이렇게 고정돼 있나**:
- **②(마이그레이션 위험도 판단)이 이후 ⑤(사전 백업)·롤백 분기 전부를 결정한다(#320, 2026-07-31 이슈).** 이번 배포로 새로 추가된 마이그레이션이 컬럼 삭제·이름변경형이면, 구버전 앱으로 자동 롤백해도 그 컬럼을 찾다가 새로운 장애를 만들 수 있다 — 그래서 이 경우만 자동 개입을 멈추고 사람에게 넘긴다. 판정은 이 프로젝트가 SQLite 제약 때문에 삭제·이름변경에 항상 쓰는 "테이블 재생성 패턴"(`db-migration.md`)에 기대는 휴리스틱이라, 이 컨벤션을 벗어난 파괴적 SQL은 못 잡을 수 있다는 한계가 있다.
- **(2026-07-31 실측 보강) DROP/RENAME 키워드만으론 UPDATE/DELETE 같은 순수 DML을 못 잡는다.** 4개 시나리오(추가형/삭제형 × 성공/실패)로 stage 실측 검증하던 중, 실제 마이그레이션 히스토리에 `INSERT OR IGNORE`만 있는 파일(`V20260728115500`)이 이미 있었다는 걸 발견했다 — 그 파일 자체는 멱등해서 무해했지만, 같은 자리에 `UPDATE`/`DELETE`가 있었다면 "안전(추가형)"으로 오분류돼 배포 전 자동 백업도 안 뜨고 자동 롤백만 실행됐을 것이다. DROP/RENAME은 "구버전 앱과의 스키마 호환성" 문제, UPDATE/DELETE는 "롤백해도 이미 사라진 데이터는 안 돌아온다"는 문제로 종류가 다르지만 둘 다 사람이 먼저 봐야 하는 건 같아서, `update <표> set`·`delete from` 패턴도 같은 destructive=true로 묶었다(INSERT는 기존 행을 안 건드리니 계속 안전 취급).
- ④(이전 태그 백업)가 ⑨(스모크 테스트) 실패 시 되돌아갈 대상이다 — ⑩에서 배포가 완전히 확정된 뒤에만 이 마커를 지운다. 헬스체크(⑧) 직후에 지우면 스모크 테스트(⑨)가 실패해도 롤백 스텝이 "마커가 없다"며 그냥 건너뛰어버리는 사고가 실제로 있었다(#133 dev→main 승격 중 prod 실측) — 그래서 지우는 시점을 스모크 테스트 뒤로 미뤘다.
- ⑧(헬스체크)은 컨테이너 안에서 `localhost`로 확인 — "앱이 떴다"만 보장한다. ⑨(스모크 테스트)은 일부러 GitHub Actions에서 실제 공개 도메인으로 다시 찌른다 — DNS·TLS·nginx 라우팅까지 포함해 실제 사용자가 겪는 경로 그대로 검증하기 위해서다. 이 둘은 같은 걸 두 번 확인하는 게 아니라 서로 다른 계층을 본다.
- `infra/**`만 바뀐 커밋은 이 파이프라인이 아예 안 돈다(트리거 조건이 `backend/**`·`shared/**`뿐) — 그럴 땐 수동 배포가 필요하다. 절차는 [`RUNBOOK.md`](./RUNBOOK.md#cheat-sheet) "자주 쓰는 명령" 참고.

## PR 단계 (CI)

`ci.yml`은 PR이 열릴 때 백엔드 테스트를 돌리고 결과를 PR 코멘트로 남긴다 — 배포는 하지 않는다(그건 머지 이후 CD의 몫). dev/main 어느 쪽으로 가는 PR이든 동일하게 실행된다.

# 계약 — 발주(mission) ↔ 클레임(claim-mission) 불변식

이 문서가 단일 진실이다. 발주 쪽(PM용 `mission` 스킬)과 받는 쪽(`claim-mission`)이 **같은 약속**을 봐야 QA에서 안 터진다. 약속이 어긋나면(라벨을 바꾼다, 라우팅을 assignee 말고 다른 걸로 한다 등) 미션이 큐에 안 잡히거나 엉뚱한 사람에게 간다.

## 대상 레포·보드
- 레포: `github.com/likelion-khu-official/website`
- 조직 Projects v2: **project #1** (owner `likelion-khu-official`, id `PVT_kwDOEZZ_V84BbPtZ`)

## 명부 (단일 진실)
- `pm/roster.yml` — `members[].{name, handle, team}`. `team ∈ {디자인,프론트,백엔드,인프라,PM}`.
- `handle: null` = GitHub 계정 없음(디자인) → **claim-mission 대상 아님**(디자인은 카톡/Figma 경로).
- 이름·팀은 roster에만. 개인 신원 파일엔 안 적고 handle로 파생(drift 방지).

## 개인 신원
- 레포 루트 `/.identity.local.yml` (`.gitignore` 됨 — 절대 커밋 금지).
- 키는 **딱 둘**: `github_handle:` · `pat:`.
- PAT 스코프: **repo + project**(이슈 읽기 + 보드 카드 쓰기). 값은 어떤 로그에도 출력 금지.

## 라우팅·뱃지
- 미션 뱃지 = 라벨 **`roadmap`** + **팀 라벨**(`프론트`/`백엔드`/`인프라`/`디자인`). (새 라벨 만들지 않는다 — 기존 관례 재사용.)
- 라우팅 = **GitHub assignee**. 클레임은 `assignee == 내 handle` 인 이슈를 가져온다.
- 클레임 쿼리: `state:open` + `label:roadmap` + `assignee:<내 handle>`.

## 보드 좌표 (Projects v2)
- `PROJ_NUM=1` · `OWNER=likelion-khu-official` · `PROJ_ID=PVT_kwDOEZZ_V84BbPtZ`
- Status 필드 `PVTSSF_lADOEZZ_V84BbPtZzhWBlCY` — Todo `f75ad846` · In Progress `47fc9ee4` · Done `98236657`
- Team 필드 `PVTSSF_lADOEZZ_V84BbPtZzhWBlF8` — 프론트 `a2398a16` · 백엔드 `c2387007` · 인프라 `7d9a54b6` · 디자인 `2171eaba`
- (id가 안 맞으면 `gh project field-list 1 --owner likelion-khu-official --format json` 로 갱신.)

## 인증
- 모든 gh 는 `GH_HOST=github.com GH_TOKEN=<pat>` 방식(`pm/scripts/mission-fields.sh`와 동일). 스크립트가 신원 파일에서 PAT를 읽어 내부적으로 세팅한다 — 사용자는 gh를 볼 일이 없다.

## Status 이동 규칙 (개정)
- 원칙은 "카드 이동은 PM만". 단 claim-mission 에서 **미션을 채간 팀원**이 두 지점을 스스로 옮긴다:
  - **착수 시** Todo→In Progress (`start-mission.sh`)
  - **IQ 게이트 통과 후 마감 시** In Progress→Done + 이슈 close (`close-mission.sh`)
- 즉 **미션은 연 사람이 닫는다.** PM은 발주·방향만.

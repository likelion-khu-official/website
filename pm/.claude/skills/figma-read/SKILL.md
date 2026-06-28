---
name: figma-read
description: >-
  Figma 디자인을 REST API로 읽고 분석한다 (MCP 아님 — 무료 한도에 안 걸리는 AI-native 방식).
  디자인팀이 Figma 링크를 줬을 때, PM(김우진)이 "이 디자인 읽어/봐줘/분석해", "와이어프레임
  평가", "시안 확인", "노드 뜯어봐", "이미지로 뽑아" 등을 말하면 쓴다. 파일 구조·노드 트리를
  JSON으로 읽거나, 특정 프레임을 PNG로 export 해서 시각 분석한다. PAT은 git-무시 파일(pat.local)에
  있고(스킬엔 토큰 없음), 사용 전 토큰 위치·유효성을 검증한다. read 결과는 designs/에 저장하고,
  긁기가 끝나면 notify-template으로 프론트·백엔드 팀에 경로·핵심을 알린다.
---

# figma-read — Figma를 REST API로 읽는다

디자인은 Figma(레포 밖 단일 진실)에 산다. 그걸 **MCP가 아니라 REST API**로 읽는다 — MCP 무료 한도(월 호출 제한)에 안 걸리고, 헤더 하나로 끝나는 AI-native 방식.

> **왜 캡쳐가 아니라 API냐:** 캡쳐는 PM이 손으로 떠야 하고 구조(노드·계층·자동레이아웃)를 잃는다. API는 트리·제약·상태를 그대로 주고, 필요하면 그 위에서 PNG도 뽑는다.

## 0) 토큰 — 위치·검증 (항상 먼저)

PAT은 이 스킬 폴더의 **git-무시 파일**에만 있다(레포·스킬 본문·이슈엔 적지 않는다):
```
pm/.claude/skills/figma-read/pat.local      ← 토큰 한 줄. *.local 룰로 git 추적 제외.
```
`PAT=$(cat pm/.claude/skills/figma-read/pat.local)` 로 읽어 쓴다. **쓰기 전 항상 두 가지 검증:**
```
# (1) git에 안 올라가는지 — 경로가 출력되면 ignore됨(안전). 무출력이면 위험 → 중단하고 PM에 알림.
git check-ignore -v pm/.claude/skills/figma-read/pat.local
# (2) 토큰이 살아있는지 — handle/email JSON 나오면 OK.
curl -s -H "X-Figma-Token: $(cat pm/.claude/skills/figma-read/pat.local)" https://api.figma.com/v1/me
```
- 파일이 없으면 → **PM에게 PAT 요청**, 받아서:
  `printf '<PAT>\n' > pm/.claude/skills/figma-read/pat.local && chmod 600 그_파일`. 그 뒤 (1)(2) 재검증.
- `/v1/me`가 `403 Invalid token` → 만료/오타. figma.com → Settings → Security → Personal access tokens 에서 새로 발급받아 위 파일만 교체.

> 이하 모든 호출은 `-H "X-Figma-Token: $(cat pm/.claude/skills/figma-read/pat.local)"`. 토큰 문자열을 명령에 직접 박지 않는다 — 항상 파일에서 읽는다(셸 히스토리·로그 유출 방지).

## 1) 링크에서 file key·node-id 뽑기

Figma URL 형태:
```
https://www.figma.com/design/<FILE_KEY>/<이름>?node-id=12-345&...
https://www.figma.com/file/<FILE_KEY>/<이름>            (구형)
```
- **`<FILE_KEY>`** = `design/` 또는 `file/` 바로 뒤 토막.
- **node-id**: URL은 `12-345`(하이픈), **API는 `12:345`(콜론)**. 변환해서 쓴다.

## 2) 파일 구조 읽기 (노드 트리)

전체 문서 트리 — 페이지·프레임·계층을 본다:
```
curl -s -H "X-Figma-Token: <PAT>" "https://api.figma.com/v1/files/<FILE_KEY>" \
  | jq '.name, (.document.children[] | {page:.name, frames:[.children[]?.name]})'
```
큰 파일은 통째 받으면 무겁다 → **특정 노드만**:
```
curl -s -H "X-Figma-Token: <PAT>" \
  "https://api.figma.com/v1/files/<FILE_KEY>/nodes?ids=12:345,12:346" | jq '.nodes'
```
노드에서 볼 것: `type`(FRAME/TEXT/COMPONENT/INSTANCE), `name`, `children`, `absoluteBoundingBox`(위치·크기), `layoutMode`(자동레이아웃), `characters`(텍스트 내용).

## 3) 이미지로 export (시각 분석)

특정 프레임을 PNG로 뽑아 **눈으로** 본다:
```
# 1) 렌더 URL 받기 (scale 2 = 선명)
curl -s -H "X-Figma-Token: <PAT>" \
  "https://api.figma.com/v1/images/<FILE_KEY>?ids=12:345&format=png&scale=2" | jq -r '.images'
# 2) 보관 폴더(시점별)로 바로 내려받는다 — /tmp 아님. 파일명은 <프레임이름>__<nodeid>(콜론→하이픈).
TS=$(date +%Y-%m-%d_%H%M); DIR=designs/<FILE_KEY>/frames/$TS; mkdir -p "$DIR"
curl -s -o "$DIR/Recruitment__23-521.png" "<위에서 받은 URL>"
```
받은 PNG는 `Read` 툴로 열어 룩앤필·레이아웃을 직접 평가한다. 보관은 §5 규칙대로(시점 폴더에 쌓임).

## 4) 분석 관점 — 무엇을 보나

> **와이어프레임은 카피가 아니라 구조·흐름·상태로 본다.** (learnings 등록됨)
> 플레이스홀더("Sub text")는 와이어의 정상 상태 — 와이어가 답할 건 "메시지 들어갈 *자리*가 있나"지 "내용"이 아니다.

- **구조/IA** — 페이지·섹션 위계가 말이 되나. 빠진 화면은 없나.
- **흐름** — 유저 경로(랜딩→모집폼→완료)가 노드로 이어지나.
- **상태** — 빈/로딩/에러/완료 같은 상태 프레임이 있나.
- **반응형** — 데스크탑·모바일 프레임이 분리돼 있나.
- **모르는 영역은 결과만 판단**(PM은 art-direct 안 함). 피드백은 디자인 이슈/박스로.

## 5) 저장 — 매 read마다 (필수)

> **읽었으면 반드시 남긴다.** 매 세션이 0에서 시작하지 않게 — read한 디자인 정보를 정제해 `designs/`에 쌓는다(미션 박스와 같은 "PM 정제 맥락" 철학). 안 남기면 다음 세션이 또 처음부터 API를 긁는다.

**위치·구조 — 한 Figma 파일 = 한 폴더:**
```
pm/.claude/skills/figma-read/designs/<FILE_KEY>/
  digest.md                    ← (필수) 정제된 정보. 매 read마다 최신 상태로 "갱신"(덮음) + 끝에 변경 이력 한 줄.
  frames/<YYYY-MM-DD_HHMM>/<프레임이름>__<nodeid>.png  ← export 이미지. read 시점 폴더에 쌓는다(덮지 않음).
  raw/*.json                   ← (선택) 다시 파싱할 일 있는 노드 원본.
```
> **왜 이미지는 시간 폴더냐:** 디자인은 바뀐다. digest는 "최신"이라 덮지만, 이미지를 덮으면 *그날 어떻게 생겼었는지*가 사라진다. read 시점별로 쌓아야 변화 추적·diff가 된다. 폴더명 = `date +%Y-%m-%d_%H%M`(같은 날 두 번 read해도 안 겹치게 시각까지). digest의 "Export된 이미지"는 *최신* 시각 폴더를 가리킨다.

> **파일명 = `<프레임이름>__<nodeid>.png`** (node-id만 쓰지 않는다 — 사람이 못 읽음). Figma 트리의 프레임 `name`을 케밥으로 정리(공백·`/`→`-`, 한글은 둬도 됨), `__` 뒤에 node-id(콜론→하이픈). **이름 중복 주의**(예: "Main Page" 두 장) — `__nodeid`가 충돌을 풀고, 의미가 다르면 이름에 한정어를 붙인다(`Main-Page-full`, `Members-grid`/`Members-zigzag`). node-id를 남기는 이유: 같은 프레임 재export·digest 역참조에 필요.

**`digest.md` 형식 (이 규칙대로):**
```
---
file_key: <FILE_KEY>
source_url: <Figma 링크>
last_read: 2026-06-28        # 절대일자. 상대표현 금지.
pages: <페이지 수>
---

# <파일 이름> — 디자인 다이제스트

> Figma가 단일 진실. 이 파일은 그날의 **스냅샷**이라 썩을 수 있다 — 의심되면 `last_read` 보고 다시 read.

## 페이지·프레임 트리
<page → frame 계층. 각 프레임 node-id 병기(예: `랜딩 (12:345)`).>

## 분석 — 구조·흐름·상태
<섹션 4 관점으로. 카피 아님. 흐름(랜딩→모집폼→완료)·상태 프레임 유무·반응형 분리.>

## Export된 이미지
<frames/*.png 목록 + 무엇을 담았나. 없으면 "없음".>

## 변경 이력
- 2026-06-28: 최초 read / 무엇이 새로 보였나.
```

**규칙:**
- `digest.md`는 **항상** 쓴다(읽기만 하고 안 남기면 미완). 이미지·raw는 필요할 때만.
- 같은 파일을 또 read하면 digest를 **덮어 최신화**하고, "변경 이력"에 그날 줄을 *추가*(누적은 이력에서만).
- `designs/`는 **git에 올린다**(디자인 지식 축적). `pat.local`만 빠진다. 단 digest엔 토큰·S3 URL(만료) 박지 말 것.
- FILE_KEY가 폴더명 — 슬러그가 필요하면 `<FILE_KEY>--<짧은영문>`도 OK(트리에서 알아보기 쉽게).

## 6) 알림 — 긁기 완료 후 FE·BE에 알린다 (필수)

> 긁어서 저장만 하면 팀은 그게 있는 줄 모른다. **read·저장이 끝나면** 결과를 프론트·백엔드에 알린다: *"디자인 긁었다 / 경로 여기다 / 너희에게 중요한 건 이거다."* 디자인 접근권 없는 팀도 **커밋된 레포 경로**로 본다.

**이 알림은 "미션"이 아니다.** 미션 = 한 팀의 일감(무엇·왜·완료기준 + 박스 + roadmap 라벨 + 보드 카드). 알림 = 공유/싱크 FYI. 그래서:
- **별도 새 이슈로 판다**(미션 이슈에 코멘트로 묻지 않는다 — 디자인 한 번이 여러 미션에 걸리므로 한 미션에 종속시키면 안 된다).
- **미션 박스 없음**(`pm/missions/` 안 만든다), **roadmap 라벨 없음**, **보드(칸반)에 안 올린다**(`project item-add` 하지 않음). 미션 보드는 '할 일'만 깨끗이 유지.
- 이 디자인이 먹이는 **미션들을 본문에서 링크**해 양쪽을 잇는다(예: 모집알림이면 `#16`·`#18`).

절차:
1. **`notify-template.md`를 읽는다**(이 폴더). 골격만 있고 `<…>` 자리표시자가 비어 있다.
2. **이번 read 결과로 채운다**(agentic) — 파일명·프레임 수·`source_url`·`last_read`는 사실값으로. **"디자인팀이 만든 것 — 개발자용 정리"**는 digest를 바탕으로 *개발자가 Figma를 안 열어도 이해하게 서술*한다(화면 구성·주요 컴포넌트/인터랙션·반응형·아직 없는 화면). 디자인을 **설명**할 뿐 "구현하라/이게 좋다"는 지시·평가는 넣지 않는다(담백). 저장 위치는 **레포 상대경로가 아니라 GitHub URL로 직접** 준다(팀이 클릭해 바로 열게):
   - 파일(digest): `https://github.com/likelion-khu-official/website/blob/main/<레포상대경로>`
   - 폴더(frames 시점폴더): `https://github.com/likelion-khu-official/website/tree/main/<레포상대경로>`
   - `<레포상대경로>`는 레포 루트 기준(예: `pm/.claude/skills/figma-read/designs/<KEY>/digest.md`). 기본 브랜치가 main이 아니면 그 브랜치명으로.
   이 글은 *담백한 추출 보고*다: FE·BE에게 "뭘 하라"는 첨언·평가·권고는 넣지 않는다(있는 그대로만). 레제 첫 인사는 템플릿에 이미 있으니 유지. 채운 결과를 임시 파일로 저장.
3. **새 공유 이슈를 만들고, FE·BE 팀원을 매번 어사인한다.** 이 알림은 *주기적으로* 돌린다 — 그래서 제목에 **날짜**를 박아 회차를 구분하고, 어사인은 **매 회차 빠짐없이** 한다(수동 의존 금지).
   - 제목: `[디자인 공유] <파일명> — <날짜(last_read)> 시안 스냅샷`
   - 라벨: `프론트`·`백엔드`만 (roadmap·보드 ✕).
   - 어사인: **프론트·백엔드 팀원 전원**(핸들은 루트 `CLAUDE.md` 팀 섹션 기준 — FE `ParkIlha`·`hjdd0309`, BE `sunwoo`·`xihxxn`).
   - 인증 prefix(`GH_HOST`/`GH_TOKEN`)는 프로젝트 로컬 설정. **어사인은 생성과 분리해 개별 추가**한다 — 무효 핸들(레포 협업자 아님)이 섞여도 이슈 생성이 통째로 실패하지 않게:
   ```
   N=$(gh issue create --repo likelion-khu-official/website --label 프론트 --label 백엔드 \
        --title "[디자인 공유] <파일명> — <날짜> 시안 스냅샷" --body-file <채운 임시파일> | grep -o '[0-9]*$')
   for u in ParkIlha hjdd0309 sunwoo xihxxn; do
     gh issue edit "$N" --repo likelion-khu-official/website --add-assignee "$u" || echo "어사인 실패(무효 핸들?): $u"
   done
   ```
   - 무효 핸들로 실패하면 **그 사람만 건너뛰고** 나머지는 어사인한다(이슈 본문엔 다 보이니 전달은 됨). 어느 핸들이 무효인지 PM에게 한 줄 보고.
   - (선택) 관련 미션 이슈에 **한 줄 포인터 코멘트**만 남겨 연결: `gh issue comment <미션n> --body "디자인 공유: #<새이슈>"`. 내용 본체는 공유 이슈에 둔다.
4. **전제: 경로가 유효하려면 digest·frames가 git에 커밋(push)돼 있어야 한다.** 아직이면 먼저 올리고(또는 PM에게 올려달라 하고) 알린다 — 안 그러면 팀이 죽은 링크를 받는다.
- 인증·라벨 좌표는 `project-board`·`mission` 스킬과 동일. **단 이 알림 이슈는 그 스킬들의 라이프사이클(보드·박스)을 타지 않는다.**

## 함정 / 규칙
- 토큰은 **스킬 본문·레포·이슈에 절대 적지 않는다** — `pat.local`(git-무시)에만. 명령에도 직접 박지 말고 `$(cat …)`로 읽어라.
- `/images` 가 주는 S3 URL은 **만료**된다(받으면 바로 내려받기).
- node-id 하이픈↔콜론 변환 빼먹으면 `nodes`가 빈값.
- 워크스페이스가 PM 소유가 아니어도, **PAT 소유자가 그 파일에 접근권만 있으면** 읽힌다(어제 케이스).
- 큰 파일 통짜 `GET /files`는 느리다 → 페이지 목록부터 보고 `nodes`로 좁혀라.

#!/usr/bin/env bash
# claim-mission Step 4 — 현재 브랜치를 push 하고 리뷰용 PR을 연다. (코드 미션 마감)
#
# 왜: 마감 시 PR 을 여는 게 코드 미션의 주 산출물이다. 그런데 gh·git push 자격은
#     신원 파일의 PAT 에만 있다(Claude 셸엔 없다) — 그래서 push 와 pr create 를
#     이 스크립트가 PAT 로 감싼다. gh 로그인이 없는(인터뷰-PAT) 사용자도 되게.
#
# 절대: PAT 를 stdout/stderr/명령인자/URL 에 남기지 않는다(push 는 GIT_ASKPASS 로).
# DRY_RUN=1 이면 실제 push/생성 없이 명령만 echo.
#
# 사용:  scripts/create-pr.sh "<PR 제목>" "<PR 본문>" [base=dev]
set -euo pipefail

TITLE="${1:?PR 제목}"
BODY="${2:-}"
BASE="${3:-dev}"
DRY_RUN="${DRY_RUN:-0}"

REPO="likelion-khu-official/website"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)
[[ "$BRANCH" != "HEAD" ]] || { echo "DETACHED_HEAD: 브랜치에서 실행하세요(지금 분리된 HEAD)."; exit 4; }

if [[ "$DRY_RUN" == "1" ]]; then
  echo "git push origin HEAD:$BRANCH   (GIT_ASKPASS 로 PAT 주입)"
  echo "gh pr create --repo $REPO --base $BASE --head $BRANCH --title \"$TITLE\" --body \"…\""
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "NOT_A_REPO: git 저장소 안에서 실행하세요."; exit 2; }
ID_FILE="$REPO_ROOT/.identity.local.yml"
[[ -f "$ID_FILE" ]] || { echo "NO_IDENTITY: 신원 파일이 없습니다 — 먼저 check-identity.sh."; exit 10; }

PAT=$(python3 -c "
d={}
for line in open('$ID_FILE'):
    line=line.rstrip('\n')
    if ':' not in line: continue
    k,v=line.split(':',1)
    d[k.strip()]=v.strip().strip('\"').strip(\"'\")
print(d.get('pat',''))
" 2>/dev/null)
[[ -n "$PAT" ]] || { echo "BAD_IDENTITY: pat 비어 있음."; exit 11; }
export GH_HOST=github.com GH_TOKEN="$PAT"

# push — 토큰을 URL/인자에 안 남기려고 임시 askpass 로 주입(파일 권한 600, 즉시 삭제).
ASKPASS=$(mktemp)
chmod 600 "$ASKPASS"
printf '#!/bin/sh\necho "%s"\n' "$PAT" > "$ASKPASS"
chmod 700 "$ASKPASS"
if ! GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0 git push origin "HEAD:$BRANCH" >/dev/null 2>&1; then
  rm -f "$ASKPASS"
  echo "PUSH_FAIL: 브랜치 push 실패 — 토큰에 repo 권한이 있는지, 브랜치가 맞는지 확인하세요."
  exit 5
fi
rm -f "$ASKPASS"

URL=$(gh pr create --repo "$REPO" --base "$BASE" --head "$BRANCH" \
  --title "$TITLE" --body "$BODY" 2>/dev/null) || {
  echo "PR_FAIL: PR 생성 실패 — 이미 열려 있거나(그럼 그 PR 을 쓰세요) 권한이 부족합니다."
  exit 6; }
echo "PR ✓ $URL"

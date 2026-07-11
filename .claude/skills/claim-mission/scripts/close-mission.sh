#!/usr/bin/env bash
# claim-mission Step 4 — 미션 마감. 보드 카드 → Done + 이슈 close.
#
# 왜: 미션은 연 사람이 닫는다. IQ 게이트를 통과하면(산출물·PR 마무리 후) 이 스크립트로
#     보드 카드를 Done 으로 옮기고 이슈를 닫는다 — 한 미션의 생애를 여기서 끝낸다.
#
# 인증은 /.identity.local.yml 의 PAT(scope: repo+project). 절대 PAT를 출력하지 않는다.
# DRY_RUN=1 이면 실제로 닫지 않고 실행할 명령만 echo (자가 점검용, 인증 불필요).
#
# 사용:  scripts/close-mission.sh <issue#> [마감 코멘트]
set -euo pipefail

ISSUE="${1:?issue number}"
COMMENT="${2:-완료 — claim-mission 으로 수행·마감.}"
DRY_RUN="${DRY_RUN:-0}"

OWNER=likelion-khu-official
REPO="$OWNER/website"
PROJ_NUM=1
PROJ_ID=PVT_kwDOEZZ_V84BbPtZ
F_STATUS=PVTSSF_lADOEZZ_V84BbPtZzhWBlCY
OPT_DONE=98236657   # Todo=f75ad846 · In Progress=47fc9ee4 · Done=98236657

if [[ "$DRY_RUN" == "1" ]]; then
  echo "gh project item-edit --project-id $PROJ_ID --id <ITEM_ID(issue #$ISSUE)> --field-id $F_STATUS --single-select-option-id $OPT_DONE"
  echo "gh issue close $ISSUE --repo $REPO --comment \"$COMMENT\""
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
")
[[ -n "$PAT" ]] || { echo "BAD_IDENTITY: pat 비어 있음."; exit 11; }
export GH_HOST=github.com GH_TOKEN="$PAT"

# 보드 조회 — gh 실패(인증·스코프)와 "이슈가 보드에 없음"을 분리한다.
ITEMS_JSON=$(gh project item-list "$PROJ_NUM" --owner "$OWNER" --limit 200 --format json 2>/dev/null) || {
  echo "BOARD_ACCESS_FAIL: 보드 접근 실패 — 토큰에 project 권한이 있는지 확인하세요(스코프 부족일 확률이 큽니다)."; exit 4; }
ITEM=$(printf '%s' "$ITEMS_JSON" \
  | python3 -c "import json,sys; print(next(i['id'] for i in json.load(sys.stdin)['items'] if i.get('content',{}).get('number')==$ISSUE))" 2>/dev/null) || {
  echo "NOT_ON_BOARD: #$ISSUE 카드가 보드에서 안 보입니다 — PM에게 알려주세요."; exit 3; }

gh project item-edit --project-id "$PROJ_ID" --id "$ITEM" \
  --field-id "$F_STATUS" --single-select-option-id "$OPT_DONE" >/dev/null
gh issue close "$ISSUE" --repo "$REPO" --comment "$COMMENT" >/dev/null

echo "#$ISSUE → Done + closed ✓"

#!/usr/bin/env bash
# claim-mission — 미션 착수. 보드 카드를 Todo → In Progress 로 한 칸 옮긴다.
#
# 왜: 팀원이 미션에 손대는 순간 보드가 그 사실을 반영해야 PM·동료가 현황을 본다.
#     원칙상 카드 이동은 PM 몫이지만, claim-mission 에서는 "착수" 한 칸(Todo→In Progress)만
#     팀원이 스스로 옮긴다. Done(완료) 이동은 여전히 PM(IQ 게이트 승인) 몫이다.
#
# 인증은 /.identity.local.yml 의 PAT(scope: repo+project). 절대 PAT를 출력하지 않는다.
# DRY_RUN=1 이면 실제로 옮기지 않고 실행할 뮤테이션 명령만 echo (자가 점검용, 인증 불필요).
#
# 사용:  scripts/start-mission.sh <issue#>
#        DRY_RUN=1 scripts/start-mission.sh <issue#>
set -euo pipefail

ISSUE="${1:?issue number}"
DRY_RUN="${DRY_RUN:-0}"

OWNER=likelion-khu-official
PROJ_NUM=1
PROJ_ID=PVT_kwDOEZZ_V84BbPtZ
F_STATUS=PVTSSF_lADOEZZ_V84BbPtZzhWBlCY
OPT_INPROGRESS=47fc9ee4   # Todo=f75ad846 · In Progress=47fc9ee4 · Done=98236657

# 자가 점검: 인증·조회 없이 뮤테이션 명령 형태만 보여준다.
if [[ "$DRY_RUN" == "1" ]]; then
  echo "gh project item-edit --project-id $PROJ_ID --id <ITEM_ID(issue #$ISSUE)> --field-id $F_STATUS --single-select-option-id $OPT_INPROGRESS"
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "NOT_A_REPO: git 저장소 안에서 실행하세요."; exit 2; }
ID_FILE="$REPO_ROOT/.identity.local.yml"
[[ -f "$ID_FILE" ]] || { echo "NO_IDENTITY: 신원 파일이 없습니다 — 먼저 check-identity.sh."; exit 10; }

PAT=$(python3 -c "
import sys
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
  --field-id "$F_STATUS" --single-select-option-id "$OPT_INPROGRESS" >/dev/null

echo "#$ISSUE → In Progress ✓"

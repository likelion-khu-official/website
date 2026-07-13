#!/usr/bin/env bash
# 미션 이슈의 GitHub Projects 필드(Team·시작일·목표일)를 세팅한다.
#
# 왜: `gh issue create`는 라벨·어사인만 넣고 Projects v2 커스텀 필드(Team·시작일·목표일)는
#     안 건드린다. 이슈는 보드에 자동 추가되고 Status=Todo까지 되지만 나머지는 빈 채로 남는다.
#     → 미션 이슈를 발주(gh issue create)한 직후 반드시 이 스크립트를 돌려 필드를 채운다.
#
# 사용:
#   GH_HOST=github.com GH_TOKEN=<token> pm/scripts/mission-fields.sh \
#       <issue#> <디자인|프론트|백엔드|인프라> <시작 YYYY-MM-DD> <목표 YYYY-MM-DD>
#
# 예: ... mission-fields.sh 78 프론트 2026-07-05 2026-07-12
set -euo pipefail

ISSUE="${1:?issue number}"
TEAM="${2:?team (디자인|프론트|백엔드|인프라)}"
START="${3:?start date YYYY-MM-DD}"
TARGET="${4:?target date YYYY-MM-DD}"

OWNER=likelion-khu-official
PROJ_NUM=1
PROJ_ID=PVT_kwDOEZZ_V84BbPtZ
F_TEAM=PVTSSF_lADOEZZ_V84BbPtZzhWBlF8
F_START=PVTF_lADOEZZ_V84BbPtZzhWBlF0
F_TARGET=PVTF_lADOEZZ_V84BbPtZzhWBlF4

case "$TEAM" in
  디자인) OPT=2171eaba;;
  프론트) OPT=a2398a16;;
  백엔드) OPT=c2387007;;
  인프라) OPT=7d9a54b6;;
  *) echo "알 수 없는 팀: $TEAM (디자인|프론트|백엔드|인프라)"; exit 1;;
esac

# 이슈 번호 → 프로젝트 아이템 id (이슈는 보드에 자동 추가됨)
ITEM=$(gh project item-list "$PROJ_NUM" --owner "$OWNER" --limit 200 --format json \
  | python3 -c "import json,sys; print(next(i['id'] for i in json.load(sys.stdin)['items'] if i.get('content',{}).get('number')==$ISSUE))")

gh project item-edit --project-id "$PROJ_ID" --id "$ITEM" --field-id "$F_TEAM"   --single-select-option-id "$OPT" >/dev/null
gh project item-edit --project-id "$PROJ_ID" --id "$ITEM" --field-id "$F_START"  --date "$START"  >/dev/null
gh project item-edit --project-id "$PROJ_ID" --id "$ITEM" --field-id "$F_TARGET" --date "$TARGET" >/dev/null
echo "#$ISSUE → Team=$TEAM · 시작 $START · 목표 $TARGET ✓"

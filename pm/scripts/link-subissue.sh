#!/usr/bin/env bash
# 미션 이슈를 상위 Epic 이슈의 sub-issue로 건다 (GitHub 네이티브 sub-issue).
#
# 왜: gh CLI엔 아직 sub-issue 전용 명령이 없어 raw GraphQL(addSubIssue)로 처리한다.
#     mission-fields.sh가 Projects v2 커스텀 필드를 raw GraphQL로 패치하는 것과 같은 방식이다.
#     이렇게 걸어야 Epic의 진행률이 하위 미션 상태로 자동 롤업되고, 미션이 현황(보드/Epic)에 잡힌다.
#
# 멱등·안전: 같은 부모로 이미 걸려 있으면 알리고 끝. 다른 부모가 있으면(자식당 부모 1개 제약)
#            건드리지 않고 스킵. 대상이 이슈가 아니면(PR 번호 등) 스킵. 여러 번 돌려도 안전하다.
#
# 사용:  pm/scripts/link-subissue.sh <parent(Epic)#> <child(미션)#>
# 인증:  gh 로그인(repo 스코프면 충분 — sub-issue는 project 스코프 불필요).
set -uo pipefail

REPO_OWNER=likelion-khu-official
REPO_NAME=website
PARENT="${1:?parent(Epic) issue number}"
CHILD="${2:?child(mission) issue number}"

# 이슈의 node id + 현재 부모 번호를 한 번에 (PR/없는 번호면 issue=null). python3로 견고 파싱.
issue_info() {  # $1=번호 → "  <id>\t<parentnum>" (이슈 아니면 빈 줄)
  gh api graphql -H "GraphQL-Features: sub_issues" -f query='
    query($o:String!,$n:String!,$num:Int!){
      repository(owner:$o,name:$n){ issue(number:$num){ id parent{ number } } }
    }' -F o="$REPO_OWNER" -F n="$REPO_NAME" -F num="$1" 2>/dev/null \
  | python3 -c 'import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit()
i=((d.get("data") or {}).get("repository") or {}).get("issue")
if not i: sys.exit()
p=i.get("parent") or {}
print(i["id"], p.get("number",""), sep="\t")'
}

read -r CID CURPARENT < <(issue_info "$CHILD") || true
[ -z "${CID:-}" ] && { echo "skip #$CHILD: 이슈 아님(PR 번호이거나 없음)"; exit 0; }

if [ -n "${CURPARENT:-}" ]; then
  if [ "$CURPARENT" = "$PARENT" ]; then echo "already linked #$CHILD → parent #$PARENT"
  else echo "skip #$CHILD: 이미 다른 부모 #$CURPARENT (원한 부모 #$PARENT)"; fi
  exit 0
fi

read -r PID _ < <(issue_info "$PARENT") || true
[ -z "${PID:-}" ] && { echo "ERROR: parent #$PARENT 이슈를 못 찾음"; exit 1; }

# GraphQL-Features 헤더가 없으면 addSubIssue 필드가 안 보여 404가 난다 — 필수.
gh api graphql -H "GraphQL-Features: sub_issues" -f query='
  mutation($p:ID!,$c:ID!){
    addSubIssue(input:{issueId:$p, subIssueId:$c}){
      issue{ number } subIssue{ number }
    }
  }' -F p="$PID" -F c="$CID" \
  --jq '.data.addSubIssue | "linked #\(.subIssue.number) → parent #\(.issue.number)"'

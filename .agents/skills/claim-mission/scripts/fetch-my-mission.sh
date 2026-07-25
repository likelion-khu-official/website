#!/usr/bin/env bash
# claim-mission — 내게 배정된 미션을 가져온다.
#
# 왜: 라우팅은 GitHub assignee로 한다. PM이 미션을 발주하며 나를 assignee로 꽂으면,
#     "open + label:roadmap + assignee:<나>" 가 곧 내 미션 큐다. 이 스크립트는 그 큐를
#     JSON으로 낸다. 0개/1개/N개 분기는 호출측(SKILL)이 count 로 판단한다.
#
# 인증·handle 은 /.identity.local.yml 에서 파생(check-identity.sh 가 먼저 통과했다고 가정).
# 절대: PAT 값을 출력하지 않는다.
#
# 사용:  scripts/fetch-my-mission.sh
# 출력:  첫 줄 `count=<N>` + 이어서 이슈 배열 JSON(number,title,url,labels,body).
set -euo pipefail

REPO="likelion-khu-official/website"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "NOT_A_REPO: git 저장소 안에서 실행하세요."; exit 2; }
ID_FILE="$REPO_ROOT/.identity.local.yml"
[[ -f "$ID_FILE" ]] || { echo "NO_IDENTITY: 신원 파일이 없습니다 — 먼저 check-identity.sh."; exit 10; }

read_key() { python3 -c "
import sys
d={}
for line in open('$ID_FILE'):
    line=line.rstrip('\n')
    if ':' not in line: continue
    k,v=line.split(':',1)
    d[k.strip()]=v.strip().strip('\"').strip(\"'\")
print(d.get('$1',''))
"; }

HANDLE=$(read_key github_handle)
PAT=$(read_key pat)
[[ -n "$HANDLE" && -n "$PAT" ]] || { echo "BAD_IDENTITY: github_handle/pat 비어 있음."; exit 11; }

export GH_HOST=github.com GH_TOKEN="$PAT"

JSON=$(gh issue list --repo "$REPO" \
  --state open --label roadmap --assignee "$HANDLE" \
  --json number,title,url,labels,body --limit 50)

COUNT=$(printf '%s' "$JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
echo "count=$COUNT"
printf '%s\n' "$JSON"

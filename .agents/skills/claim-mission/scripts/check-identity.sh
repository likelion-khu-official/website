#!/usr/bin/env bash
# claim-mission Step 0 — 신원 확인.
#
# 왜: 팀원이 미션을 받으려면 (1) 자기가 누구인지(GitHub handle)와 (2) 그 계정으로
#     레포·보드를 만질 PAT가 로컬에 있어야 한다. 이 스크립트는 레포 루트의
#     /.identity.local.yml 을 읽어 PAT가 유효하고 그 소유자가 파일의 handle과
#     같은지 확인한다. 여기서 막히면 SKILL이 Step 0 인터뷰로 안내한다.
#
# 절대: PAT 값을 stdout/stderr/로그 어디에도 출력하지 않는다.
#
# 사용:  scripts/check-identity.sh
# 출력:  OK: <login>              (성공, exit 0)
#        NO_IDENTITY: …           (파일 없음, exit 10 → 인터뷰로)
#        BAD_IDENTITY: …          (키 누락,  exit 11)
#        PAT_INVALID: …           (인증 실패, exit 12)
#        HANDLE_MISMATCH: …       (소유자 불일치, exit 13)
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "NOT_A_REPO: git 저장소 안에서 실행하세요."; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "NO_PYTHON3: python3 가 필요합니다(신원 파일 파싱). 설치 후 다시 실행하세요."; exit 2; }
command -v gh >/dev/null 2>&1 || { echo "NO_GH: GitHub CLI(gh) 가 필요합니다. 설치 후 다시 실행하세요."; exit 2; }
ID_FILE="$REPO_ROOT/.identity.local.yml"

if [[ ! -f "$ID_FILE" ]]; then
  echo "NO_IDENTITY: 신원 파일이 아직 없습니다 ($ID_FILE)."
  exit 10
fi

# 최소 YAML 파서 (PyYAML 의존 없이 'key: value' 두 줄만). PAT는 stdout에 안 나가게 개별 추출.
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

if [[ -z "$HANDLE" || -z "$PAT" ]]; then
  echo "BAD_IDENTITY: $ID_FILE 에 github_handle 또는 pat 키가 비어 있습니다."
  exit 11
fi

export GH_HOST=github.com GH_TOKEN="$PAT"
LOGIN=$(gh api user --jq .login 2>/dev/null) || {
  echo "PAT_INVALID: GitHub 인증 실패 — PAT가 만료됐거나 스코프(repo+project)가 부족합니다."
  exit 12; }

if [[ "$LOGIN" != "$HANDLE" ]]; then
  echo "HANDLE_MISMATCH: 파일의 github_handle($HANDLE)과 PAT 소유자($LOGIN)가 다릅니다."
  exit 13
fi

# classic 토큰이면 project 스코프를 미리 확인해 늦은 실패(Step 2·4)를 앞당겨 경고한다.
# (fine-grained 토큰은 스코프 헤더가 비어 와서 판정 불가 → 경고 안 함.)
SCOPES=$(gh api -i user 2>/dev/null | tr -d '\r' | sed -n 's/^X-Oauth-Scopes: //p' | head -1 || true)
if [[ -n "$SCOPES" ]] && ! printf '%s' "$SCOPES" | grep -q 'project'; then
  echo "WARN_SCOPE: 이 토큰에 project 스코프가 안 보입니다 — 보드 착수/마감(Step 2·4)이 막힐 수 있어요. 막히면 토큰에 project 권한을 더하세요." >&2
fi

echo "OK: $LOGIN"

#!/usr/bin/env bash
# claim-mission Step 0-a — 로컬 머신에 이미 있는 GitHub 토큰을 찾아 신원 파일을 자동 생성.
#
# 왜: 팀원에게 "PAT를 새로 만드세요"라고 하기 전에, 이 머신에 이미 쓸 수 있는 토큰이
#     있으면 그걸 재사용한다(gh 로그인 토큰·환경변수·keychain·*.local 파일 등).
#     초보의 마찰을 없앤다 — 대부분 gh 로그인이 이미 돼 있다.
#
# 절대: 토큰 값을 stdout/stderr/로그 어디에도 출력하지 않는다. 값은 배열/변수에만 담는다.
#
# 사용:  scripts/discover-token.sh
# 출력:  FOUND:<login>                      (유효 토큰 찾아 신원 파일 작성, exit 0)
#        FOUND:<login>:MISSING_PROJECT_SCOPE (찾았으나 보드 쓰기 권한이 안 보임)
#        NONE                                (쓸 토큰 없음 → SKILL이 PAT 생성 인터뷰로)
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "NONE"; exit 0; }
ID_FILE="$REPO_ROOT/.identity.local.yml"

# --- 후보 토큰 수집 (값은 절대 출력하지 않는다) ---
cands=()
[[ -n "${GH_TOKEN:-}" ]]     && cands+=("$GH_TOKEN")
[[ -n "${GITHUB_TOKEN:-}" ]] && cands+=("$GITHUB_TOKEN")

# gh 가 저장한 로그인 토큰
t=$(gh auth token -h github.com 2>/dev/null || true)
[[ -n "$t" ]] && cands+=("$t")

# 흔한 파일에서 토큰 패턴 추출
for f in "$HOME/.config/gh/hosts.yml" "$HOME/.netrc" \
         "$REPO_ROOT"/*.local "$REPO_ROOT"/*.local.yml "$REPO_ROOT"/pm/*.local; do
  [[ -f "$f" ]] || continue
  while IFS= read -r m; do
    [[ -n "$m" ]] && cands+=("$m")
  done < <(grep -oE 'gh[po]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,}' "$f" 2>/dev/null || true)
done

# macOS keychain 등 git credential 저장소
if command -v git >/dev/null 2>&1; then
  p=$(printf 'protocol=https\nhost=github.com\n\n' \
        | git credential fill 2>/dev/null | sed -n 's/^password=//p' | head -1 || true)
  [[ -n "$p" ]] && cands+=("$p")
fi

# 후보가 하나도 없으면 종료 (bash 3.2에서 빈 배열 확장 방지)
if [[ ${#cands[@]} -eq 0 ]]; then echo "NONE"; exit 0; fi

# --- 각 후보를 github.com 에 검증. 첫 유효 토큰을 신원으로 저장 ---
for tok in "${cands[@]}"; do
  [[ -n "$tok" ]] || continue
  login=$(GH_HOST=github.com GH_TOKEN="$tok" gh api user --jq .login 2>/dev/null || true)
  [[ -n "$login" ]] || continue

  # 스코프 확인(classic 토큰만 헤더로 노출; fine-grained 는 빈 값 → 경고만)
  scopes=$(GH_HOST=github.com GH_TOKEN="$tok" gh api -i user 2>/dev/null \
             | tr -d '\r' | sed -n 's/^X-Oauth-Scopes: //p' | head -1 || true)

  umask 077
  printf 'github_handle: %s\npat: %s\n' "$login" "$tok" > "$ID_FILE"

  if printf '%s' "$scopes" | grep -q 'project'; then
    echo "FOUND:$login"
  else
    echo "FOUND:$login:MISSING_PROJECT_SCOPE"
  fi
  exit 0
done

echo "NONE"

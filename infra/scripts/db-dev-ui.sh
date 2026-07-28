#!/usr/bin/env bash
# 백엔드 개발자 로컬에서 실행하는 DB 개발 세션 런처.
#
# "조회"(sqlite-web GUI, read-only)와 "조작"(dbclient SQL CLI)을 한 화면에 모은다 —
# 서버 쪽 권한 모델은 안 건드리고 화면 배치만 tmux로 합친다. 두 세션은 서로 독립된
# SSH 인증(각각 dbtunnel 키 / dbclient 키)이라 한쪽이 다른 쪽을 거치거나 막지 않는다.
#
# 사용법: infra/db-dev-ui.sh stage|prod
#   환경변수 LIKELION_DB_HOST로 접속 호스트 override 가능(기본: likelion-oci,
#   로컬 ~/.ssh/config에 등록된 별칭을 사용).
#
# 아키텍처:
#
#   개발자 로컬 — tmux 한 창(분할 pane)
#   ┌─────────────────────────┬──────────────────────────┐
#   │ pane 1: 조회 (브라우저)    │ pane 2: 조작 (CLI)          │
#   │ ssh -N -L <port>:        │ ssh dbclient@host <env>    │
#   │   127.0.0.1:<port>       │   (forced command →        │
#   │   dbtunnel@host          │    dbclient-sqlite-guard.sh)│
#   │ → localhost:<port> 오픈  │                             │
#   └────────────┬──────────────┴──────────────┬─────────────┘
#                │                              │
#                ▼                              ▼
#   ┌──────────────────────────────────────────────────────┐
#   │ OCI 서버                                                │
#   │                                                          │
#   │  dbtunnel 계정 (신규)            dbclient 계정 (기존)     │
#   │  ├ 셸 없음(nologin)              ├ forced command       │
#   │  ├ permitopen=                   │   → guard.sh          │
#   │  │   127.0.0.1:8090/8091         └ DML만 허용, DDL 차단   │
#   │  └ 그 외 포워딩·셸 전부 불가                                │
#   │         │                                                │
#   │         ▼                                                │
#   │  sqlite-web-stage :8090 (127.0.0.1 바인딩, -r read-only)  │
#   │  sqlite-web-prod  :8091 (127.0.0.1 바인딩, -r read-only)  │
#   │         │  volume :ro 마운트(이중 방어 — 앱 플래그+OS 권한)  │
#   │         ▼                                                │
#   │    stage.db / prod.db  (dbclient가 조작하는 파일과 동일)    │
#   └──────────────────────────────────────────────────────┘
#
#   공인 노출 변화 없음 — 22/80/443만 열려 있고, 8090/8091은 127.0.0.1
#   바인딩이라 서버 밖에서 직접 접근 불가(SSH 터널로만 닿음).
#
# 왜 tmux로 "합치기"인가: sqlite-web 자체에 SQL 실행창을 추가로 열어 dbclient를
# 대체하는 방식도 가능하지만, 그러려면 서드파티 웹앱(sqlite-web)을 포크해서
# dbclient-sqlite-guard.sh와 같은 DDL 차단 로직을 또 심어야 한다 — 차단 로직이
# 두 군데(bash wrapper + 포크한 Python)에 중복되면 한쪽만 고치고 한쪽을 놓치는
# 사고가 나기 쉽다. tmux는 화면만 합치고 권한 로직은 각자 그대로 둬서 이 위험이 없다.
set -euo pipefail

ENV_NAME="${1:-}"
HOST="${LIKELION_DB_HOST:-likelion-oci}"

case "$ENV_NAME" in
    stage) UI_PORT=8090 ;;
    prod)  UI_PORT=8091 ;;
    *)
        echo "사용법: $0 stage|prod" >&2
        exit 1
        ;;
esac

TUNNEL_CMD="ssh -N -L ${UI_PORT}:127.0.0.1:${UI_PORT} dbtunnel@${HOST}"
CLI_CMD="ssh dbclient@${HOST} ${ENV_NAME}"
URL="http://127.0.0.1:${UI_PORT}"

open_browser() {
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    elif command -v cmd.exe >/dev/null 2>&1; then
        cmd.exe /c start "$URL" >/dev/null 2>&1 || true
    fi
}

if command -v tmux >/dev/null 2>&1; then
    SESSION="db-dev-${ENV_NAME}"
    tmux kill-session -t "$SESSION" 2>/dev/null || true
    tmux new-session -d -s "$SESSION" -n db "$TUNNEL_CMD"
    tmux split-window -h -t "${SESSION}:db" "$CLI_CMD"
    tmux select-pane -t "${SESSION}:db.1"
    ( sleep 2; open_browser ) &
    echo "tmux 세션 '${SESSION}' — 왼쪽: sqlite-web 터널(${URL}), 오른쪽: dbclient SQL 세션"
    tmux attach -t "$SESSION"
elif command -v wt.exe >/dev/null 2>&1; then
    wt.exe -w 0 new-tab bash -lc "$TUNNEL_CMD" \; split-pane bash -lc "$CLI_CMD"
    ( sleep 2; open_browser ) &
    echo "Windows Terminal 새 탭 — 왼쪽: sqlite-web 터널(${URL}), 오른쪽: dbclient SQL 세션"
else
    cat <<MSG
tmux도 Windows Terminal(wt.exe)도 없어서 자동으로 화면을 못 나눕니다.
아래 두 명령을 각각 다른 터미널 창에서 실행하세요:

  [조회 - 브라우저 UI]
  ${TUNNEL_CMD}
  (터널 연결 후 브라우저에서 ${URL} 접속)

  [조작 - SQL CLI]
  ${CLI_CMD}
MSG
fi

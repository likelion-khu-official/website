#!/usr/bin/env bash
# dbclient 계정의 SSH forced command로 쓰는 sqlite3 래퍼.
#
# bare `sqlite3 <db>`를 forced command로 쓰면 안 되는 이유: sqlite3 CLI가 stdin으로
# `.shell`/`.system` 같은 dot-command를 받으면 그 즉시 임의 OS 명령을 실행한다.
# authorized_keys의 no-pty는 pty 할당만 막을 뿐 이 입력 자체를 막지 못해서,
# forced command가 sqlite3 그대로면 dbclient 키를 가진 사람이 셸을 얻을 수 있다
# (pm/docs/learnings.md 참고). 이 스크립트는 stdin을 한 줄씩 검사해서
# dot-command·ATTACH DATABASE·스키마 변경(ALTER/CREATE/DROP)을 걸러낸 뒤에만
# sqlite3로 넘긴다. 스키마 변경은 db-access.md의 Flyway 기준상 SSH 직접 실행 자체가
# 금지 정책이었는데(마이그레이션 이력에 안 잡히는 숨은 변경이 생김), 여기서 기술적으로도
# 강제한다 — 정식 스키마 변경 경로는 이 계정이 아니라 마이그레이션 파일 + PR이다.
#
# 알려진 한계: 세미콜론 분리는 단순 split이라 문자열 리터럴 안의 세미콜론(예:
# INSERT INTO t VALUES ('a;b'))은 문 경계로 오인될 수 있다. 이 스크립트는 SQL 파서가
# 아니라 dbclient 계정(신뢰된 팀원)을 위한 가드레일이라 이 정도 한계는 감수한다.
#
# stage/prod 선택: 같은 공개키를 authorized_keys에 두 줄(각각 command="...stage.db",
# command="...prod.db")로 등록해서 stage+prod를 동시에 주려던 이전 설계는 실제로 동작하지
# 않는다 — OpenSSH는 같은 공개키가 여러 줄이면 처음 매치된 한 줄만 적용하고 나머지는
# 무시한다(2026-07-04 실측 확인, pm/docs/learnings.md 참고). 그래서 이 스크립트는 인자로
# db를 고정하는 대신(고정하고 싶으면 여전히 가능 — 아래 참고), 기본은 SSH_ORIGINAL_COMMAND
# (클라이언트가 `ssh dbclient@host stage` 처럼 요청한 값)로 stage/prod를 그때그때 고른다.
# 한 줄로 stage+prod 둘 다 접근 가능.
#
# 특정 사람을 stage 전용으로 못박고 싶으면: command=".../dbclient-sqlite-guard.sh stage"
# 처럼 인자를 명시하면 SSH_ORIGINAL_COMMAND와 무관하게 그 값으로 고정된다.
set -euo pipefail

DATA_DIR="/home/ubuntu/website/infra/data"
ENV_NAME="${1:-${SSH_ORIGINAL_COMMAND:-}}"

case "$ENV_NAME" in
    stage) DB_FILE="$DATA_DIR/stage.db" ;;
    prod)  DB_FILE="$DATA_DIR/prod.db" ;;
    *)
        echo "사용법: ssh dbclient@호스트 stage   또는   ssh dbclient@호스트 prod" >&2
        exit 1
        ;;
esac

is_blocked_statement() {
    local stmt="$1"
    if [[ "$stmt" =~ ^[Aa][Tt][Tt][Aa][Cc][Hh][[:space:]] ]]; then
        echo "ATTACH DATABASE는 허용되지 않습니다"
        return 0
    fi
    if [[ "$stmt" =~ ^([Aa][Ll][Tt][Ee][Rr]|[Cc][Rr][Ee][Aa][Tt][Ee]|[Dd][Rr][Oo][Pp])[[:space:]] ]]; then
        echo "스키마 변경(ALTER/CREATE/DROP)은 여기서 금지 — 마이그레이션 파일 + PR로"
        return 0
    fi
    return 1
}

filter() {
    local line trimmed stmt reason blocked
    while IFS= read -r line || [ -n "$line" ]; do
        trimmed="${line#"${line%%[![:space:]]*}"}"
        if [[ "$trimmed" == .* ]]; then
            echo "차단됨: dot-command는 허용되지 않습니다 (${trimmed})" >&2
            continue
        fi

        blocked=0
        IFS=';' read -ra statements <<< "$trimmed"
        for stmt in "${statements[@]}"; do
            stmt="${stmt#"${stmt%%[![:space:]]*}"}"
            [ -z "$stmt" ] && continue
            if reason="$(is_blocked_statement "$stmt")"; then
                echo "차단됨: ${reason} (${stmt})" >&2
                blocked=1
                break
            fi
        done
        [ "$blocked" -eq 1 ] && continue

        printf '%s\n' "$line"
    done
}

filter | sqlite3 -batch "$DB_FILE"

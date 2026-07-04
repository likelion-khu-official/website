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
set -euo pipefail

DB_FILE="${1:?사용법: dbclient-sqlite-guard.sh <db경로>}"

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

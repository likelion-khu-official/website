#!/usr/bin/env bash
# dbclient 계정의 SSH forced command로 쓰는 sqlite3 래퍼.
#
# bare `sqlite3 <db>`를 forced command로 쓰면 안 되는 이유: sqlite3 CLI가 stdin으로
# `.shell`/`.system` 같은 dot-command를 받으면 그 즉시 임의 OS 명령을 실행한다.
# authorized_keys의 no-pty는 pty 할당만 막을 뿐 이 입력 자체를 막지 못해서,
# forced command가 sqlite3 그대로면 dbclient 키를 가진 사람이 셸을 얻을 수 있다
# (pm/docs/learnings.md 참고). 이 스크립트는 stdin을 한 줄씩 검사해서
# dot-command와 ATTACH DATABASE를 걸러낸 뒤에만 sqlite3로 넘긴다.
set -euo pipefail

DB_FILE="${1:?사용법: dbclient-sqlite-guard.sh <db경로>}"

filter() {
    local line trimmed
    while IFS= read -r line || [ -n "$line" ]; do
        trimmed="${line#"${line%%[![:space:]]*}"}"
        if [[ "$trimmed" == .* ]]; then
            echo "차단됨: dot-command는 허용되지 않습니다 (${trimmed})" >&2
            continue
        fi
        if [[ "$trimmed" =~ ^[Aa][Tt][Tt][Aa][Cc][Hh][[:space:]] ]]; then
            echo "차단됨: ATTACH DATABASE는 허용되지 않습니다" >&2
            continue
        fi
        printf '%s\n' "$line"
    done
}

filter | sqlite3 -batch "$DB_FILE"

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
#
# 감사로그(2026-08-06 추가): "누가/언제/무슨 SQL"을 AUDIT_LOG에 남긴다. dbclient는
# 등록된 팀원 전원이 같은 시스템 계정으로 붙기 때문에(같은 forced command), "누가"를
# 구분하려면 실제 인증에 쓰인 SSH 공개키의 fingerprint가 필요하다 — sshd_config에
# `ExposeAuthInfo yes`가 켜져 있으면 세션 환경변수 SSH_USER_AUTH가 그 정보를 담은
# 임시파일 경로를 가리킨다(OpenSSH 8.5+, 파일 내용은 "publickey <fingerprint>" 형식).
# 그 fingerprint를 authorized_keys의 각 줄과 대조해서(줄 끝 주석이 이름) 이름으로 옮긴다.
# **서버에 아직 반영 안 된 전제조건 — 인프라 오너가 서버에서 직접:**
#   1. sshd_config에 `ExposeAuthInfo yes` 추가 후 `sudo systemctl reload sshd`
#      (전역이든 `Match User dbclient,ubuntu`로 좁히든 — 좁히면 다른 계정 세션엔 영향 없음)
#   2. `sudo mkdir -p /home/ubuntu/website/infra/logs/audit && sudo chgrp dbaccess ... && sudo chmod 2770 ...`
#      (setgid — dbclient가 속한 dbaccess 그룹만 쓰기 가능, other는 접근 불가)
# 이 두 가지가 안 돼 있으면 SSH_USER_AUTH가 비어 있어 actor가 "unknown"으로만 기록된다
# (로그 자체는 계속 남으므로 SQL 내용 추적은 가능, "누가"만 못 채움 — fail-open이 아니라
# fail-visible: 걸러야 할 SQL은 그대로 걸러지고, 감사로그가 비었다는 사실 자체가 남는다).
set -euo pipefail

DATA_DIR="/home/ubuntu/website/infra/data"
AUDIT_LOG="/home/ubuntu/website/infra/logs/audit/dbclient.log"
AUTHORIZED_KEYS="/home/dbclient/.ssh/authorized_keys"
ENV_NAME="${1:-${SSH_ORIGINAL_COMMAND:-}}"

case "$ENV_NAME" in
    stage) DB_FILE="$DATA_DIR/stage.db" ;;
    prod)  DB_FILE="$DATA_DIR/prod.db" ;;
    *)
        echo "사용법: ssh dbclient@호스트 stage   또는   ssh dbclient@호스트 prod" >&2
        exit 1
        ;;
esac

# ExposeAuthInfo가 켜져 있으면 SSH_USER_AUTH 파일에 인증에 쓴 키가 "publickey <알고리즘>
# <base64 키 원문>" 형태로 그대로 적힌다(SHA256 지문이 아니라 키 자체 — 2026-08-06
# 라이브 dbclient 세션으로 두 번 실측하며 확인. 1차 시도는 이 값을 지문으로 잘못 알고
# ssh-keygen으로 계산한 지문과 비교했는데 그 방식 자체가 틀렸었다). 그래서 지문 계산 없이
# authorized_keys의 "알고리즘 + base64" 부분과 문자열 그대로 비교한다.
resolve_actor() {
    if [ -z "${SSH_USER_AUTH:-}" ] || [ ! -r "$SSH_USER_AUTH" ]; then
        echo "unknown(ExposeAuthInfo 미설정 또는 세션정보 없음)"
        return
    fi
    local used_key
    used_key="$(awk '$1=="publickey"{$1="";sub(/^ /,"");print;exit}' "$SSH_USER_AUTH")"
    if [ -z "$used_key" ]; then
        echo "unknown(publickey 인증정보 없음, 원본줄=$(head -c 200 "$SSH_USER_AUTH" 2>/dev/null))"
        return
    fi
    if [ ! -r "$AUTHORIZED_KEYS" ]; then
        echo "unknown(authorized_keys 못 읽음)"
        return
    fi

    local line key_part name
    while IFS= read -r line; do
        [[ -z "$line" || "$line" == \#* ]] && continue
        key_part="$(grep -oE 'ssh-[a-z0-9]+ [A-Za-z0-9+/=]+' <<< "$line" || true)"
        [ -z "$key_part" ] && continue
        name="$(awk '{print $NF}' <<< "$line")"
        if [ "$key_part" = "$used_key" ]; then
            echo "$name"
            return
        fi
    done < "$AUTHORIZED_KEYS"

    # 매칭 실패 시 원인 진단이 바로 되도록 실제 받은 값의 앞부분을 같이 남긴다(전체 키를
    # 다 남기면 로그가 너무 길어지니 앞 40자만 — 매칭 안 된 원인 파악에는 이 정도면 충분).
    echo "unknown(등록되지 않은 키, 받은값 앞부분=${used_key:0:40}...)"
}

ACTOR="$(resolve_actor)"

audit() {
    local verdict="$1" stmt="$2"
    # AUDIT_LOG 디렉터리가 아직 없거나(전제조건 미반영) 쓰기 권한이 없으면 감사로그만
    # 조용히 건너뛴다 — SQL 실행 자체를 막지는 않는다(가용성보다 감사가 우선순위는 아님,
    # 단 이 경우 위 주석대로 원인은 서버 설정 누락이라 인프라 오너가 바로 알 수 있다).
    printf '%s\t%s\t%s\t%s\t%s\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ENV_NAME" "$ACTOR" "$verdict" "$stmt" \
        >> "$AUDIT_LOG" 2>/dev/null || true
}

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
            audit "BLOCKED:dot-command" "$trimmed"
            continue
        fi

        blocked=0
        IFS=';' read -ra statements <<< "$trimmed"
        for stmt in "${statements[@]}"; do
            stmt="${stmt#"${stmt%%[![:space:]]*}"}"
            [ -z "$stmt" ] && continue
            if reason="$(is_blocked_statement "$stmt")"; then
                echo "차단됨: ${reason} (${stmt})" >&2
                audit "BLOCKED:${reason}" "$stmt"
                blocked=1
                break
            fi
        done
        [ "$blocked" -eq 1 ] && continue

        for stmt in "${statements[@]}"; do
            stmt="${stmt#"${stmt%%[![:space:]]*}"}"
            [ -z "$stmt" ] && continue
            audit "ALLOWED" "$stmt"
        done

        printf '%s\n' "$line"
    done
}

filter | sqlite3 -batch "$DB_FILE"

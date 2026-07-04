#!/usr/bin/env bash
# SQLite DB(prod/stage) 스냅샷을 떠서 likelion-backups(private) 버킷에 업로드한다.
# 실행 환경: OCI 서버, cron으로 매일 1회. 설계는 infra/db-access.md "백업 전략" 참고.
#
# 업로드는 aws-cli가 아니라 boto3(backup_upload.py)로 한다 — aws-cli v2(awscrt 서명기)가
# OCI S3 호환 엔드포인트에 대해 간헐적으로 SignatureDoesNotMatch를 내는 걸 실측으로 확인함
# (같은 자격증명·같은 명령이 방금 성공하고 바로 다음 호출에 실패). boto3(classic SigV4)는
# 반복 테스트에서 안정적이었다. pm/docs/learnings.md 참고.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 자격증명/엔드포인트 — .env.backup은 git에 안 올라감(.env.backup.example 참고)
set -a
source "$SCRIPT_DIR/.env.backup"
set +a

DATA_DIR="$SCRIPT_DIR/data"
LOCAL_BACKUP_DIR="$HOME/backups"
DATE="$(date +%F)"

mkdir -p "$LOCAL_BACKUP_DIR"

backup_one() {
    local db_name="$1"
    local db_file="$DATA_DIR/${db_name}.db"
    local snapshot="$LOCAL_BACKUP_DIR/${db_name}-${DATE}.db"

    if [ ! -f "$db_file" ]; then
        echo "skip: $db_file 없음"
        return 0
    fi

    # SQLite 내장 .backup — 쓰기 중에도 일관된 스냅샷을 뜬다(cp와 달리 안전)
    sqlite3 "$db_file" ".backup '$snapshot'"

    local check
    check="$(sqlite3 "$snapshot" 'PRAGMA integrity_check;')"
    if [ "$check" != "ok" ]; then
        echo "ERROR: $snapshot integrity_check 실패 - $check" >&2
        return 1
    fi

    python3 "$SCRIPT_DIR/backup_upload.py" put "${db_name}/${db_name}-${DATE}.db" "$snapshot"
    echo "uploaded: ${db_name}/${db_name}-${DATE}.db"
}

backup_one prod
backup_one stage

# 로컬 보관 3일 — 로컬은 "단일 노드 장애" 방어가 안 되므로 짧게만
find "$LOCAL_BACKUP_DIR" -name "*.db" -mtime +3 -delete

# 원격 보관 30일 — likelion-backups는 prod/stage 우선순위 구분 없이 동일 정책
python3 "$SCRIPT_DIR/backup_upload.py" rotate prod 30
python3 "$SCRIPT_DIR/backup_upload.py" rotate stage 30

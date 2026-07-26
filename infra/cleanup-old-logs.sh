#!/usr/bin/env bash
# 배포 태그별로 쌓이는 애플리케이션 로그 파일(infra/logs/{stage,prod}/*.log) 중
# 오래된 것을 지운다. 파일 내부 로테이션(logback max-history=14)은 각 파일 자체의
# 회전만 담당하고, 배포마다 새로 생기는 파일 자체는 안 지우므로 이 스크립트가 필요.
# 설계 배경: infra/logging.md "미결 사항" 참고.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETENTION_DAYS=30   # 백업 원격 보관 기간(backup-db.sh)과 동일하게 맞춤

for env_dir in "$SCRIPT_DIR/logs/stage" "$SCRIPT_DIR/logs/prod"; do
    if [ -d "$env_dir" ]; then
        find "$env_dir" -name "*.log*" -mtime "+${RETENTION_DAYS}" -print -delete
    fi
done

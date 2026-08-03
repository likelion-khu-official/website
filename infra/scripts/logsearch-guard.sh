#!/usr/bin/env bash
# logviewer 계정의 SSH forced command.
#
# 목적: 백엔드 개발자(신선우·안시현)가 서버 셸 없이도 X-Request-Id(website #404)로
# 자기 요청의 로그 줄만 정확히 찾아볼 수 있게 한다 — 지금은 이 계정 자체가 없어서
# 그 워크플로(logging.md "버그 리포트에 활용하기")를 실제로 못 쓰고 있었다.
#
# dbclient-sqlite-guard.sh와 같은 패턴(forced command + no-pty 등)이지만 대상이 다르다:
# 여기는 로그 파일(이미 world-readable, 644 — db-access.md의 dbaccess 그룹 같은 별도
# 권한 설정 불필요)만 읽고, sqlite3처럼 임의 명령을 실행할 수 있는 셸을 열어주는 도구가
# 아니라서 셸 탈출 위험 자체가 없다. 대신 검색어를 UUID 형식(requestId)으로만 제한해서,
# "로그 전체를 뒤지는 범용 grep 도구"가 되지 않게 좁혀뒀다 — 원래 목적(자기 요청 찾기)
# 밖으로 용도가 넓어지는 걸 막기 위함.
set -euo pipefail

LOG_DIR="/home/ubuntu/website/infra/logs"
ARGS="${SSH_ORIGINAL_COMMAND:-}"

# 사용법: ssh logviewer@호스트 "stage <requestId>"   또는   "prod <requestId>"
read -r ENV_NAME REQUEST_ID <<< "$ARGS"

case "$ENV_NAME" in
    stage|prod) ;;
    *)
        echo "사용법: ssh logviewer@호스트 \"stage <requestId>\"   또는   \"prod <requestId>\"" >&2
        exit 1
        ;;
esac

# UUID(RequestIdFilter가 발급하는 형식)만 허용 — 검색어를 자유 문자열로 열어두면
# 로그 전체를 훑는 범용 grep이 돼버려서, 의도한 용도(자기 요청 하나 찾기) 밖으로
# 나간다.
if [[ ! "$REQUEST_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    echo "requestId 형식이 올바르지 않습니다 (UUID만 허용, 예: 3f9a1c2e-...)" >&2
    exit 1
fi

shopt -s nullglob
LOG_FILES=("$LOG_DIR/$ENV_NAME"/*.log)
shopt -u nullglob
if [ ${#LOG_FILES[@]} -eq 0 ]; then
    echo "로그 파일을 찾을 수 없습니다 ($ENV_NAME)" >&2
    exit 1
fi

# 재배포로 파일이 나뉘어 있을 수 있어(logging.md 참고) 그 환경의 로그 파일 전부를 본다 —
# 가장 최근 파일 하나만 보면 며칠 전 요청은 놓친다.
grep -F -h "reqId=$REQUEST_ID" "${LOG_FILES[@]}" || {
    echo "일치하는 로그가 없습니다 — 로그 보관 기간(cleanup-old-logs.sh, 30일)이 지났거나 아직 없는 요청일 수 있습니다" >&2
    exit 1
}

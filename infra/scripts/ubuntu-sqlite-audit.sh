#!/usr/bin/env bash
# ubuntu 계정용 sqlite3 감사로그.
#
# dbclient(dbclient-sqlite-guard.sh)처럼 SSH forced command로 강제할 수 없다 — ubuntu는
# sudo가 있는 일반 셸 전체를 가진 인프라 오너 계정이라, 이 래퍼도 실제 바이너리를 직접
# 부르거나(`/usr/bin/sqlite3 ...`) `.bashrc`를 고치면 우회된다. 그래서 이건 기술적 강제가
# 아니라 "평소엔 이 경로로 쓰고 그 기록이 남는다"는 관례 + 가시성 도구다(인프라 접근이
# 장찬욱 한 명뿐이라는 전제 자체가 dbclient의 "여러 명 중 누구" 문제와 다르다 — 여기 목적은
# "누구"가 아니라 "언제 뭘 했는지"를 나중에(본인 회고·인수인계 시) 되짚을 수 있게 하는 것).
# 강제가 필요하면 auditd 파일감시를 병행할 것 — 커널 레벨이라 우회가 훨씬 어렵지만, 대신
# "누가 언제 그 파일을 열었다"까지만 남고 실행된 SQL 문 자체는 못 담는다(아래 참고).
#
# 설치(서버에서 인프라 오너가 직접, 1회 — .bashrc는 레포 밖 개인 설정이라 git으로 안 밀림):
#   echo 'source /home/ubuntu/website/infra/scripts/ubuntu-sqlite-audit.sh' >> ~/.bashrc
#   source ~/.bashrc
#
# 로그는 dbclient와 같은 디렉터리(infra/logs/audit/)에 남지만 파일은 분리한다(ubuntu.log) —
# dbclient 로그는 감사대상(팀원)이 forced command로만 쓰고 못 건드리는 파일이라 무결성이
# 있지만, ubuntu 세션이 같은 파일에 쓰면 그 무결성이 깨진다(ubuntu가 자기 로그도 자유롭게
# 지울 수 있는 계정이라 섞어봐야 의미가 없다 — 애초에 "강제"가 아니라 "가시성" 도구임을
# 위에서 밝힌 것과 같은 이유).
#
# auditd 파일감시(선택, 더 강한 보강 — 인프라 오너가 서버에서 직접 적용):
#   /etc/audit/rules.d/dbaccess.rules 에:
#     -w /home/ubuntu/website/infra/data/stage.db -p rwa -k dbaccess-stage
#     -w /home/ubuntu/website/infra/data/prod.db  -p rwa -k dbaccess-prod
#   적용: sudo augenrules --load && sudo systemctl restart auditd
#   조회: sudo ausearch -k dbaccess-prod -ts today
#   커널의 open/write syscall을 직접 잡으므로 이 래퍼를 안 거쳐도(바이너리 직접 호출,
#   다른 언어의 sqlite 드라이버 등) 파일이 건드려진 사실 자체는 빠짐없이 남는다 — 다만
#   "SQL 문 텍스트"는 안 남고 "이 파일이 이 시각에 read/write/attribute-change 됐다"만
#   남는다(syscall 인자엔 SQL이 없음). 텍스트까지 원하면 아래 script 기반 세션 기록이
#   유일한 방법이라 이 두 방식은 서로 대체가 아니라 보완 관계.
set -u

_UBUNTU_AUDIT_LOG="/home/ubuntu/website/infra/logs/audit/ubuntu.log"
_UBUNTU_AUDIT_DIR="/home/ubuntu/website/infra/logs/audit"
_UBUNTU_AUDIT_DB_DIR="/home/ubuntu/website/infra/data"

sqlite3() {
    local real_bin
    real_bin="$(command -v /usr/bin/sqlite3 2>/dev/null || command -v /usr/local/bin/sqlite3 2>/dev/null || true)"
    if [ -z "$real_bin" ]; then
        echo "sqlite3 바이너리를 찾을 수 없어요 (/usr/bin, /usr/local/bin 확인)" >&2
        return 127
    fi

    # stage.db/prod.db를 대상으로 하는 호출만 감싼다 — 그 외(임시 DB 등)는 그대로 통과.
    local target="" arg
    for arg in "$@"; do
        case "$arg" in
            "$_UBUNTU_AUDIT_DB_DIR"/stage.db) target="stage" ;;
            "$_UBUNTU_AUDIT_DB_DIR"/prod.db)  target="prod" ;;
        esac
    done

    if [ -z "$target" ]; then
        "$real_bin" "$@"
        return $?
    fi

    mkdir -p "$_UBUNTU_AUDIT_DIR" 2>/dev/null || true
    printf '%s\tSESSION_START\tubuntu\t%s\t%s\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$target" "$*" >> "$_UBUNTU_AUDIT_LOG" 2>/dev/null || true

    # 대화형으로 입력한 SQL 자체는 syscall에 안 남는다(파일 open/write 시점만 auditd가
    # 잡음) — script로 세션 전체(입력+출력)를 typescript 파일에 남겨야 실제로 뭘 쳤는지가
    # 기록에 남는다.
    local transcript
    transcript="${_UBUNTU_AUDIT_DIR}/ubuntu-session-$(date -u +%Y%m%dT%H%M%SZ)-$$.log"
    script -q -c "$real_bin $(printf '%q ' "$@")" "$transcript" 2>/dev/null
    local status=$?

    printf '%s\tSESSION_END\tubuntu\t%s\ttranscript=%s\texit=%s\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$target" "$transcript" "$status" >> "$_UBUNTU_AUDIT_LOG" 2>/dev/null || true
    return $status
}

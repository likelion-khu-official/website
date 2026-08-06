#!/bin/bash
# 헬스체크 실패 시 컨테이너 로그를 짧게 분류해서 "왜 실패했는지" 후보를 좁힌다(#457 후속 —
# 어드민 배포 이력 화면이 "빌드는 성공했으니 A거나 B일 수 있어요" 같은 일반론 대신, CD가 실제로
# 관찰한 신호를 근거로 한 문장을 보여주게 하기 위함).
#
# 사용법: docker compose logs --tail=200 <service> | classify-deploy-failure.sh [마지막 HTTP 상태]
# 출력: 매칭된 분류 문장 한 줄(stdout). 아무 것도 안 맞으면 빈 줄(안다고 지어내지 않는다).
#
# 원칙 — 원본 로그 줄은 절대 출력하지 않는다: 이 스크립트의 출력만 record-deploy-status가
# 읽어서 배포 이력(JSONL, 어드민 API로 노출)에 남긴다. 원본 컨테이너 로그엔 예외 스택트레이스
# 등 raw 정보가 있을 수 있어, CD 실행 로그(운영진만 보는 GitHub Actions)에는 그대로 남기되
# 어드민 화면에 영구 저장되는 값은 분류 라벨 하나로 좁힌다.
set -euo pipefail

LAST_STATUS="${1:-}"
LOG=$(cat)

# 우선순위: 더 구체적이고 바로 조치 가능한 원인부터 먼저 매칭한다.
if echo "$LOG" | grep -qi "Could not resolve placeholder"; then
  echo "필수 환경변수가 없어서 기동에 실패했어요 — 로그의 'Could not resolve placeholder' 뒤에 나오는 변수명을 .env에 채우세요."
elif echo "$LOG" | grep -qiE "FlywayException|Migration checksum mismatch|Detected failed migration"; then
  echo "Flyway 마이그레이션 실행 자체가 실패했어요 — 방금 배포된 마이그레이션 파일의 SQL을 확인하세요."
elif echo "$LOG" | grep -qiE "SQLITE_BUSY|database is locked|Unable to obtain connection"; then
  echo "DB 연결/잠금 문제로 기동이 안 됐어요 — 다른 프로세스가 DB 파일을 물고 있는지 확인하세요."
elif echo "$LOG" | grep -qiE "APPLICATION FAILED TO START|BeanCreationException"; then
  echo "스프링 컨텍스트 초기화(빈 생성)에 실패했어요 — 방금 배포된 코드의 설정/빈 정의를 확인하세요."
elif echo "$LOG" | grep -qiE "Address already in use|Port .* was already in use"; then
  echo "포트 충돌로 기동이 안 됐어요 — 이전 컨테이너가 완전히 안 내려갔을 수 있어요."
elif echo "$LOG" | grep -qiE "OutOfMemoryError|Cannot allocate memory"; then
  echo "메모리 부족(OOM)으로 죽었어요 — 서버 메모리 사용량을 확인하세요."
elif [ -z "$LAST_STATUS" ] || [ "$LAST_STATUS" = "000" ]; then
  echo "컨테이너가 아예 응답하지 않았어요(연결 자체가 안 됨) — 기동 자체가 실패했을 가능성이 커요, 로그 전체를 확인하세요."
elif [ "$LAST_STATUS" != "200" ]; then
  echo "앱은 떴지만 헬스 지표가 비정상이었어요(HTTP ${LAST_STATUS}) — DB 등 의존 컴포넌트 상태를 확인하세요."
else
  echo ""
fi

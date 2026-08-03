#!/usr/bin/env python3
"""최근 backend ERROR 로그 줄 수를 OCI Monitoring custom metric으로 전송.

website #313(운영 원인추적용 로깅) 도입 후 남은 문제 — 로그 파일에 에러가
남아도 사람이 능동적으로 열어봐야만 아는 상태였다. push-email-failure-metric.py와
같은 패턴(5분 윈도우, cron */5, instance principal 인증, custom_likelion
네임스페이스)으로 "쌓인다"에서 "쌓이면 알림이 온다"로 넘어간다.

email_log처럼 DB 테이블이 아니라 로그 파일을 직접 읽는다 - 로그 파일은 배포
태그별로 나뉘어 쌓이므로(infra/docs/logging.md) 재배포 직후엔 새 파일이 비어있는
채로 시작한다. 그래서 디렉터리 안에서 "가장 최근에 수정된 파일 하나"를 현재
활성 로그로 판단한다(다른 파일은 이전 배포 것 - 지금 컨테이너가 안 쓰므로 mtime이
갱신 안 됨).

시간 필터는 매 줄 앞의 Spring Boot 기본 타임스탬프(yyyy-MM-dd HH:mm:ss.SSS)를
그대로 파싱한다 - email_log의 sent_at 컬럼과 동일한 "최근 N분" 방식.

사용: push-error-log-metric.py <prod|stage>
"""
import glob
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

import oci

NAMESPACE = "custom_likelion"
WINDOW_MINUTES = 5  # cron 주기(*/5)와 일치

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"
_LOG_DIR_TEMPLATE = "/home/ubuntu/website/infra/logs/{env}"

# application.yml의 logging.pattern.level('%5p [reqId=...]')이 레벨 표기 자리를
# 대체해도, ERROR는 5자라 패딩이 안 붙어 타임스탬프 바로 뒤에 그대로 나온다.
_LINE_PATTERN = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d{3}\s+ERROR\b")


def instance_metadata():
    """push-disk-metric.py와 동일 이유로 하드코딩하지 않고 IMDS에서 런타임 조회."""
    req = urllib.request.Request(_IMDS_URL, headers={"Authorization": "Bearer Oracle"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return data["id"], data["compartmentId"]


def current_log_file(env):
    log_dir = _LOG_DIR_TEMPLATE.format(env=env)
    candidates = glob.glob(f"{log_dir}/*.log")
    if not candidates:
        return None
    return max(candidates, key=os.path.getmtime)


def error_count(env):
    log_file = current_log_file(env)
    if log_file is None:
        return 0
    cutoff = datetime.now() - timedelta(minutes=WINDOW_MINUTES)
    count = 0
    with open(log_file, "r", errors="ignore") as f:
        for line in f:
            match = _LINE_PATTERN.match(line)
            if not match:
                continue
            try:
                timestamp = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue
            if timestamp >= cutoff:
                count += 1
    return count


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("prod", "stage"):
        print("usage: push-error-log-metric.py <prod|stage>", file=sys.stderr)
        sys.exit(1)

    env = sys.argv[1]
    metric_name = f"ErrorLogCount{env.capitalize()}"
    count = error_count(env)
    instance_id, compartment_id = instance_metadata()

    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    client = oci.monitoring.MonitoringClient(
        config={},
        signer=signer,
        service_endpoint="https://telemetry-ingestion.ap-tokyo-1.oraclecloud.com",
    )

    metric_data = oci.monitoring.models.MetricDataDetails(
        namespace=NAMESPACE,
        compartment_id=compartment_id,
        name=metric_name,
        dimensions={"resourceId": instance_id, "resourceDisplayName": "likelion-prod"},
        datapoints=[
            oci.monitoring.models.Datapoint(
                timestamp=datetime.now(timezone.utc),
                value=count,
            )
        ],
    )

    client.post_metric_data(
        post_metric_data_details=oci.monitoring.models.PostMetricDataDetails(
            metric_data=[metric_data]
        )
    )
    print(f"posted {metric_name}={count}")


if __name__ == "__main__":
    main()

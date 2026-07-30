#!/usr/bin/env python3
"""최근 email_log 성공 건수를 OCI Monitoring custom metric으로 전송.

#113 후속 - push-email-failure-metric.py는 "뭔가 잘못됐다"는 신호(임계치 초과
알람)만 주고, "지금 발송이 정상적으로 되고 있다"는 긍정 신호는 아무 데도 없었다
(장찬욱 질문 - "실제 발송 성공 여부를 어떻게 모니터링하나"). email_log를 직접
sqlite3로 조회하거나 OCI Deliverability Dashboard(90일 반송률 추이, 인프라
전체 관점)로 볼 수는 있지만 둘 다 온디맨드 확인이라, 대시보드에 얹을 수 있는
시계열 지표가 따로 필요했다.

failure 스크립트와 똑같은 패턴(같은 sqlite3 직접 조회, 같은 instance principal
인증, 같은 cron 주기) - 알람 없음, 순수 대시보드용 시계열이라 임계치 판단이
필요 없다(값이 0이어도 "그 5분 동안 아무도 안 보냈다"일 뿐 이상 신호가 아님 -
클럽 사이트라 발송 자체가 간헐적이라서 "성공 0건"을 알람으로 걸면 상시 오탐).

instance principal 인증 사용(likelion-monitoring-dyngroup + likelion-monitoring-policy
재사용 - push-disk-metric.py·push-email-failure-metric.py와 동일 IAM, 새로 만든 것 없음).

사용: push-email-success-metric.py <prod|stage>
"""
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

import oci

NAMESPACE = "custom_likelion"
WINDOW_MINUTES = 5  # push-email-failure-metric.py와 동일 주기(cron */5) - 같은 윈도우로 나란히 비교 가능하게

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"
_DATA_DIR = "/home/ubuntu/website/infra/data"


def instance_metadata():
    """인스턴스가 자기 자신의 OCID/compartment를 IMDS에서 런타임에 조회 - push-email-failure-metric.py와 동일 이유."""
    req = urllib.request.Request(_IMDS_URL, headers={"Authorization": "Bearer Oracle"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return data["id"], data["compartmentId"]


def success_count(db_name):
    db_file = f"{_DATA_DIR}/{db_name}.db"
    query = (
        "SELECT COUNT(*) FROM email_log "
        "WHERE status = 'SUCCESS' "
        f"AND sent_at >= datetime('now', '-{WINDOW_MINUTES} minutes');"
    )
    result = subprocess.run(
        ["sqlite3", db_file, query],
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )
    return int(result.stdout.strip() or 0)


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("prod", "stage"):
        print("usage: push-email-success-metric.py <prod|stage>", file=sys.stderr)
        sys.exit(1)

    db_name = sys.argv[1]
    metric_name = f"EmailSuccessCount{db_name.capitalize()}"
    count = success_count(db_name)
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

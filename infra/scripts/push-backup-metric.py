#!/usr/bin/env python3
"""백업 성공 신호를 OCI Monitoring custom metric으로 전송 (dead man's switch).

backup-db.sh가 각 DB(prod/stage) 백업+업로드를 성공적으로 마칠 때마다 호출한다.
값 자체는 의미 없음(1 고정) - "언제 마지막으로 찍혔는가"만 본다.
OCI Monitoring의 Absence Alarm이 "N시간 동안 이 메트릭이 안 들어오면" 트리거하는
방식으로 씀 - cron이 안 돌았거나, 서버가 죽었거나, 백업 스크립트가 중간에 실패해서
여기까지 도달 못 했을 때 전부 이걸로 잡힘(#83 관측 미션 - 백업 확신용).

instance principal 인증 사용(likelion-monitoring-dyngroup + likelion-monitoring-policy
재사용 - push-disk-metric.py와 동일 IAM, 새로 만든 것 없음).

사용: push-backup-metric.py <prod|stage>
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone

import oci

NAMESPACE = "custom_likelion"

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"


def instance_metadata():
    """인스턴스가 자기 자신의 OCID/compartment를 IMDS에서 런타임에 조회.

    하드코딩하지 않는 이유: 이 값들을 소스에 박아두면 gitleaks가 OCI
    OCID로 탐지해 CI를 막고(#83 PR에서 실제로 걸림), 인스턴스가 교체되면
    코드도 같이 고쳐야 함 - 둘 다 IMDS 조회로 피할 수 있음.
    """
    req = urllib.request.Request(_IMDS_URL, headers={"Authorization": "Bearer Oracle"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return data["id"], data["compartmentId"]


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("prod", "stage"):
        print("usage: push-backup-metric.py <prod|stage>", file=sys.stderr)
        sys.exit(1)

    db_name = sys.argv[1]
    metric_name = f"BackupSuccess{db_name.capitalize()}"
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
                value=1,
            )
        ],
    )

    client.post_metric_data(
        post_metric_data_details=oci.monitoring.models.PostMetricDataDetails(
            metric_data=[metric_data]
        )
    )
    print(f"posted {metric_name}=1")


if __name__ == "__main__":
    main()

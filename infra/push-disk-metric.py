#!/usr/bin/env python3
"""루트 파일시스템 사용률(%)을 OCI Monitoring custom metric으로 전송.

instance principal 인증 사용 - 별도 자격증명 파일 없이, 이 인스턴스 자체의
identity로 서명함(likelion-monitoring-dyngroup + likelion-monitoring-policy 필요).
cron으로 5분마다 실행(~/oci-monitor-venv 안의 python3로). #83 관측 미션 - 디스크 공간 사전경고용.

OCI Compute Instance Monitoring 플러그인은 CPU/메모리는 주지만 "디스크 사용률(%)"은
기본 메트릭에 없어서(oci_computeagent 네임스페이스에 FilesystemUtilization 없음,
공식 문서로 확인됨) 이 스크립트로 직접 채운다.
"""
import json
import shutil
import urllib.request
from datetime import datetime, timezone

import oci

NAMESPACE = "custom_likelion"
METRIC_NAME = "DiskSpaceUtilization"

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


def disk_used_percent(path="/"):
    total, used, _free = shutil.disk_usage(path)
    return round(used / total * 100, 2)


def main():
    pct = disk_used_percent()
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
        name=METRIC_NAME,
        dimensions={"resourceId": instance_id, "resourceDisplayName": "likelion-prod"},
        datapoints=[
            oci.monitoring.models.Datapoint(
                timestamp=datetime.now(timezone.utc),
                value=pct,
            )
        ],
    )

    client.post_metric_data(
        post_metric_data_details=oci.monitoring.models.PostMetricDataDetails(
            metric_data=[metric_data]
        )
    )
    print(f"posted DiskSpaceUtilization={pct}%")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""배포 서버 git 워킹트리의 드리프트(직접 수정·낯선 파일)를 OCI Monitoring custom metric으로 전송.

값 = `git status --porcelain` 라인 수(0이면 깨끗함). tracked 파일이 서버에서 직접
수정되거나, gitignore 안 된 낯선 파일이 생기면 0보다 커진다. gitignore된 파일
(nginx.conf, .env*, data/ 등 서버 전용 파일)은 `git status`에 애초에 안 잡히므로
여기서 따로 걸러낼 필요 없음 — 걸리는 건 전부 "git이 모르는 상태로 남은 것"뿐.

CD 배포 스크립트의 git pull이 untracked 파일과 경로가 겹쳐 매번 조용히 실패하고
있었는데(#104), 원인이 드러난 게 배포 3번 실패 후였다. 이 메트릭은 그 드리프트를
발생 즉시 잡기 위한 것.

instance principal 인증 사용(push-backup-metric.py·push-disk-metric.py와 동일 IAM,
새로 만든 것 없음). cron으로 5분마다 실행(~/oci-monitor-venv 안의 python3로).

사용: push-git-drift-metric.py
"""
import json
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import oci

NAMESPACE = "custom_likelion"
METRIC_NAME = "GitDriftFileCount"

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"

REPO_DIR = Path(__file__).resolve().parent.parent


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


def dirty_file_count():
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    return len([line for line in result.stdout.splitlines() if line.strip()])


def main():
    count = dirty_file_count()
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
                value=count,
            )
        ],
    )

    client.post_metric_data(
        post_metric_data_details=oci.monitoring.models.PostMetricDataDetails(
            metric_data=[metric_data]
        )
    )
    print(f"posted GitDriftFileCount={count}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""OCI Monitoring이 판정한 알람 상태(FIRING/OK)를 그대로 가져와 로컬 JSON Lines에 남긴다.

snapshot-system-metrics.py(CPU/메모리/디스크)와 달리 이 값은 호스트에서 직접 관측할 수
없다 — 알람의 FIRING/OK 판정은 OCI Monitoring이 threshold·period·지속시간(observability.md
"지속성 판정" 절 참고)을 계산해 내리는 결과라, 그 판정 자체를 물어봐야 한다. 그래서
로컬 계측이 아니라 instance principal로 OCI Monitoring API(list_alarms_status)를
호출한다 — 다만 그 호출은 이 호스트 크론에서 하고, 백엔드 컨테이너는 여전히 로컬 파일만
읽는다(system-metrics와 동일 마운트 패턴). 백엔드에 새 OCI SDK 의존성·IAM 정책을
얹지 않으려는 목적(observability.md 참고 — 이미 한 번 검토했다가 보류된 전례 있음).

cron으로 5분마다 실행(다른 push-*.py들과 같은 `*/5 * * * *`). snapshot-system-metrics.py가
2분 오프셋을 쓰는 이유(CPU 1초 샘플링이 동시 기동 컨텐션에 취약)는 이 스크립트엔 없다 —
API 호출 한 번이라 로컬 리소스 경쟁에 안 취약하다.

미결 — 서버에 실제로 올리기 전에 인프라 오너가 직접 확인해야 함:
1. IAM 정책: instance principal이 지금 갖고 있는 건 custom metric 쓰기용 `use metrics`뿐이라
   추정된다(push-disk-metric.py 등). 알람 상태를 읽으려면 `read` 권한이 별도로 필요할 수
   있음 — 예) `allow dynamic-group likelion-monitoring-dyngroup to read alarms in tenancy`
   같은 정책 추가 필요(정확한 verb/resource-type은 OCI 정책 문서로 재확인).
2. list_alarms_status가 기본 엔드포인트로 응답하는지 실측 필요 — 안 되면 조회용 엔드포인트
   (`https://telemetry.{region}.oraclecloud.com`)를 push-disk-metric.py처럼 명시해야 함.
"""
import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import oci

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "logs" / "alarm-status"
SNAPSHOT_FILE = SNAPSHOT_DIR / "snapshot.jsonl"

# 5분 간격 기준 30일치 - 다른 로그 보관 기간과 동일(cleanup-old-logs.sh 참고) = 8640줄.
MAX_LINES = 30 * 24 * 60 // 5

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"


def instance_metadata():
    """push-disk-metric.py와 동일 이유(gitleaks 회피 + 인스턴스 교체 대응)로 하드코딩 대신 IMDS 조회."""
    req = urllib.request.Request(_IMDS_URL, headers={"Authorization": "Bearer Oracle"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return data["compartmentId"], data["region"]


def fetch_alarm_statuses(compartment_id: str, region: str):
    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    client = oci.monitoring.MonitoringClient(config={"region": region}, signer=signer)

    # 컴파트먼트는 루트 하나뿐이지만(infra/CLAUDE.md 기준), 하위 컴파트먼트가 생겨도
    # 놓치지 않게 subtree까지 본다.
    response = client.list_alarms_status(
        compartment_id=compartment_id,
        compartment_id_in_subtree=True,
    )
    return [
        {
            "alarmName": item.display_name,
            "severity": item.severity,
            "status": item.status,
        }
        for item in response.data
    ]


def main():
    compartment_id, region = instance_metadata()
    alarms = fetch_alarm_statuses(compartment_id, region)

    sample = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "alarms": alarms,
    }

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with open(SNAPSHOT_FILE, "a") as f:
        f.write(json.dumps(sample) + "\n")

    # 트림도 snapshot-system-metrics.py와 동일한 원자적 교체 패턴(중간에 죽어도 이력 유실 없음).
    with open(SNAPSHOT_FILE) as f:
        lines = f.readlines()
    if len(lines) > MAX_LINES:
        tmp_file = SNAPSHOT_FILE.with_suffix(".jsonl.tmp")
        with open(tmp_file, "w") as f:
            f.writelines(lines[-MAX_LINES:])
        os.replace(tmp_file, SNAPSHOT_FILE)

    firing = [a["alarmName"] for a in alarms if a["status"] == "FIRING"]
    print(f"alarm-status: {len(alarms)}개 중 FIRING {len(firing)}개 {firing}")


if __name__ == "__main__":
    main()

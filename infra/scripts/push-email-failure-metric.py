#!/usr/bin/env python3
"""최근 email_log 실패 건수를 OCI Monitoring custom metric으로 전송.

#113 - 모집 이메일 발송이 조용히 전부 실패하는 상황(SMTP 인증 깨짐 등)을
사람이 우연히 email_log를 들여다볼 때까지 놓치지 않기 위한 임계치 알림 기반.

email_log 테이블을 sqlite3로 직접 조회한다 - 백엔드에 새 API를 만들지 않음
(push-disk-metric.py가 df를 직접 읽는 것과 동일 패턴, ubuntu 계정은 이미
DB 파일 직접 접근 가능 - db-access.md "인프라 오너(ubuntu)" 절 참고).
값 자체는 "최근 WINDOW_MINUTES분 동안의 실패 건수"이고, 개별 실패 1건마다
알림이 오면 알림 피로만 커지므로 임계치는 OCI Alarm Definition 쪽에서 판단.

#113 후속(장찬욱 요청) - 이 알람은 "우리가 손볼 수 있는 문제"만 대상이어야 한다.
failure_cause 값 중 RECIPIENT_ADDRESS_INVALID(우리 클라이언트 검증에서 걸린 주소
형식 오류)·RECIPIENT_ADDRESS_REJECTED_BY_SERVER(OCI가 RCPT 단계에서 자체 형식
재검증 후 거부 - OCI 문서 553 "Invalid email address", "메일함 없음"이 아니라
결국 같은 "주소 형식" 문제를 OCI가 대신 잡아준 경우)는 몇 번을 다시 보내도
똑같이 실패하는 "그 수신자" 쪽 원인이라 카운트에서 뺀다 - 인프라가 손볼 수 있는
게 없다.
그 외(INVALID_INPUT·TEMPLATE_RENDERING_FAILED = 우리 코드 버그, SMTP_AUTHENTICATION_
FAILED·SMTP_CONNECTION_FAILED = 우리 쪽 인프라, UNKNOWN_FAILURE = 분류 불가)는 전부
"우리가 조치해야 할 수도 있는" 쪽이라 그대로 센다(값 정의·재시도 대상 여부는
backend FailureCause.java가 단일 출처 - 이 EXCLUDED 목록을 바꾸려면 거기부터 대조).
failure_cause 컬럼 도입 이전의 과거 FAILURE 행이나 분류 실패 케이스는 전부 NULL인데,
이건 "우리 쪽 원인이 아니라고 확인된 적 없다"는 뜻이라 안전하게 포함시킨다(놓치는
것보다 오탐이 낫다는 원칙).

instance principal 인증 사용(likelion-monitoring-dyngroup + likelion-monitoring-policy
재사용 - push-disk-metric.py와 동일 IAM, 새로 만든 것 없음).

사용: push-email-failure-metric.py <prod|stage>
"""
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

import oci

NAMESPACE = "custom_likelion"
WINDOW_MINUTES = 5  # cron 주기(*/5)와 일치 - observability.md "알람 튜닝 사고 모델"의 C (disk/git-drift와 동일 주기)

# 알람 카운트에서 빼는 failure_cause 값 - "그 수신자" 쪽 원인이라 재시도·알람 둘 다 대상이 아닌
# 것들(backend FailureCause.java의 isAlarmWorthy()=false와 일치시킬 것, 단일 출처는 그쪽).
EXCLUDED_FAILURE_CAUSES = ("RECIPIENT_ADDRESS_INVALID", "RECIPIENT_ADDRESS_REJECTED_BY_SERVER")

_IMDS_URL = "http://169.254.169.254/opc/v2/instance/"
_DATA_DIR = "/home/ubuntu/website/infra/data"


def instance_metadata():
    """인스턴스가 자기 자신의 OCID/compartment를 IMDS에서 런타임에 조회.

    하드코딩하지 않는 이유: 이 값들을 소스에 박아두면 gitleaks가 OCI
    OCID로 탐지해 CI를 막고, 인스턴스가 교체되면 코드도 같이 고쳐야 함 -
    둘 다 IMDS 조회로 피할 수 있음(push-disk-metric.py와 동일 이유).
    """
    req = urllib.request.Request(_IMDS_URL, headers={"Authorization": "Bearer Oracle"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return data["id"], data["compartmentId"]


def failure_count(db_name):
    db_file = f"{_DATA_DIR}/{db_name}.db"
    excluded = ", ".join(f"'{cause}'" for cause in EXCLUDED_FAILURE_CAUSES)
    query = (
        "SELECT COUNT(*) FROM email_log "
        "WHERE status = 'FAILURE' "
        f"AND (failure_cause IS NULL OR failure_cause NOT IN ({excluded})) "
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
        print("usage: push-email-failure-metric.py <prod|stage>", file=sys.stderr)
        sys.exit(1)

    db_name = sys.argv[1]
    metric_name = f"EmailFailureCount{db_name.capitalize()}"
    count = failure_count(db_name)
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

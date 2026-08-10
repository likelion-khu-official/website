#!/usr/bin/env python3
"""CPU/메모리/디스크 사용률(%)을 호스트에서 직접 읽어 로컬 JSON Lines에 남긴다.

OCI Monitoring을 거치지 않는다 — 배포 이력(#451 인프라 대시보드)과 같은 패턴으로,
이 스크립트가 로컬 파일에 쓰고 백엔드는 그 파일을 읽기만 한다. instance principal
인증도, OCI SDK도 필요 없다(순수 stdlib만 사용 - venv 없이 시스템 python3로도 실행 가능,
다른 push-*.py들과 크론 등록을 맞추려고 같은 venv를 써도 무해할 뿐).

cron으로 5분마다 실행. 인스턴스가 하나뿐이라(stage/prod 컨테이너가 같은 호스트를
공유) env 구분이 없다 - 시스템 지표는 애초에 인스턴스 단위 값이라 이게 맞다.
"""
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "logs" / "system-metrics"
SNAPSHOT_FILE = SNAPSHOT_DIR / "snapshot.jsonl"

# 5분 간격 기준 30일치(다른 로그 보관 기간과 동일, cleanup-old-logs.sh 참고) = 8640줄.
MAX_LINES = 30 * 24 * 60 // 5


def cpu_percent(sample_seconds: float = 1.0) -> float:
    """/proc/stat 두 샘플 사이 idle 대비 busy 비율 - 순간 로드가 아니라 실제 사용률."""
    import time

    def read_cpu_line():
        with open("/proc/stat") as f:
            fields = f.readline().split()[1:]  # "cpu  " 다음 값들
        return [int(x) for x in fields]

    first = read_cpu_line()
    time.sleep(sample_seconds)
    second = read_cpu_line()

    deltas = [b - a for a, b in zip(first, second)]
    idle = deltas[3] + deltas[4]  # idle + iowait
    total = sum(deltas)
    if total <= 0:
        return 0.0
    return round((1 - idle / total) * 100, 2)


def memory_percent() -> float:
    """MemAvailable 기준 - MemFree만 쓰면 회수 가능한 캐시까지 '사용 중'으로 오판한다."""
    values = {}
    with open("/proc/meminfo") as f:
        for line in f:
            key, rest = line.split(":", 1)
            values[key] = int(rest.strip().split()[0])  # kB
    total = values["MemTotal"]
    available = values["MemAvailable"]
    if total <= 0:
        return 0.0
    return round((1 - available / total) * 100, 2)


def disk_percent(path: str = "/") -> float:
    total, used, _free = shutil.disk_usage(path)
    return round(used / total * 100, 2)


def main():
    sample = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cpuPercent": cpu_percent(),
        "memoryPercent": memory_percent(),
        "diskPercent": disk_percent(),
    }

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with open(SNAPSHOT_FILE, "a") as f:
        f.write(json.dumps(sample) + "\n")

    # 매번 전체를 다시 쓰지 않고 넘칠 때만 트림. 같은 파일을 "w"로 열어 truncate 후 다시 쓰면
    # 그 사이 백엔드가 읽을 때 빈 파일이나 잘린 줄을 볼 수 있고, 재작성 도중 프로세스가 죽으면
    # 이력이 통째로 날아간다 - 임시 파일에 쓰고 os.replace()로 원자적 교체(같은 파일시스템
    # 안에서는 rename이 원자적이라 중간 상태가 절대 안 보임).
    with open(SNAPSHOT_FILE) as f:
        lines = f.readlines()
    if len(lines) > MAX_LINES:
        tmp_file = SNAPSHOT_FILE.with_suffix(".jsonl.tmp")
        with open(tmp_file, "w") as f:
            f.writelines(lines[-MAX_LINES:])
        os.replace(tmp_file, SNAPSHOT_FILE)

    print(f"snapshot: cpu={sample['cpuPercent']}% mem={sample['memoryPercent']}% disk={sample['diskPercent']}%")


if __name__ == "__main__":
    main()

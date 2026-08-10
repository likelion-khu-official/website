package likelion.khu.website.admin.infra;

// infra/scripts/snapshot-system-metrics.py가 호스트에서 직접 읽어 남기는 한 줄(JSON)과
// 필드를 그대로 맞춘 응답 모양. 인스턴스가 하나뿐이라 env 구분이 없다 - stage/prod
// 컨테이너 둘 다 같은 호스트의 같은 시계열을 본다.
public record SystemMetricSample(
        String timestamp,
        double cpuPercent,
        double memoryPercent,
        double diskPercent
) {
}

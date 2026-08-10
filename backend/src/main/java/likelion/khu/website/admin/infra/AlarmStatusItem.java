package likelion.khu.website.admin.infra;

// infra/scripts/snapshot-alarm-status.py가 OCI Monitoring list_alarms_status 응답에서
// 뽑아 남기는 알람 하나의 상태.
public record AlarmStatusItem(
        String alarmName,
        String severity,
        String status
) {
}

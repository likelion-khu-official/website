package likelion.khu.website.admin.infra;

import java.util.List;

// infra/scripts/snapshot-alarm-status.py가 남기는 한 줄(JSON)과 필드를 그대로 맞춘 응답 모양.
// 시계열이 아니라 "지금" 상태 하나만 의미가 있어 최신 한 줄만 돌려준다(AlarmStatusService 참고).
public record AlarmStatusSnapshot(
        String timestamp,
        List<AlarmStatusItem> alarms
) {
}

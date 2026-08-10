package likelion.khu.website.admin.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 조회 전용 - infra/scripts/snapshot-alarm-status.py가 OCI Monitoring의 판정 결과를 그대로
// 남긴 최신 알람 상태를 보여준다. 쓰기 경로 없음.
@RestController
@RequestMapping("/api/admin/infra/alarm-status")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AlarmStatusController {

    private final AlarmStatusService alarmStatusService;

    @GetMapping
    public ResponseEntity<AlarmStatusSnapshot> latest() {
        return alarmStatusService.latest()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}

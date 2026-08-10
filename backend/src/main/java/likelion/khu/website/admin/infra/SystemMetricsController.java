package likelion.khu.website.admin.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 조회 전용 - infra/scripts/snapshot-system-metrics.py가 남긴 CPU/메모리/디스크 시계열을
// 그대로 보여준다. 쓰기 경로 없음(#451 인프라 대시보드 "가시성" 단계).
@RestController
@RequestMapping("/api/admin/infra/system-metrics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SystemMetricsController {

    // 5분 간격 기준 기본 24시간(288) · 최대 7일(2016) - 그 이상은 화면에서 의미 있게 못 읽는다.
    private static final int DEFAULT_LIMIT = 288;
    private static final int MAX_LIMIT = 2016;

    private final SystemMetricsService systemMetricsService;

    @GetMapping
    public List<SystemMetricSample> list(@RequestParam(defaultValue = "" + DEFAULT_LIMIT) int limit) {
        int cappedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        return systemMetricsService.recent(cappedLimit);
    }
}

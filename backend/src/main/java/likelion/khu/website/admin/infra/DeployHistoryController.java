package likelion.khu.website.admin.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

// 조회 전용 — CD가 남긴 배포 기록을 그대로 보여준다. 쓰기 경로 없음(#451 인프라 대시보드
// "가시성" 단계, 실행/제어 기능은 이번 범위 밖).
@RestController
@RequestMapping("/api/admin/infra/deploy-history")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DeployHistoryController {

    private static final int MAX_LIMIT = 50;
    private static final Set<String> VALID_ENVS = Set.of("stage", "prod");

    private final DeployHistoryService deployHistoryService;

    @GetMapping
    public List<DeployRecord> list(
            @RequestParam(defaultValue = "stage") String env,
            @RequestParam(defaultValue = "20") int limit) {
        if (!VALID_ENVS.contains(env)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "env는 stage 또는 prod여야 해요.");
        }
        int cappedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        return deployHistoryService.recent(env, cappedLimit);
    }
}

package likelion.khu.website.admin.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class SystemMetricsService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // docker-compose.yml이 stage/prod 컨테이너 둘 다에 이 경로로 infra/logs/system-metrics를
    // 읽기 전용 마운트한다(DeployHistoryService와 동일 패턴). 로컬 개발 환경엔 이 디렉터리
    // 자체가 없다 - 파일이 없으면 "아직 기록이 없다"로 보고 빈 목록을 준다(에러 아님).
    @Value("${app.infra.system-metrics-path:/app/system-metrics}")
    private String systemMetricsPath;

    public List<SystemMetricSample> recent(int limit) {
        Path file = Path.of(systemMetricsPath, "snapshot.jsonl");
        if (!Files.isReadable(file)) {
            return List.of();
        }

        List<String> lines;
        try {
            lines = Files.readAllLines(file);
        } catch (IOException e) {
            return List.of();
        }

        List<SystemMetricSample> samples = new ArrayList<>();
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            try {
                samples.add(objectMapper.readValue(line, SystemMetricSample.class));
            } catch (IOException e) {
                // 한 줄이 깨져도 나머지 유효한 샘플까지 통째로 못 보여주면 안 된다 - 이 줄만 건너뛴다.
            }
        }

        Collections.reverse(samples); // 최신 샘플이 먼저 보이게
        return samples.size() > limit ? samples.subList(0, limit) : samples;
    }
}

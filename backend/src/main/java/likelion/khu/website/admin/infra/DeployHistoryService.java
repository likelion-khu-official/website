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
public class DeployHistoryService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // docker-compose.yml이 stage/prod 컨테이너 둘 다에 이 경로로 infra/logs/deploy-history를
    // 읽기 전용 마운트한다. 로컬 개발 환경엔 이 디렉터리 자체가 없다 — 마운트는 서버 컨테이너
    // 한정이라, 파일이 없으면 "아직 기록이 없다"로 보고 빈 목록을 준다(에러 아님).
    @Value("${app.infra.deploy-history-path:/app/deploy-history}")
    private String deployHistoryPath;

    public List<DeployRecord> recent(String env, int limit) {
        Path file = Path.of(deployHistoryPath, env + ".jsonl");
        if (!Files.isReadable(file)) {
            return List.of();
        }

        List<String> lines;
        try {
            lines = Files.readAllLines(file);
        } catch (IOException e) {
            return List.of();
        }

        List<DeployRecord> records = new ArrayList<>();
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            try {
                records.add(objectMapper.readValue(line, DeployRecord.class));
            } catch (IOException e) {
                // 한 줄이 깨져도 나머지 유효한 기록까지 통째로 못 보여주면 안 된다 — 이 줄만
                // 건너뛴다. CD가 쓰는 형식이 바뀌는 과도기 등에 나올 수 있는 상황.
            }
        }

        Collections.reverse(records); // 최신 배포가 먼저 보이게
        return records.size() > limit ? records.subList(0, limit) : records;
    }
}

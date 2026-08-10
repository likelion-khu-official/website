package likelion.khu.website.admin.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

@Service
public class AlarmStatusService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // docker-compose.yml이 stage/prod 컨테이너 둘 다에 이 경로로 infra/logs/alarm-status를
    // 읽기 전용 마운트한다(SystemMetricsService와 동일 패턴). 로컬 개발 환경엔 이 디렉터리
    // 자체가 없다 - 파일이 없으면 "아직 기록이 없다"로 보고 빈 값을 준다(에러 아님).
    @Value("${app.infra.alarm-status-path:/app/alarm-status}")
    private String alarmStatusPath;

    // 시계열이 아니라 "지금" 상태만 의미가 있어 최신 한 줄만 찾는다. 파일 끝에서부터
    // 거슬러 올라가며 첫 번째로 파싱되는 줄을 쓴다 - 마지막 줄이 크론과 겹쳐 쓰다 만
    // 상태로 깨져 있어도 그 이전 줄로 폴백한다.
    public Optional<AlarmStatusSnapshot> latest() {
        Path file = Path.of(alarmStatusPath, "snapshot.jsonl");
        if (!Files.isReadable(file)) {
            return Optional.empty();
        }

        List<String> lines;
        try {
            lines = Files.readAllLines(file);
        } catch (IOException e) {
            return Optional.empty();
        }

        for (int i = lines.size() - 1; i >= 0; i--) {
            String line = lines.get(i);
            if (line.isBlank()) {
                continue;
            }
            try {
                return Optional.of(objectMapper.readValue(line, AlarmStatusSnapshot.class));
            } catch (IOException e) {
                // 이 줄만 건너뛰고 그 이전 줄로 계속 폴백.
            }
        }
        return Optional.empty();
    }
}

package likelion.khu.website.admin.infra;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AlarmStatusServiceTest {

    @TempDir
    Path tempDir;

    private AlarmStatusService newService() {
        AlarmStatusService service = new AlarmStatusService();
        ReflectionTestUtils.setField(service, "alarmStatusPath", tempDir.toString());
        return service;
    }

    private void writeLines(String... lines) throws IOException {
        Files.write(tempDir.resolve("snapshot.jsonl"), List.of(lines));
    }

    @Test
    void latest_FileMissing_ReturnsEmpty() {
        Optional<AlarmStatusSnapshot> result = newService().latest();

        assertThat(result).isEmpty();
    }

    @Test
    void latest_ReturnsLastLine_NotFirst() throws IOException {
        writeLines(
                """
                {"timestamp":"2026-08-10T00:00:00Z","alarms":[{"alarmName":"disk","severity":"CRITICAL","status":"OK"}]}""",
                """
                {"timestamp":"2026-08-10T00:05:00Z","alarms":[{"alarmName":"disk","severity":"CRITICAL","status":"FIRING"}]}""");

        Optional<AlarmStatusSnapshot> result = newService().latest();

        assertThat(result).isPresent();
        assertThat(result.get().timestamp()).isEqualTo("2026-08-10T00:05:00Z");
        assertThat(result.get().alarms()).hasSize(1);
        assertThat(result.get().alarms().get(0).status()).isEqualTo("FIRING");
    }

    @Test
    void latest_LastLineMalformed_FallsBackToPreviousLine() throws IOException {
        writeLines(
                """
                {"timestamp":"2026-08-10T00:00:00Z","alarms":[{"alarmName":"disk","severity":"CRITICAL","status":"OK"}]}""",
                "not valid json at all");

        Optional<AlarmStatusSnapshot> result = newService().latest();

        assertThat(result).isPresent();
        assertThat(result.get().timestamp()).isEqualTo("2026-08-10T00:00:00Z");
    }
}

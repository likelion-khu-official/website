package likelion.khu.website.admin.infra;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SystemMetricsServiceTest {

    @TempDir
    Path tempDir;

    private SystemMetricsService newService() {
        SystemMetricsService service = new SystemMetricsService();
        ReflectionTestUtils.setField(service, "systemMetricsPath", tempDir.toString());
        return service;
    }

    private void writeLines(String... lines) throws IOException {
        Files.write(tempDir.resolve("snapshot.jsonl"), List.of(lines));
    }

    @Test
    void recent_FileMissing_ReturnsEmptyList() {
        List<SystemMetricSample> samples = newService().recent(20);

        assertThat(samples).isEmpty();
    }

    @Test
    void recent_ParsesLinesNewestFirst() throws IOException {
        writeLines(
                """
                {"timestamp":"2026-08-10T00:00:00Z","cpuPercent":10.5,"memoryPercent":40.2,"diskPercent":15.0}""",
                """
                {"timestamp":"2026-08-10T00:05:00Z","cpuPercent":12.1,"memoryPercent":41.0,"diskPercent":15.1}""");

        List<SystemMetricSample> samples = newService().recent(20);

        assertThat(samples).hasSize(2);
        assertThat(samples.get(0).timestamp()).isEqualTo("2026-08-10T00:05:00Z");
        assertThat(samples.get(1).timestamp()).isEqualTo("2026-08-10T00:00:00Z");
    }

    @Test
    void recent_MalformedLine_SkipsOnlyThatLine() throws IOException {
        writeLines(
                "not valid json at all",
                """
                {"timestamp":"2026-08-10T00:00:00Z","cpuPercent":10.5,"memoryPercent":40.2,"diskPercent":15.0}""");

        List<SystemMetricSample> samples = newService().recent(20);

        assertThat(samples).hasSize(1);
        assertThat(samples.get(0).cpuPercent()).isEqualTo(10.5);
    }

    @Test
    void recent_ExceedsLimit_ReturnsOnlyMostRecentN() throws IOException {
        writeLines(
                """
                {"timestamp":"2026-08-10T00:00:00Z","cpuPercent":1,"memoryPercent":1,"diskPercent":1}""",
                """
                {"timestamp":"2026-08-10T00:05:00Z","cpuPercent":2,"memoryPercent":2,"diskPercent":2}""",
                """
                {"timestamp":"2026-08-10T00:10:00Z","cpuPercent":3,"memoryPercent":3,"diskPercent":3}""");

        List<SystemMetricSample> samples = newService().recent(2);

        assertThat(samples).hasSize(2);
        assertThat(samples.get(0).timestamp()).isEqualTo("2026-08-10T00:10:00Z");
        assertThat(samples.get(1).timestamp()).isEqualTo("2026-08-10T00:05:00Z");
    }
}

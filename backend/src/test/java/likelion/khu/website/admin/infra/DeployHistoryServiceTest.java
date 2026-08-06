package likelion.khu.website.admin.infra;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeployHistoryServiceTest {

    @TempDir
    Path tempDir;

    private DeployHistoryService newService() {
        DeployHistoryService service = new DeployHistoryService();
        ReflectionTestUtils.setField(service, "deployHistoryPath", tempDir.toString());
        return service;
    }

    private void writeLines(String env, String... lines) throws IOException {
        Files.write(tempDir.resolve(env + ".jsonl"), List.of(lines));
    }

    @Test
    void recent_FileMissing_ReturnsEmptyList() {
        List<DeployRecord> records = newService().recent("stage", 20);

        assertThat(records).isEmpty();
    }

    @Test
    void recent_ParsesLinesNewestFirst() throws IOException {
        writeLines("stage",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"stage","sha":"aaa","outcome":"confirmed","migrations":[],"expectedMigrationCount":10,"actualMigrationCount":10}""",
                """
                {"timestamp":"2026-08-06T01:00:00Z","env":"stage","sha":"bbb","outcome":"confirmed","migrations":[{"file":"V1__x.sql","type":"additive"}],"expectedMigrationCount":11,"actualMigrationCount":11}""");

        List<DeployRecord> records = newService().recent("stage", 20);

        assertThat(records).hasSize(2);
        assertThat(records.get(0).sha()).isEqualTo("bbb");
        assertThat(records.get(0).migrations()).hasSize(1);
        assertThat(records.get(0).migrations().get(0).file()).isEqualTo("V1__x.sql");
        assertThat(records.get(1).sha()).isEqualTo("aaa");
    }

    @Test
    void recent_MismatchedCounts_InSyncIsFalse() throws IOException {
        writeLines("stage",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"stage","sha":"ccc","outcome":"rolled_back","migrations":[],"expectedMigrationCount":10,"actualMigrationCount":11}""");

        List<DeployRecord> records = newService().recent("stage", 20);

        assertThat(records.get(0).inSync()).isFalse();
    }

    @Test
    void recent_MalformedLine_SkipsOnlyThatLine() throws IOException {
        writeLines("stage",
                "not valid json at all",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"stage","sha":"ddd","outcome":"confirmed","migrations":[],"expectedMigrationCount":5,"actualMigrationCount":5}""");

        List<DeployRecord> records = newService().recent("stage", 20);

        assertThat(records).hasSize(1);
        assertThat(records.get(0).sha()).isEqualTo("ddd");
    }

    @Test
    void recent_ExceedsLimit_ReturnsOnlyMostRecentN() throws IOException {
        writeLines("stage",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"stage","sha":"1","outcome":"confirmed","migrations":[],"expectedMigrationCount":1,"actualMigrationCount":1}""",
                """
                {"timestamp":"2026-08-06T01:00:00Z","env":"stage","sha":"2","outcome":"confirmed","migrations":[],"expectedMigrationCount":2,"actualMigrationCount":2}""",
                """
                {"timestamp":"2026-08-06T02:00:00Z","env":"stage","sha":"3","outcome":"confirmed","migrations":[],"expectedMigrationCount":3,"actualMigrationCount":3}""");

        List<DeployRecord> records = newService().recent("stage", 2);

        assertThat(records).hasSize(2);
        assertThat(records.get(0).sha()).isEqualTo("3");
        assertThat(records.get(1).sha()).isEqualTo("2");
    }

    @Test
    void recent_DifferentEnvFile_NotMixed() throws IOException {
        writeLines("stage",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"stage","sha":"stage-sha","outcome":"confirmed","migrations":[],"expectedMigrationCount":1,"actualMigrationCount":1}""");
        writeLines("prod",
                """
                {"timestamp":"2026-08-06T00:00:00Z","env":"prod","sha":"prod-sha","outcome":"confirmed","migrations":[],"expectedMigrationCount":1,"actualMigrationCount":1}""");

        List<DeployRecord> stageRecords = newService().recent("stage", 20);
        List<DeployRecord> prodRecords = newService().recent("prod", 20);

        assertThat(stageRecords).extracting(DeployRecord::sha).containsExactly("stage-sha");
        assertThat(prodRecords).extracting(DeployRecord::sha).containsExactly("prod-sha");
    }
}

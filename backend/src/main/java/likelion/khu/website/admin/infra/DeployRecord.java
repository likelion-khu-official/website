package likelion.khu.website.admin.infra;

import java.util.List;

// CD(.github/workflows/cd.yml, record-deploy-status job)가 배포마다 남기는 한 줄(JSON)과
// 필드를 그대로 맞춘 응답 모양. expectedMigrationCount(이 배포된 앱 버전이 기대하는 마이그레이션
// 개수)와 actualMigrationCount(DB flyway_schema_history에 실제 적용된 개수)가 다르면
// 앱-DB가 어긋난 상태(예: 롤백으로 앱만 되돌아가고 DB는 그대로인 경우) — inSync()로 화면이
// 바로 판단할 수 있게 한다.
public record DeployRecord(
        String timestamp,
        String env,
        String sha,
        String outcome,
        List<MigrationEntry> migrations,
        int expectedMigrationCount,
        int actualMigrationCount
) {
    public boolean inSync() {
        return expectedMigrationCount == actualMigrationCount;
    }

    public record MigrationEntry(String file, String type) {
    }
}

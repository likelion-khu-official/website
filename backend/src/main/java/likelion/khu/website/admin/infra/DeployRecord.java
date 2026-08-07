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
        int actualMigrationCount,
        // DB에 실제로 마지막까지 적용된 마이그레이션 파일명. CD가 이 필드를 추가하기 전에 이미
        // 기록된 옛 줄에는 없으므로 null일 수 있다(Jackson이 없는 필드를 null로 채움).
        String latestAppliedMigration,
        // CD가 헬스체크/스모크테스트 실패 시점에 분류해서 좁힌 원인 한 문장(infra/scripts/
        // classify-deploy-failure.sh). 정상 배포이거나 이 필드가 생기기 전 옛 기록이면 null.
        String probableCause
) {
    public boolean inSync() {
        return expectedMigrationCount == actualMigrationCount;
    }

    public record MigrationEntry(String file, String type) {
    }
}

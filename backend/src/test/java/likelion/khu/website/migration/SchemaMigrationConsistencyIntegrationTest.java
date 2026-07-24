package likelion.khu.website.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;

/**
 * #133 — 엔티티만 고치고 db/migration/V{n}__*.sql을 깜빡하는 걸 배포 시점(stage 헬스체크 실패)이
 * 아니라 PR 시점(CI)에서 잡기 위한 안전장치.
 *
 * 나머지 테스트는 전부 src/test/resources/application.yml의 create-drop + Flyway 비활성 조합(빠르고
 * 격리된 :memory: DB)을 쓰지만, 이 테스트 하나만 그 설정을 오버라이드해서 실제 배포 환경과 동일한
 * 조합(Flyway가 db/migration/*.sql로 스키마를 실제로 만들고, ddl-auto=validate가 그 결과와 엔티티
 * 매핑이 맞는지 확인)으로 컨텍스트를 띄운다. 컨텍스트 기동 자체가 성공하면 이 테스트는 통과 —
 * 마이그레이션 파일과 엔티티 매핑이 실제로 일치한다는 뜻이다.
 */
// 커스텀 datasource.url(@TempDir 파일)이 다른 테스트의 캐시된 컨텍스트와 안 섞이게, 그리고
// 커넥션 풀(Hikari)이 이 DB 파일을 물고 있는 채로 @TempDir가 정리를 시도해 실패하는 걸(Windows에서
// 열린 파일 삭제 불가) 막기 위해 테스트가 끝나면 컨텍스트를 확실히 닫는다.
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SchemaMigrationConsistencyIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void overrideForRealMigrationCheck(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + tempDir.resolve("schema-check.db"));
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test
    void entityMappingsMatchActualMigrationFiles() {
        // 검증할 게 없다 — @SpringBootTest 컨텍스트가 위 설정으로 뜨는 것 자체가 검증이다.
        // 마이그레이션 파일이 엔티티와 안 맞으면 컨텍스트 기동 단계에서 이미 실패한다.
    }
}

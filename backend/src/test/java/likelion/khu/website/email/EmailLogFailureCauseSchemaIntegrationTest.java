package likelion.khu.website.email;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #113 후속 — EmailServiceTest는 emailLogRepository를 목(mock)으로 대체한 단위테스트라, "실제
 * SQLite CHECK 제약을 통과해서 저장되는가"는 검증하지 못한다. 마이그레이션 SQL의 CHECK 값 목록과
 * FailureCause.java의 enum 이름이 한 글자라도 어긋나면(오타 등) 단위테스트는 절대 못 잡고, 실제로는
 * 저장 시점에 SQLite가 예외를 던진다 — 그 간극을 메우기 위한 실제 DB 통합테스트.
 *
 * SchemaMigrationConsistencyIntegrationTest와 같은 패턴(임시 파일 SQLite + 실제 Flyway 마이그레이션
 * + ddl-auto=validate)을 재사용한다 — Mailpit(Docker)이 필요 없어 더 가볍고 빠르다.
 */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EmailLogFailureCauseSchemaIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void overrideForRealMigrationCheck(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + tempDir.resolve("failure-cause-check.db"));
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private EmailLogRepository emailLogRepository;

    // FailureCause의 7개 값 전부를 파라미터로 돌려 각각 실제 저장·조회가 되는지 확인 — 하나라도
    // 마이그레이션 CHECK 목록에서 빠지면 save()가 SQLiteException(constraint failed)을 던지며
    // 이 테스트가 실패한다.
    @ParameterizedTest
    @EnumSource(FailureCause.class)
    void everyFailureCauseValue_PersistsAndReadsBackThroughRealSqliteCheckConstraint(FailureCause cause) {
        String recipient = "check-" + cause.name().toLowerCase() + "@khu.ac.kr";
        EmailLog saved = emailLogRepository.save(
                EmailLog.failure(recipient, EmailType.RECRUITMENT_OPEN, "제목", "테스트 에러", cause, null));

        EmailLog reloaded = emailLogRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getFailureCause()).isEqualTo(cause);
        assertThat(reloaded.getStatus()).isEqualTo(EmailStatus.FAILURE);
    }

    // SUCCESS 행은 failure_cause가 null이어도(=CHECK의 "값이 있으면 이 목록 안"이라는 조건과 무관하게)
    // 문제없이 저장·조회되는지 — nullable 컬럼 설계의 핵심 전제.
    @Test
    void successLog_PersistsWithNullFailureCause() {
        EmailLog saved = emailLogRepository.save(
                EmailLog.success("check-success@khu.ac.kr", EmailType.RECRUITMENT_OPEN, "제목", null));

        EmailLog reloaded = emailLogRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getFailureCause()).isNull();
        assertThat(reloaded.getStatus()).isEqualTo(EmailStatus.SUCCESS);
    }
}

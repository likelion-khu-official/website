package likelion.khu.website.migration;

import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.MemberRole;
import likelion.khu.website.member.MemberService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2(#145, 학번 unique를 (학번,기수) 복합키로 정정)가 "이미 V1까지만 적용된, 실데이터가 있는
 * DB"에 실제로 안전하게 얹히는지 검증한다 — {@link MigrationUpgradeHarness} 사용법의 예제
 * 겸 회귀 테스트. 이 파일을 쓰기 전엔 별도 git worktree로 dev를 체크아웃해서 V1만 있는 DB를
 * 만들고 그 위에 V2를 수동으로 얹어 확인했는데(PR #155 리뷰 대응 중), 그 절차를 커밋 가능한
 * 테스트로 옮긴 것 — 다음에 비슷한 "테이블 재생성형" 마이그레이션이 필요할 때 이 harness를
 * 그대로 재사용하면 된다(db-man 스킬 참고).
 */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class MemberUniqueConstraintUpgradeTest {

    @TempDir
    static Path tempDir;

    private static String url() {
        return "jdbc:sqlite:" + tempDir.resolve("member-upgrade.db");
    }

    // @DynamicPropertySource는 컨텍스트가 뜨기(ddl-auto=validate가 스키마를 확인하기) *전에*
    // 실행되는 게 보장된다 — 그래서 harness로 파일을 다 준비하는 걸 여기서 한다. @Test 안에서
    // 하면 이미 컨텍스트가 (준비 안 된 빈 파일에 대고) validate하다 그 자리에서 실패한다.
    @DynamicPropertySource
    static void prepareUpgradedFileThenBoot(DynamicPropertyRegistry registry) {
        String dbUrl = url();

        // 1) V1까지만 적용 — "이 PR이 배포되기 직전의 실제 stage/prod" 상태.
        MigrationUpgradeHarness.migrateTo(dbUrl, "1");

        // 2) 그 시점 스키마에 실제로 있을 법한 행을 raw SQL로 심는다(엔티티는 이미 offboardedAt을
        // 아는 "새 버전"이라 이 시점 데이터를 Repository로는 심을 수 없다).
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into members (
                    cohort, failed_login_attempts, must_change_password, id,
                    created_at, created_by, emoji, name, password_hash, phone,
                    student_id, updated_at, updated_by
                ) values (
                    13, 0, 1, 1,
                    '2026-01-01 00:00:00', 'seed', '🦁', '기존행', 'hash', '01000000000',
                    '2020009999', '2026-01-01 00:00:00', 'seed'
                )
                """);

        // 3) 나머지(V2)를 마저 적용 — 이 PR이 실제로 배포되는 순간을 재현.
        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        registry.add("spring.datasource.url", MemberUniqueConstraintUpgradeTest::url);
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired MemberService memberService;
    @Autowired MemberAuthService memberAuthService;
    @Autowired MemberRepository memberRepository;

    @Test
    void v2PreservesExistingRowAndAllowsReEnrollmentAfterOffboarding() {
        // 파일 준비는 이미 prepareUpgradedFileThenBoot()에서 끝났다 — 여기선 준비된 DB 위에서
        // 실제 애플리케이션 계층(Repository·Service)으로 기존 행 보존과 재입부만 확인한다.
        Member existing = memberRepository.findAllByStudentId("2020009999").get(0);
        assertThat(existing.getCohort()).isEqualTo(13);
        assertThat(existing.getName()).isEqualTo("기존행");
        assertThat(existing.getOffboardedAt()).isNull();

        memberAuthService.offboard(existing.getId());

        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("재입부");
        req.setRoles(Set.of(MemberRole.BACKEND));
        req.setCohort(14);
        req.setStudentId("2020009999");
        req.setPhone("01099998888");
        MemberAdminResponse reEnrolled = memberService.create(req, "admin@likelion.org");

        assertThat(reEnrolled.getCohort()).isEqualTo(14);
        assertThat(reEnrolled.getId()).isNotEqualTo(existing.getId());

        // 한 학번이 이제 row 2개(오프보딩된 13기 + 활동 중인 14기)를 갖는다 — 이 조회가 다중
        // 결과를 실제로 정상 리턴하는지(Optional 기반 메서드였다면 여기서 예외로 터졌을 상황)
        // 직접 확인한다.
        assertThat(memberRepository.findAllByStudentId("2020009999"))
                .hasSize(2)
                .extracting(Member::getCohort)
                .containsExactlyInAnyOrder(13, 14);
    }
}

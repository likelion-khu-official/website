package likelion.khu.website.email;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

/**
 * #123 리뷰(ParkIlha) — 동일한 Mailpit 컨테이너 정의 + {@code @DynamicPropertySource} 블록이
 * 이메일 통합테스트 클래스마다(현재 6개) 그대로 복붙돼 있던 걸 여기로 뽑았다.
 *
 * 실제 OCI는 AUTH LOGIN + STARTTLS를 요구함(application.yml과 동일 조건) — Mailpit도 같은 협상을
 * 강제하도록 자체서명 인증서를 물려서, "이 프로토콜 경로가 실제로 동작하는지"까지 검증 대상에 포함시킨다.
 * (SPF/DKIM/DMARC나 OCI Approved Sender 같은 OCI 고유 정책은 이 컨테이너로도 검증 불가 — 별도 수동 확인 영역)
 *
 * {@code @Testcontainers}·{@code @Container} 정적 필드·{@code @DynamicPropertySource} 정적 메서드는
 * 전부 서브클래스 상속을 통해 그대로 적용된다(JUnit5·Spring Test 프레임워크가 클래스 계층을 타고
 * 탐색). 서브클래스는 프로파일(prod/stage)·{@code @DirtiesContext}·타임아웃 오버라이드처럼 클래스마다
 * 다른 부분만 자기 자리에 추가로 선언하면 된다 — 타임아웃처럼 추가 프로퍼티가 필요하면 서브클래스에
 * 별도 {@code @DynamicPropertySource} 메서드를 두면 되고(Spring이 상위·하위 클래스의 여러 메서드를 모두
 * 합쳐 등록), 여기 정의된 값과 겹치지만 않으면 된다.
 */
@Testcontainers
abstract class MailpitContainerSupport {

    @Container
    static final GenericContainer<?> mailpit =
            new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.21"))
                    .withExposedPorts(1025, 8025)
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/cert.pem"), "/mailpit-tls/cert.pem")
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/key.pem"), "/mailpit-tls/key.pem")
                    .withCommand(
                            "--smtp-tls-cert", "/mailpit-tls/cert.pem",
                            "--smtp-tls-key", "/mailpit-tls/key.pem",
                            "--smtp-require-starttls",
                            "--smtp-auth-accept-any"
                    );

    // 컨테이너가 뜨는 host·port는 Docker가 실행 시점에 랜덤 배정 — test/resources/application.yml의
    // 고정값으론 못 맞추니, 컨텍스트가 뜨기 직전에 실제 값으로 덮어씀.
    @DynamicPropertySource
    static void mailpitProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> "mailpit-test-user");
        registry.add("spring.mail.password", () -> "mailpit-test-pass");
        // 실제 OCI 설정(application.yml)과 동일하게 AUTH+STARTTLS를 켠 채로 검증
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.ssl.trust", () -> "*");
    }

    // 컨테이너를 끈 뒤 연결 실패를 빠르게 확인하기 위해 타임아웃을 짧게 둠. 주의: main
    // application.yml에도 타임아웃(5초)이 있지만, 실패 케이스를 빠르게 끝내려고 더 짧게(3초)
    // 오버라이드한다. mailpit을 실제로 내려서 SMTP 장애를 재현하는 실패 경로 테스트 클래스들에서만
    // 자기 @DynamicPropertySource 메서드 안에서 호출해서 쓴다(성공 경로 클래스는 불필요).
    static void fastFailureTimeouts(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
    }
}

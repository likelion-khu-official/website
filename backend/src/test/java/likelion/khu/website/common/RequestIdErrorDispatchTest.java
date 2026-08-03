package likelion.khu.website.common;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.auth.JwtProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;

// #404 리뷰(Copilot)에서 발견 — RequestIdFilter가 OncePerRequestFilter 기본값 때문에
// Tomcat의 /error 내부 재전송(DispatcherType.ERROR)에서 건너뛰어져서, 정작
// LoggingErrorAttributes가 로그를 남기는 그 순간엔 MDC에 requestId가 없던 버그.
// shouldNotFilterErrorDispatch()=false + request attribute로 같은 ID 재사용하는
// 수정이 실제로 그 로그 줄에까지 requestId를 붙이는지 끝까지 확인한다.
//
// MockMvc(모의 서블릿 환경)로는 이 문제 자체가 재현이 안 된다 — Tomcat 컨테이너 레벨의
// /error 내부 재전송을 실제로 안 거치기 때문. 그래서 webEnvironment=RANDOM_PORT로
// 진짜 내장 서버를 띄우고 실제 HTTP로 호출한다. anyRequest().authenticated()에 걸리지
// 않도록 JwtProvider로 진짜 access_token을 직접 발급해 쿠키로 실어 보낸다.
//
// @Transactional 대신 @DirtiesContext — 실제 HTTP 호출은 Tomcat의 별도 워커 스레드에서
// 처리되므로 테스트 스레드의 트랜잭션(롤백 대상)과 커넥션을 공유하지 않는다(SQLite 단일
// 커넥션이라 더더욱 안 맞음). 저장한 admin 한 건은 롤백 대신 컨텍스트 재기동으로 정리한다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(RequestIdErrorDispatchTest.ThrowingController.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RequestIdErrorDispatchTest {

    @Autowired
    TestRestTemplate restTemplate;
    @Autowired
    AdminRepository adminRepository;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    JwtProvider jwtProvider;

    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void attachAppender() {
        appender = new ListAppender<>();
        appender.start();
        loggingErrorAttributesLogger().addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        loggingErrorAttributesLogger().detachAppender(appender);
    }

    private Logger loggingErrorAttributesLogger() {
        return (Logger) LoggerFactory.getLogger(LoggingErrorAttributes.class);
    }

    @Test
    void unexpectedException_ErrorDispatchLogLine_CarriesSameRequestIdAsResponseHeader() {
        Admin admin = adminRepository.save(Admin.register("boom-test@khu.ac.kr", "테스트", passwordEncoder.encode("pw")));
        String accessToken = jwtProvider.createAccessToken(admin);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Cookie", "access_token=" + accessToken);
        ResponseEntity<String> response = restTemplate.exchange(
                "/test/boom", HttpMethod.GET, new HttpEntity<>(headers), String.class);

        String requestId = response.getHeaders().getFirst("X-Request-Id");
        assertThat(requestId).isNotBlank();

        assertThat(appender.list).isNotEmpty();
        ILoggingEvent errorLogEvent = appender.list.get(0);
        assertThat(errorLogEvent.getMDCPropertyMap()).containsEntry("requestId", requestId);
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/test/boom")
        String boom() {
            throw new IllegalArgumentException("의도적으로 던진 테스트용 예외");
        }
    }
}

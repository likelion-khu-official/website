package likelion.khu.website.recruitment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.email.EmailLog;
import likelion.khu.website.email.EmailLogRepository;
import likelion.khu.website.email.EmailStatus;
import likelion.khu.website.notification.NotificationSubscription;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #113/#124 QA — 실사용자 관점 질문("신청자 여러 명에게 실제로 다 발송되는가")에 답하는 테스트.
 * 목이 아닌 실제 SMTP(Mailpit)로 구독자 여러 명에게 실제 발송하고, 각 건이 email_log에 남는지 +
 * 한 명 주소가 이상해도 나머지 구독자 발송이 막히지 않는지까지 실제 HTTP 호출로 검증한다.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecruitmentOpenEmailHttpEndToEndIntegrationTest {

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

    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> "mailpit-test-user");
        registry.add("spring.mail.password", () -> "mailpit-test-pass");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.ssl.trust", () -> "*");
    }

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Autowired MockMvc mockMvc;
    @Autowired NotificationSubscriptionRepository subscriptionRepository;
    @Autowired EmailLogRepository emailLogRepository;

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ThreeRealSubscribers_AllThreeActuallyReceiveMailAndAreLogged() throws Exception {
        Set<String> subscribers = Set.of(
                "recruit-a@khu.ac.kr", "recruit-b@khu.ac.kr", "recruit-c@khu.ac.kr");
        subscribers.forEach(email -> subscriptionRepository.save(new NotificationSubscription(email)));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk());

        for (String to : subscribers) {
            awaitMessageTo(to);
        }

        List<EmailLog> logs = awaitEmailLogCount(3);
        assertThat(logs).extracting(EmailLog::getRecipient)
                .containsExactlyInAnyOrderElementsOf(subscribers);
        assertThat(logs).allMatch(log -> log.getStatus() == EmailStatus.SUCCESS);
    }

    // 구독자 중 하나가 형식이 깨진 주소라도(가입 시점엔 걸러졌어야 하지만 방어적으로) 나머지
    // 구독자 발송까지 막히면 안 된다 — RecruitmentManagementService가 한 명씩 개별로 예외를
    // 삼키고 계속 진행하는지 실제 HTTP 경로로 확인.
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_OneMalformedAddressAmongSubscribers_OthersStillReceiveMail() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("recruit-valid@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("not-an-email-address"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk());

        awaitMessageTo("recruit-valid@khu.ac.kr");
        List<EmailLog> logs = awaitEmailLogCount(2);

        EmailLog validLog = logs.stream().filter(l -> l.getRecipient().equals("recruit-valid@khu.ac.kr")).findFirst().orElseThrow();
        EmailLog malformedLog = logs.stream().filter(l -> l.getRecipient().equals("not-an-email-address")).findFirst().orElseThrow();
        assertThat(validLog.getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(malformedLog.getStatus()).isEqualTo(EmailStatus.FAILURE);
    }

    // #124 리뷰 — synchronized 락이 "구독자 다수 + 실제 동시 요청 + 진짜 SMTP" 조건에서도 정확히
    // 1회씩만 발송하는지, 그리고 메일에 담긴 링크가 올바른 공개 사이트 주소인지(어드민 도메인
    // 아님 — 리뷰에서 frontend-base-url 오용을 발견해 public-site-url로 분리) 함께 확인한다.
    // 기존 컨트롤러 테스트(RecruitmentManagementControllerTest#open_ConcurrentTriggers_SendsOnlyOnce)는
    // EmailService를 목으로 처리해 발송 "호출 횟수"만 셌다 — 여기서는 email_log·실제 SMTP 수신함
    // 양쪽에서 구독자당 정확히 한 통인지까지 확인한다.
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ManySubscribersConcurrentTriggers_EachReceivesExactlyOneMailWithCorrectLink() throws Exception {
        Set<String> subscribers = IntStream.rangeClosed(1, 15)
                .mapToObj(i -> "recruit-lock-" + i + "@khu.ac.kr")
                .collect(Collectors.toSet());
        subscribers.forEach(email -> subscriptionRepository.save(new NotificationSubscription(email)));

        int concurrentRequests = 6;
        SecurityContext securityContext = SecurityContextHolder.getContext();
        ExecutorService executor = Executors.newFixedThreadPool(concurrentRequests);
        CountDownLatch ready = new CountDownLatch(concurrentRequests);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < concurrentRequests; i++) {
                futures.add(executor.submit(() -> {
                    // 워커 스레드는 테스트 스레드와 별개라 @WithMockAdminUser가 심어둔
                    // SecurityContext를 직접 복사해줘야 401 없이 실제 open() 경로를 탄다.
                    SecurityContextHolder.setContext(securityContext);
                    ready.countDown();
                    start.await();
                    mockMvc.perform(patch("/api/admin/recruitment/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"open\":true}"));
                    return null;
                }));
            }
            ready.await();
            start.countDown();
            for (Future<?> future : futures) {
                future.get(15, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdown();
        }

        // 락이 없었다면 email_log가 구독자 수보다 부풀었을 것(동시 open() 호출마다 재발송) —
        // 정확히 구독자 수만큼만, 그것도 SUCCESS로만 쌓였는지 확인.
        List<EmailLog> logs = awaitEmailLogCount(subscribers.size());
        assertThat(logs).extracting(EmailLog::getRecipient)
                .containsExactlyInAnyOrderElementsOf(subscribers);
        assertThat(logs).allMatch(log -> log.getStatus() == EmailStatus.SUCCESS);

        // 진짜 SMTP 수신함에서도 구독자당 정확히 1통, 그리고 링크가 어드민(admin.likelion-khu.com)이
        // 아니라 공개 사이트(likelion-khu.com)를 가리키는지 본문(HTML)에서 직접 확인.
        for (String to : subscribers) {
            JsonNode summary = awaitMessageTo(to);
            JsonNode detail = getJson("/api/v1/message/" + summary.get("ID").asText());
            assertThat(detail.get("HTML").asText())
                    .as("%s에게 간 메일의 링크", to)
                    .contains("href=\"https://dev.likelion-khu.com\"");
        }
        assertThat(countMessagesAmong(subscribers))
                .as("구독자당 정확히 1통 — 락이 없었다면 여기서 15보다 컸을 것")
                .isEqualTo(subscribers.size());
    }

    private long countMessagesAmong(Set<String> recipients) throws Exception {
        JsonNode messages = getJson("/api/v1/messages");
        long count = 0;
        for (JsonNode message : messages.get("messages")) {
            if (recipients.contains(message.get("To").get(0).get("Address").asText())) {
                count++;
            }
        }
        return count;
    }

    private List<EmailLog> awaitEmailLogCount(int expectedCount) throws InterruptedException {
        for (int attempt = 0; attempt < 60; attempt++) {
            List<EmailLog> logs = emailLogRepository.findAll();
            if (logs.size() >= expectedCount) {
                return logs;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("email_log가 " + expectedCount + "건 쌓이길 기다렸지만 타임아웃");
    }

    private JsonNode awaitMessageTo(String to) throws Exception {
        for (int attempt = 0; attempt < 20; attempt++) {
            JsonNode messages = getJson("/api/v1/messages");
            for (JsonNode message : messages.get("messages")) {
                if (message.get("To").get(0).get("Address").asText().equals(to)) {
                    return message;
                }
            }
            Thread.sleep(150);
        }
        throw new AssertionError("Mailpit에서 " + to + " 수신 메일을 찾지 못했어요 (타임아웃)");
    }

    private JsonNode getJson(String path) throws Exception {
        String baseUrl = "http://" + mailpit.getHost() + ":" + mailpit.getMappedPort(8025);
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return OBJECT_MAPPER.readTree(response.body());
    }
}

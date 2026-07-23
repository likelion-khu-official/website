package likelion.khu.website.recruitment;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.email.EmailService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecruitmentManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired NotificationSubscriptionRepository subscriptionRepository;

    @MockitoBean
    EmailService emailService;

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void status_Default_ReturnsClosedWithSubscriberCount() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("b@khu.ac.kr"));

        mockMvc.perform(get("/api/admin/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false))
                .andExpect(jsonPath("$.subscriberCount").value(2));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ClosedToOpen_SendsToEverySubscriber() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("b@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("c@khu.ac.kr"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true))
                .andExpect(jsonPath("$.subscriberCount").value(3));

        // 발송은 #126 이후 @Async(RecruitmentOpenEmailEventListener)라 응답이 온 시점엔 아직
        // 안 끝났을 수 있음 — timeout()으로 별도 스레드가 따라잡을 때까지 폴링.
        verify(emailService, timeout(2000).times(3)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 완료기준 — "같은 발송을 두 번 트리거해도 중복 발송되지 않는다"
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_AlreadyOpen_DoesNotResend() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"open\":true}"));
        // 두 번째(이미 열림) 트리거 전에, 첫 번째 발송이 비동기로 끝났는지 확인해둔다 — 안 그러면
        // 아래 두 번째 verify가 첫 발송이 아직 안 끝난 타이밍에 우연히 통과할 수 있음.
        verify(emailService, timeout(2000)).sendRecruitmentOpenEmail(anyString(), anyString());

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));

        verify(emailService, times(1)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 완료기준 — "같은 발송을 두 번 트리거해도 중복 발송되지 않는다"를 동시 요청으로 확인.
    // 위 open_AlreadyOpen_DoesNotResend는 MockMvc 요청을 순차 실행해서 두 요청 사이에 항상
    // save()가 끼어드므로 read-check-write 경합을 재현하지 못한다 — 이 테스트는 CountDownLatch로
    // N개 스레드를 동시에 풀어 실제 경합을 유도한다(open()이 synchronized가 아니면 여러 스레드가
    // markOpened() 이전 isOpen()==false를 같이 읽어 이벤트가 여러 번 발행됨).
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ConcurrentTriggers_SendsOnlyOnce() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));

        int concurrentRequests = 10;
        SecurityContext securityContext = SecurityContextHolder.getContext();
        ExecutorService executor = Executors.newFixedThreadPool(concurrentRequests);
        CountDownLatch ready = new CountDownLatch(concurrentRequests);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < concurrentRequests; i++) {
                futures.add(executor.submit(() -> {
                    // 워커 스레드는 테스트 스레드와 별개라 SecurityContextHolder(기본 THREADLOCAL)를
                    // 못 보므로, @WithMockAdminUser가 테스트 스레드에 심어둔 컨텍스트를 직접 복사한다.
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
                future.get(5, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdown();
        }

        // 구독자는 1명뿐이므로 open()이 두 번 이상 이벤트를 발행했다면 이 한 명에게 여러 번 발송된다.
        verify(emailService, timeout(2000).times(1)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void close_OpenToClosed_DoesNotSendAnything() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        mockMvc.perform(patch("/api/admin/recruitment/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"open\":true}"));
        // close() 전에 open()의 비동기 발송이 끝났는지 확인해둔다(위 open_AlreadyOpen_DoesNotResend와 동일한 이유).
        verify(emailService, timeout(2000)).sendRecruitmentOpenEmail(anyString(), anyString());

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));

        // 열 때 1번만 — 닫을 때는 추가로 발송하지 않음
        verify(emailService, times(1)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 닫혀있는 상태에서 close()를 또 호출해도(끄기→끄기) 아무 일도 안 일어나야 함 — 열기 쪽만
    // 멱등성을 요구받았지만, 반대쪽도 부작용 없는지 상태공간 관점에서 확인.
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void close_AlreadyClosed_NoOp() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));

        verify(emailService, never()).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void updateStatus_MissingOpenField_Returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void status_NoCookie_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/recruitment/status"))
                .andExpect(status().isUnauthorized());
    }

    // #117에서 추가되는 MEMBER(일반 부원) 역할이 ADMIN/SUPER_ADMIN 전용 엔드포인트에
    // 접근하지 못하는지 — 권한상승 재발 방지용 경계 케이스.
    @Test
    @WithMockAdminUser(role = "MEMBER")
    void status_CalledByMember_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/recruitment/status"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void updateStatus_CalledByMember_Returns403() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isForbidden());
    }
}

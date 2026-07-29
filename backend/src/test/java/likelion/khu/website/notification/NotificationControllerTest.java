package likelion.khu.website.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    NotificationSubscriptionRepository repository;

    @Test
    void subscribe_ValidEmailWithConsent_Returns200WithSuccess() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"test@example.com\",\"privacyConsent\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // #70 — 처음이든 이미 등록됐든 응답이 동일해야, 아무 주소나 넣어보며 구독 여부를 캐낼 수 없다.
    @Test
    void subscribe_DuplicateEmail_ReturnsSameResponseAsFirst() throws Exception {
        String body = "{\"email\":\"dup@example.com\",\"privacyConsent\":true}";

        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("모집 알림을 신청했어요!"));

        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("모집 알림을 신청했어요!"));
    }

    // #68 — 동의 없이는 저장하지 않고 거부한다(개인정보보호법 제15조).
    @Test
    void subscribe_WithoutConsent_Returns400AndDoesNotSave() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"noconsent@example.com\",\"privacyConsent\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("PRIVACY_CONSENT_REQUIRED"));

        org.junit.jupiter.api.Assertions.assertFalse(repository.existsByEmail("noconsent@example.com"));
    }

    // #69 — 숨긴 honeypot 필드가 차 있으면 봇으로 보고 저장하지 않는다. 봇에게 안 들키게 성공 응답은 그대로.
    @Test
    void subscribe_HoneypotFilled_Returns200ButDoesNotSave() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"bot@example.com\",\"privacyConsent\":true,\"website\":\"http://spam.example\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.junit.jupiter.api.Assertions.assertFalse(repository.existsByEmail("bot@example.com"));
    }

    @Test
    void subscribe_InvalidEmail_Returns400WithMessage() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"privacyConsent\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void subscribe_BlankEmail_Returns400WithMessage() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"privacyConsent\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }
}

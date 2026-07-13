package likelion.khu.website.feed;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MagicLinkTokenControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MagicLinkTokenRepository repository;

    @Test
    void issue_ValidAuthorName_Returns200WithToken() throws Exception {
        mockMvc.perform(post("/api/feed/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorName\":\"선우\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.authorName").value("선우"))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty());
    }

    @Test
    void issue_BlankAuthorName_Returns400WithMessage() throws Exception {
        mockMvc.perform(post("/api/feed/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void checkStatus_FreshToken_ReturnsValidTrue() throws Exception {
        MagicLinkToken saved = repository.save(
                new MagicLinkToken("fresh-status-token", "선우", LocalDateTime.now().plusHours(1)));

        mockMvc.perform(get("/api/feed/tokens/{token}", saved.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.authorName").value("선우"));
    }

    @Test
    void checkStatus_UnknownToken_Returns404() throws Exception {
        mockMvc.perform(get("/api/feed/tokens/{token}", "no-such-token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void checkStatus_ExpiredToken_ReturnsValidFalseWithReason() throws Exception {
        MagicLinkToken saved = repository.save(
                new MagicLinkToken("expired-controller-token", "선우", LocalDateTime.now().minusMinutes(1)));

        mockMvc.perform(get("/api/feed/tokens/{token}", saved.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.reason").value("EXPIRED"));
    }
}

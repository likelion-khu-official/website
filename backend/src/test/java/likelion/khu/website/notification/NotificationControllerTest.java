package likelion.khu.website.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class NotificationControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void subscribe_ValidEmail_Returns200WithSuccess() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"test@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void subscribe_DuplicateEmail_Returns200WithSuccess() throws Exception {
        String body = "{\"email\":\"dup@example.com\"}";
        mockMvc.perform(post("/api/notifications/subscribe")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void subscribe_InvalidEmail_Returns400WithMessage() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void subscribe_BlankEmail_Returns400WithMessage() throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }
}

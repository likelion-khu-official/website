package likelion.khu.website.common;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RequestIdFilterTest {

    @Autowired MockMvc mockMvc;

    @Test
    void response_AnyRequest_HasRequestIdHeader() throws Exception {
        MvcResult result = mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andReturn();

        String requestId = result.getResponse().getHeader("X-Request-Id");
        assertThat(requestId).isNotBlank();
    }

    @Test
    void response_TwoRequests_GetDifferentRequestIds() throws Exception {
        String first = mockMvc.perform(get("/actuator/health"))
                .andReturn().getResponse().getHeader("X-Request-Id");
        String second = mockMvc.perform(get("/actuator/health"))
                .andReturn().getResponse().getHeader("X-Request-Id");

        assertThat(first).isNotEqualTo(second);
    }
}

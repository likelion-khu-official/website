package likelion.khu.website.recruitment;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 공개(비로그인) 모집 상태 조회 — /apply·랜딩이 지원폼/모집알림 전환을 결정하는 데 쓴다(#152).
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecruitmentPublicControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired RecruitmentStatusRepository recruitmentStatusRepository;

    @Test
    void status_Default_ReturnsClosedWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false))
                // 공개 응답엔 관리 정보(구독자 수)가 없어야 한다.
                .andExpect(jsonPath("$.subscriberCount").doesNotExist());
    }

    @Test
    void status_WhenOpen_ReturnsOpen() throws Exception {
        RecruitmentStatus status = new RecruitmentStatus();
        status.markOpened();
        recruitmentStatusRepository.save(status);

        mockMvc.perform(get("/api/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));
    }
}

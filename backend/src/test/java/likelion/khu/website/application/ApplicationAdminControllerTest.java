package likelion.khu.website.application;

import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자(ADMIN 이상) 지원폼 관리 — 폼 편집 + 지원자 열람. 권한 경계는 위키 "정보구조와 권한"
// 기준 ADMIN 이상 공용(#152).
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ApplicationAdminControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ApplicationRepository applicationRepository;

    private static final String SCHEMA = """
            {"schema":{"title":"14기 모집","questions":[
              {"id":"name","label":"이름","type":"short_text","required":true},
              {"id":"track1","label":"1지망","type":"track","required":true},
              {"id":"fe_screen","label":"만들고 싶은 화면","type":"long_text","required":false,"showForTrack":"FE"}
            ]}}""";

    // ── PUT/GET /api/admin/application-form ──────────────────────────

    @Test
    @WithMockAdminUser(role = "ADMIN")
    void updateForm_ByAdmin_SavesAndReturnsSchema() throws Exception {
        mockMvc.perform(put("/api/admin/application-form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SCHEMA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schema.title").value("14기 모집"));

        // 저장 후 조회하면 그대로 나온다.
        mockMvc.perform(get("/api/admin/application-form"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schema.questions[2].showForTrack").value("FE"));
    }

    @Test
    @WithMockUser(roles = "MEMBER")
    void updateForm_ByMember_Returns403() throws Exception {
        mockMvc.perform(put("/api/admin/application-form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SCHEMA))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateForm_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(put("/api/admin/application-form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SCHEMA))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/admin/applications ──────────────────────────────────

    @Test
    @WithMockAdminUser(role = "ADMIN")
    void list_ByAdmin_ReturnsSchemaAndAnswers() throws Exception {
        applicationRepository.save(new Application(
                "{\"title\":\"14기 모집\",\"questions\":[{\"id\":\"name\",\"label\":\"이름\",\"type\":\"short_text\",\"required\":true}]}",
                "{\"name\":\"홍길동\"}"));

        mockMvc.perform(get("/api/admin/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].schema.title").value("14기 모집"))
                .andExpect(jsonPath("$[0].answers.name").value("홍길동"))
                .andExpect(jsonPath("$[0].submittedAt").exists());
    }

    @Test
    @WithMockUser(roles = "MEMBER")
    void list_ByMember_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/applications"))
                .andExpect(status().isForbidden());
    }

    @Test
    void list_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/applications"))
                .andExpect(status().isUnauthorized());
    }
}

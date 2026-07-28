package likelion.khu.website.application;

import likelion.khu.website.recruitment.RecruitmentStatus;
import likelion.khu.website.recruitment.RecruitmentStatusRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 공개(비로그인) 지원 API — 폼 조회 + 제출. 인증 없이 도는 경로라 @WithMockUser를 안 붙인다.
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ApplicationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ApplicationFormRepository formRepository;
    @Autowired ApplicationRepository applicationRepository;
    @Autowired RecruitmentStatusRepository recruitmentStatusRepository;

    // 이메일 부작용 없이 모집만 연다(RecruitmentManagementService.open()은 안내메일을 발송하므로 안 씀).
    private void openRecruitment() {
        RecruitmentStatus status = new RecruitmentStatus();
        status.markOpened();
        recruitmentStatusRepository.save(status);
    }

    // ── GET /api/application-form ────────────────────────────────────

    @Test
    void getForm_WhenNoneConfigured_ReturnsEmptyQuestions() throws Exception {
        mockMvc.perform(get("/api/application-form"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schema.questions").isArray())
                .andExpect(jsonPath("$.schema.questions.length()").value(0));
    }

    @Test
    void getForm_ReturnsConfiguredSchemaVerbatim() throws Exception {
        formRepository.save(new ApplicationForm(
                "{\"title\":\"14기 모집\",\"questions\":[{\"id\":\"name\",\"label\":\"이름\",\"type\":\"short_text\",\"required\":true}]}",
                "admin@khu.ac.kr"));

        mockMvc.perform(get("/api/application-form"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schema.title").value("14기 모집"))
                .andExpect(jsonPath("$.schema.questions[0].id").value("name"))
                .andExpect(jsonPath("$.schema.questions[0].required").value(true));
    }

    // ── POST /api/applications ───────────────────────────────────────

    @Test
    void submit_WhenOpenAndConsented_Returns200AndStores() throws Exception {
        openRecruitment();

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{\"name\":\"홍길동\",\"track1\":\"FE\"},\"privacyConsent\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(applicationRepository.count()).isEqualTo(1);
    }

    // 동의 없이는 접수 안 됨 — 완료기준 "개인정보 동의 없으면 제출 불가"의 서버측 방어.
    @Test
    void submit_WithoutConsent_Returns400AndStoresNothing() throws Exception {
        openRecruitment();

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{\"name\":\"홍길동\"},\"privacyConsent\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PRIVACY_CONSENT_REQUIRED"));

        assertThat(applicationRepository.count()).isZero();
    }

    // 모집 닫힘(기본)이면 API 직접 호출도 서버에서 거부 — 완료기준 "모집기간에만 지원".
    @Test
    void submit_WhenClosed_Returns409AndStoresNothing() throws Exception {
        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{\"name\":\"홍길동\"},\"privacyConsent\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RECRUITMENT_CLOSED"));

        assertThat(applicationRepository.count()).isZero();
    }

    @Test
    void submit_MissingAnswers_Returns400() throws Exception {
        openRecruitment();

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"privacyConsent\":true}"))
                .andExpect(status().isBadRequest());
    }

    // 제출 시점 폼 정의가 답변과 함께 스냅샷으로 박힌다 — 그 뒤 폼을 바꿔도 옛 제출의 스냅샷은 그대로.
    @Test
    void submit_SnapshotsFormSchemaAtSubmitTime() throws Exception {
        formRepository.save(new ApplicationForm(
                "{\"title\":\"스냅샷기수\",\"questions\":[{\"id\":\"name\",\"label\":\"이름\",\"type\":\"short_text\",\"required\":true}]}",
                "admin@khu.ac.kr"));
        openRecruitment();

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{\"name\":\"홍길동\"},\"privacyConsent\":true}"))
                .andExpect(status().isOk());

        Application saved = applicationRepository.findAll().get(0);
        assertThat(saved.getSchemaSnapshotJson()).contains("스냅샷기수");
        assertThat(saved.getAnswersJson()).contains("홍길동");
    }
}

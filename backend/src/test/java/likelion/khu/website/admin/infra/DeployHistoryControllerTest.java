package likelion.khu.website.admin.infra;

import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DeployHistoryControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean
    DeployHistoryService deployHistoryService;

    @Test
    void list_NoAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/infra/deploy-history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockAdminUser
    void list_ValidEnv_ReturnsRecords() throws Exception {
        DeployRecord record = new DeployRecord(
                "2026-08-06T00:00:00Z", "stage", "abc123", "confirmed",
                List.of(new DeployRecord.MigrationEntry("V1__x.sql", "additive")),
                10, 10, "V1__x.sql", "예상 원인 문장");
        when(deployHistoryService.recent(eq("stage"), anyInt())).thenReturn(List.of(record));

        mockMvc.perform(get("/api/admin/infra/deploy-history").param("env", "stage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sha").value("abc123"))
                .andExpect(jsonPath("$[0].outcome").value("confirmed"))
                .andExpect(jsonPath("$[0].migrations[0].file").value("V1__x.sql"))
                .andExpect(jsonPath("$[0].latestAppliedMigration").value("V1__x.sql"))
                .andExpect(jsonPath("$[0].probableCause").value("예상 원인 문장"));
    }

    @Test
    @WithMockAdminUser
    void list_InvalidEnv_Returns400() throws Exception {
        mockMvc.perform(get("/api/admin/infra/deploy-history").param("env", "not-a-real-env"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockAdminUser
    void list_LimitAboveMax_IsCappedAt50() throws Exception {
        when(deployHistoryService.recent(eq("stage"), anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/infra/deploy-history").param("limit", "9999"))
                .andExpect(status().isOk());

        verify(deployHistoryService).recent("stage", 50);
    }

    @Test
    @WithMockAdminUser
    void list_DefaultParams_UsesStageAndLimit20() throws Exception {
        when(deployHistoryService.recent(eq("stage"), anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/infra/deploy-history"))
                .andExpect(status().isOk());

        verify(deployHistoryService).recent("stage", 20);
    }
}

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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SystemMetricsControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean
    SystemMetricsService systemMetricsService;

    @Test
    void list_NoAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/infra/system-metrics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockAdminUser
    void list_ReturnsSamples() throws Exception {
        SystemMetricSample sample = new SystemMetricSample("2026-08-10T00:00:00Z", 12.3, 45.6, 20.1);
        when(systemMetricsService.recent(anyInt())).thenReturn(List.of(sample));

        mockMvc.perform(get("/api/admin/infra/system-metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cpuPercent").value(12.3))
                .andExpect(jsonPath("$[0].memoryPercent").value(45.6))
                .andExpect(jsonPath("$[0].diskPercent").value(20.1));
    }

    @Test
    @WithMockAdminUser
    void list_LimitAboveMax_IsCappedAt2016() throws Exception {
        when(systemMetricsService.recent(anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/infra/system-metrics").param("limit", "999999"))
                .andExpect(status().isOk());

        verify(systemMetricsService).recent(2016);
    }

    @Test
    @WithMockAdminUser
    void list_DefaultParams_UsesLimit288() throws Exception {
        when(systemMetricsService.recent(anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/infra/system-metrics"))
                .andExpect(status().isOk());

        verify(systemMetricsService).recent(288);
    }
}

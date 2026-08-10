package likelion.khu.website.admin.infra;

import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AlarmStatusControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean
    AlarmStatusService alarmStatusService;

    @Test
    void latest_NoAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/infra/alarm-status"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockAdminUser
    void latest_NoSnapshotYet_Returns204() throws Exception {
        when(alarmStatusService.latest()).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/infra/alarm-status"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockAdminUser
    void latest_ReturnsSnapshot() throws Exception {
        AlarmStatusSnapshot snapshot = new AlarmStatusSnapshot(
                "2026-08-10T00:05:00Z",
                List.of(new AlarmStatusItem("disk-usage-high", "CRITICAL", "FIRING"))
        );
        when(alarmStatusService.latest()).thenReturn(Optional.of(snapshot));

        mockMvc.perform(get("/api/admin/infra/alarm-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timestamp").value("2026-08-10T00:05:00Z"))
                .andExpect(jsonPath("$.alarms[0].alarmName").value("disk-usage-high"))
                .andExpect(jsonPath("$.alarms[0].status").value("FIRING"));
    }
}

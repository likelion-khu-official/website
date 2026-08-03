package likelion.khu.website.audit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditControllerTest {

    @Mock AuditService auditService;
    @InjectMocks AuditController controller;

    @Test
    void listPassesOperationalFiltersAndCapsPageSize() {
        when(auditService.search(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        controller.list(
                ActorType.ADMIN, AuditAction.STATE_CHANGE, AuditEventType.PEOPLE_MANAGEMENT,
                "MEMBER", 12L, AuditOutcome.SUCCESS, AuditView.IMPORTANT,
                null, null, "오프보딩", -1, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(auditService).search(
                eq(ActorType.ADMIN), eq(AuditAction.STATE_CHANGE), eq(AuditEventType.PEOPLE_MANAGEMENT),
                eq("MEMBER"), eq(12L), eq(AuditOutcome.SUCCESS), eq(AuditView.IMPORTANT),
                eq(null), eq(null), eq("오프보딩"), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
    }
}

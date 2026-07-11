package likelion.khu.website.admin.invitation;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminInvitationTest {

    @Test
    void issue_SetsPendingStatusAndNotExpired() {
        AdminInvitation invitation =
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token", Duration.ofHours(72));

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(invitation.isExpired()).isFalse();
    }

    @Test
    void markAccepted_FromPending_Succeeds() {
        AdminInvitation invitation =
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token", Duration.ofHours(72));

        invitation.markAccepted();

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    }

    @Test
    void markCancelled_FromPending_Succeeds() {
        AdminInvitation invitation =
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token", Duration.ofHours(72));

        invitation.markCancelled();

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.CANCELLED);
    }

    @Test
    void markAccepted_AlreadyProcessed_Throws() {
        AdminInvitation invitation =
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token", Duration.ofHours(72));
        invitation.markCancelled();

        assertThatThrownBy(invitation::markAccepted).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void isExpired_PastExpiry_ReturnsTrue() {
        AdminInvitation invitation =
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token", Duration.ofMillis(-1));

        assertThat(invitation.isExpired()).isTrue();
    }
}

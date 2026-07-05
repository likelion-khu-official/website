package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueResponse;
import likelion.khu.website.feed.dto.MagicLinkTokenStatusResponse;
import likelion.khu.website.feed.exception.MagicLinkTokenAlreadyUsedException;
import likelion.khu.website.feed.exception.MagicLinkTokenExpiredException;
import likelion.khu.website.feed.exception.MagicLinkTokenNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MagicLinkTokenServiceTest {

    @Autowired
    MagicLinkTokenService service;

    @Autowired
    MagicLinkTokenRepository repository;

    @Test
    void issue_ReturnsTokenWith24HourExpiry() {
        MagicLinkTokenIssueResponse response = service.issue(new MagicLinkTokenIssueRequest("선우"));

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getAuthorName()).isEqualTo("선우");
        assertThat(response.getExpiresAt()).isAfter(LocalDateTime.now().plusHours(23));
        assertThat(response.getExpiresAt()).isBefore(LocalDateTime.now().plusHours(25));
    }

    @Test
    void issue_GeneratesUniqueTokens() {
        MagicLinkTokenIssueResponse first = service.issue(new MagicLinkTokenIssueRequest("선우"));
        MagicLinkTokenIssueResponse second = service.issue(new MagicLinkTokenIssueRequest("시현"));

        assertThat(first.getToken()).isNotEqualTo(second.getToken());
    }

    @Test
    void checkStatus_FreshToken_ReturnsValid() {
        MagicLinkTokenIssueResponse issued = service.issue(new MagicLinkTokenIssueRequest("선우"));

        MagicLinkTokenStatusResponse status = service.checkStatus(issued.getToken());

        assertThat(status.isValid()).isTrue();
        assertThat(status.getAuthorName()).isEqualTo("선우");
        assertThat(status.getReason()).isNull();
    }

    @Test
    void checkStatus_UnknownToken_ThrowsNotFound() {
        assertThatThrownBy(() -> service.checkStatus("no-such-token"))
                .isInstanceOf(MagicLinkTokenNotFoundException.class);
    }

    @Test
    void checkStatus_UsedToken_ReturnsInvalidWithUsedReason() {
        MagicLinkTokenIssueResponse issued = service.issue(new MagicLinkTokenIssueRequest("선우"));
        service.consume(issued.getToken());

        MagicLinkTokenStatusResponse status = service.checkStatus(issued.getToken());

        assertThat(status.isValid()).isFalse();
        assertThat(status.getReason()).isEqualTo("USED");
    }

    @Test
    void checkStatus_ExpiredToken_ReturnsInvalidWithExpiredReason() {
        MagicLinkToken expired = repository.save(
                new MagicLinkToken("expired-status-token", "선우", LocalDateTime.now().minusMinutes(1)));

        MagicLinkTokenStatusResponse status = service.checkStatus(expired.getToken());

        assertThat(status.isValid()).isFalse();
        assertThat(status.getReason()).isEqualTo("EXPIRED");
    }

    @Test
    void consume_ValidToken_MarksUsedAndReturnsAuthorName() {
        MagicLinkTokenIssueResponse issued = service.issue(new MagicLinkTokenIssueRequest("선우"));

        String authorName = service.consume(issued.getToken());

        assertThat(authorName).isEqualTo("선우");
        assertThat(repository.findByToken(issued.getToken()).orElseThrow().isUsed()).isTrue();
    }

    @Test
    void consume_AlreadyUsedToken_ThrowsAlreadyUsed() {
        MagicLinkTokenIssueResponse issued = service.issue(new MagicLinkTokenIssueRequest("선우"));
        service.consume(issued.getToken());

        assertThatThrownBy(() -> service.consume(issued.getToken()))
                .isInstanceOf(MagicLinkTokenAlreadyUsedException.class);
    }

    @Test
    void consume_ExpiredToken_ThrowsExpired() {
        MagicLinkToken expired = repository.save(
                new MagicLinkToken("expired-consume-token", "선우", LocalDateTime.now().minusMinutes(1)));

        assertThatThrownBy(() -> service.consume(expired.getToken()))
                .isInstanceOf(MagicLinkTokenExpiredException.class);
    }

    @Test
    void consume_UnknownToken_ThrowsNotFound() {
        assertThatThrownBy(() -> service.consume("no-such-token"))
                .isInstanceOf(MagicLinkTokenNotFoundException.class);
    }
}

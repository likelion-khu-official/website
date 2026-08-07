package likelion.khu.website.discord;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

// SiteContentPublishedEvent를 받아 디스코드 embed로 만들어 보내는 리스너.
//
// @Async + @TransactionalEventListener(AFTER_COMMIT): 발행처(PostService·ProjectService)는 @Transactional
// 안에서 이벤트를 쏘므로, 트랜잭션이 "커밋된 뒤에만"(=글/프로젝트가 실제로 저장 확정된 경우에만) 알림이
// 나가야 한다 — 롤백된 글을 알리면 안 된다. @Async가 콜백을 별도 스레드로 넘겨, 웹훅 왕복(최대 8초)이
// 컨트롤러 응답을 잡아두지 않는다(EmailLogEventListener·RecruitmentOpenEmailEventListener와 같은 패턴).
//
// 트리거를 추가하려면(예: 모집 시작) 발행처에서 SiteContentPublishedEvent를 하나 더 쏘면 된다 —
// 여기 렌더링은 그대로 재사용된다.
@Component
class DiscordAnnouncementListener {

    private static final String BOT_USERNAME = "홈페이지 Bot";
    private static final String FOOTER = "멋쟁이사자처럼 경희대";
    private static final int BRAND_COLOR = 0xFF7710; // 멋사 오렌지
    private static final int SUMMARY_MAX = 140;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final DiscordWebhookClient client;
    private final String siteBaseUrl;

    DiscordAnnouncementListener(DiscordWebhookClient client,
                               @Value("${app.public-site-url}") String publicSiteUrl) {
        this.client = client;
        this.siteBaseUrl = stripTrailingSlash(publicSiteUrl);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onSiteContentPublished(SiteContentPublishedEvent event) {
        client.send(toPayload(event));
    }

    DiscordWebhookPayload toPayload(SiteContentPublishedEvent event) {
        List<DiscordWebhookPayload.Field> fields = event.meta().stream()
                .map(m -> new DiscordWebhookPayload.Field(m.name(), m.value(), true))
                .toList();

        DiscordWebhookPayload.Embed embed = new DiscordWebhookPayload.Embed(
                new DiscordWebhookPayload.Author(event.kind().label()),
                event.title(),
                siteBaseUrl + event.path(),
                truncate(event.summary()),
                BRAND_COLOR,
                fields.isEmpty() ? null : fields,
                event.thumbnailUrl() == null ? null : new DiscordWebhookPayload.Thumbnail(event.thumbnailUrl()),
                new DiscordWebhookPayload.Footer(FOOTER),
                OffsetDateTime.now(SEOUL).toString()
        );
        return new DiscordWebhookPayload(BOT_USERNAME, List.of(embed));
    }

    private static String truncate(String summary) {
        if (summary == null || summary.isBlank()) {
            return null;
        }
        String trimmed = summary.strip();
        return trimmed.length() <= SUMMARY_MAX ? trimmed : trimmed.substring(0, SUMMARY_MAX) + "…";
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}

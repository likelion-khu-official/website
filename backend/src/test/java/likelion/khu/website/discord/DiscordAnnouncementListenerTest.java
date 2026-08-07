package likelion.khu.website.discord;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// 디스코드에 실제로 나가는 embed 모양을 고정한다 — "짜치지 않게"가 회귀로 깨지지 않도록.
// 웹훅 발송(네트워크)은 건드리지 않고, 이벤트 → 페이로드 변환만 순수하게 검증한다.
class DiscordAnnouncementListenerTest {

    // base URL 뒤에 슬래시가 있어도 경로가 //로 겹치지 않아야 한다.
    private final DiscordAnnouncementListener listener =
            new DiscordAnnouncementListener(new DiscordWebhookClient(""), "https://likelion-khu.com/");

    @Test
    void 블로그_이벤트를_embed로_변환한다() {
        SiteContentPublishedEvent event = SiteContentPublishedEvent.blog(
                "트랜잭션 이벤트로 부수효과 분리하기", "커밋 이후에 안전하게 알림을 흘리는 법.", "abc123", "신선우");

        DiscordWebhookPayload payload = listener.toPayload(event);

        assertThat(payload.username()).isEqualTo("홈페이지 Bot");
        assertThat(payload.embeds()).hasSize(1);
        DiscordWebhookPayload.Embed embed = payload.embeds().get(0);
        assertThat(embed.author().name()).isEqualTo("새 블로그 글");
        assertThat(embed.title()).isEqualTo("트랜잭션 이벤트로 부수효과 분리하기");
        assertThat(embed.url()).isEqualTo("https://likelion-khu.com/blog/abc123");
        assertThat(embed.color()).isEqualTo(0xFF7710);
        assertThat(embed.footer().text()).isEqualTo("멋쟁이사자처럼 경희대");
        assertThat(embed.thumbnail()).isNull(); // 블로그는 담백하게 — 썸네일 없음
        assertThat(embed.fields()).extracting(DiscordWebhookPayload.Field::name).containsExactly("글쓴이");
        assertThat(embed.fields()).extracting(DiscordWebhookPayload.Field::value).containsExactly("신선우");
    }

    @Test
    void 프로젝트_이벤트는_기수_팀원_기술과_썸네일을_담는다() {
        SiteContentPublishedEvent event = SiteContentPublishedEvent.project(
                "ORCA", "동아리 홈페이지.", 7L, 3, 6, List.of("Spring", "Next.js"), "https://cdn/thumb.png");

        DiscordWebhookPayload.Embed embed = listener.toPayload(event).embeds().get(0);

        assertThat(embed.author().name()).isEqualTo("새 프로젝트");
        assertThat(embed.url()).isEqualTo("https://likelion-khu.com/projects/7");
        assertThat(embed.thumbnail().url()).isEqualTo("https://cdn/thumb.png");
        assertThat(embed.fields()).extracting(DiscordWebhookPayload.Field::name)
                .containsExactly("기수", "팀원", "기술");
        assertThat(embed.fields()).extracting(DiscordWebhookPayload.Field::value)
                .containsExactly("3기", "6명", "Spring · Next.js");
    }

    @Test
    void 긴_요약은_잘리고_말줄임표가_붙는다() {
        String longSummary = "가".repeat(200);
        SiteContentPublishedEvent event = SiteContentPublishedEvent.blog("제목", longSummary, "slug", "글쓴이");

        String description = listener.toPayload(event).embeds().get(0).description();

        assertThat(description).hasSize(141).endsWith("…"); // 140자 + 말줄임표
    }

    @Test
    void 요약이_없으면_description은_비운다() {
        SiteContentPublishedEvent event = SiteContentPublishedEvent.blog("제목", null, "slug", "글쓴이");

        assertThat(listener.toPayload(event).embeds().get(0).description()).isNull();
    }

    @Test
    void 웹훅_URL이_없으면_클라이언트는_꺼져있다() {
        assertThat(new DiscordWebhookClient("").isEnabled()).isFalse();
        assertThat(new DiscordWebhookClient("  ").isEnabled()).isFalse();
        assertThat(new DiscordWebhookClient("https://discord.com/api/webhooks/x").isEnabled()).isTrue();
    }
}

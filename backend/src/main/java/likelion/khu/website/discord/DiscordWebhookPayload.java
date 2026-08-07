package likelion.khu.website.discord;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

// 디스코드 웹훅 REST 페이로드(https://discord.com/developers/docs/resources/webhook#execute-webhook).
// null 필드는 디스코드가 거부하거나 지저분하게 렌더하므로 NON_NULL로 직렬화에서 뺀다.
@JsonInclude(JsonInclude.Include.NON_NULL)
record DiscordWebhookPayload(String username, List<Embed> embeds) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Embed(
            Author author,
            String title,
            String url,
            String description,
            Integer color,
            List<Field> fields,
            Thumbnail thumbnail,
            Footer footer,
            String timestamp
    ) {}

    record Author(String name) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Field(String name, String value, Boolean inline) {}

    record Thumbnail(String url) {}

    record Footer(String text) {}
}

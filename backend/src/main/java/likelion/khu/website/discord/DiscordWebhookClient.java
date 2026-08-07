package likelion.khu.website.discord;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

// 디스코드 웹훅으로 실제 POST를 쏘는 얇은 클라이언트.
//
// 왜 URL 유무로 켜고 끄냐면(프로파일이 아니라) — 이 알림은 운영(prod)에서만 돌아야 하는데, prod .env에만
// DISCORD_WEBHOOK_URL을 넣어두면 dev·stage·e2e는 값이 비어 자동으로 no-op이 된다. 누가 실수로 prod
// 프로파일을 켜도 URL이 없으면 아무것도 안 나가므로 "프로파일 == prod" 조건보다 안전하다.
// (웹훅 URL은 이걸 아는 사람이 봇 이름으로 아무거나 쏠 수 있는 시크릿이라, 레포엔 절대 커밋하지 않고
//  환경변수로만 주입한다 — 이 레포는 public.)
@Component
public class DiscordWebhookClient {

    private static final Logger log = LoggerFactory.getLogger(DiscordWebhookClient.class);

    private final String webhookUrl;
    private final RestClient restClient;

    public DiscordWebhookClient(@Value("${app.discord.webhook-url:}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
        // 디스코드가 응답 없이 멈춰도 @Async 스레드가 무한정 잡히지 않도록 상한선(메일 발송과 같은 방침).
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    boolean isEnabled() {
        return webhookUrl != null && !webhookUrl.isBlank();
    }

    // 발송 실패는 삼키고 로그만 남긴다 — 알림은 부수효과라, 실패해도 본 요청(글/프로젝트 저장)에는
    // 절대 영향을 주지 않는다. 이미 커밋된 뒤 별도 스레드에서 불린다.
    void send(DiscordWebhookPayload payload) {
        if (!isEnabled()) {
            return;
        }
        try {
            restClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("디스코드 웹훅 발송 실패: {}", e.getMessage());
        }
    }
}

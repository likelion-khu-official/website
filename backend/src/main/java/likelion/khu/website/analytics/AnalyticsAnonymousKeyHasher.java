package likelion.khu.website.analytics;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Component
public class AnalyticsAnonymousKeyHasher {

    public String hash(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(("likelion-khu-analytics:" + value).getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("익명 분석 키를 만들 수 없어요.", impossible);
        }
    }
}

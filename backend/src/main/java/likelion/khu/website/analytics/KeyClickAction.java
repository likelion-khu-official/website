package likelion.khu.website.analytics;

import java.util.Locale;

public enum KeyClickAction {
    APPLY,
    NOTIFICATION,
    BLOG_MORE,
    PROJECT_MORE,
    PROJECT_GITHUB;

    public static KeyClickAction parse(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("all")) return null;
        try {
            return valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("클릭 종류를 다시 선택해주세요.");
        }
    }
}

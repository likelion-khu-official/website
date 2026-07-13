package likelion.khu.website.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// Hibernate 6 + SQLite 조합에서 LocalDateTime이 epoch ms로 저장되는 문제 방지.
// autoApply = true — 모든 엔티티의 LocalDateTime 필드에 자동 적용.
@Converter(autoApply = true)
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String convertToDatabaseColumn(LocalDateTime attribute) {
        return attribute == null ? null : attribute.format(FORMATTER);
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            return LocalDateTime.parse(dbData, FORMATTER);
        } catch (Exception e) {
            // 기존에 epoch ms로 저장된 값 읽기 호환
            return LocalDateTime.ofEpochSecond(Long.parseLong(dbData) / 1000, 0,
                    java.time.ZoneOffset.UTC);
        }
    }
}

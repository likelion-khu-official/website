package likelion.khu.website.analytics;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;

public enum AnalyticsInterval {
    DAY,
    WEEK,
    MONTH;

    public static AnalyticsInterval parse(String value) {
        try {
            return valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new IllegalStateException("집계 간격은 day, week, month 중 하나여야 해요.");
        }
    }

    public LocalDate bucketStart(LocalDate date) {
        return switch (this) {
            case DAY -> date;
            case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> date.withDayOfMonth(1);
        };
    }

    public LocalDate next(LocalDate date) {
        return switch (this) {
            case DAY -> date.plusDays(1);
            case WEEK -> date.plusWeeks(1);
            case MONTH -> date.plusMonths(1);
        };
    }

    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }
}


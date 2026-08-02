package likelion.khu.website.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PageViewTrackRequest(
        @NotBlank(message = "페이지 경로가 필요해요.")
        @Size(max = 512, message = "페이지 경로가 너무 길어요.")
        @Pattern(regexp = "^/[^?#]*$", message = "쿼리 없는 사이트 내부 경로만 기록할 수 있어요.")
        String path
) {
}


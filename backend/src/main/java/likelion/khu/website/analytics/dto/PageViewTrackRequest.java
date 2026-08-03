package likelion.khu.website.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PageViewTrackRequest(
        @NotBlank(message = "페이지 경로가 필요해요.")
        @Size(max = 512, message = "페이지 경로가 너무 길어요.")
        @Pattern(regexp = "^/[^?#]*$", message = "쿼리 없는 사이트 내부 경로만 기록할 수 있어요.")
        String path,

        @Size(max = 36, message = "익명 방문자 번호가 너무 길어요.")
        @Pattern(
                regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
                message = "익명 방문자 번호 형식이 올바르지 않아요."
        )
        String visitorId
) {
}

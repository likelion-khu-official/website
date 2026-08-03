package likelion.khu.website.application.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// POST /api/applications — 비로그인 방문자의 지원 제출. answers는 질문 id→답변(파싱 없이 저장).
// privacyConsent=false면 서버가 접수를 거부한다(ApplicationService).
@Getter
@Setter
public class ApplicationSubmitRequest {
    @NotNull(message = "답변이 필요해요.")
    private JsonNode answers;

    private boolean privacyConsent;
}

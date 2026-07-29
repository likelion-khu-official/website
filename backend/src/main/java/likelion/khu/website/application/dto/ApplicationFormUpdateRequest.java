package likelion.khu.website.application.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// PUT /api/admin/application-form — 운영진이 편집한 폼 정의. BE는 구조를 검증하지 않고
// (질문 문법은 FE 몫) JSON 통째로 저장만 한다(#152).
@Getter
@Setter
public class ApplicationFormUpdateRequest {
    @NotNull(message = "폼 정의가 필요해요.")
    private JsonNode schema;
}

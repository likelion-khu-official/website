package likelion.khu.website.application.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// 관리자 지원자 열람 — 답변(answers)을 제출 시점 스냅샷 스키마(schema)로 해석해 라벨과 함께
// 보여줄 수 있게 둘 다 담는다(#152).
@Getter
@AllArgsConstructor
public class ApplicationAdminResponse {
    private Long id;
    private LocalDateTime submittedAt;
    private JsonNode schema;
    private JsonNode answers;
}

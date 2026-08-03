package likelion.khu.website.application.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 공개·관리자 폼 조회 공용. schema는 FE가 정의한 질문 스키마를 그대로 돌려준다(파싱 없음).
@Getter
@AllArgsConstructor
public class ApplicationFormResponse {
    private JsonNode schema;
}

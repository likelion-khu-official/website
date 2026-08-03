package likelion.khu.website.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import likelion.khu.website.application.dto.ApplicationAdminResponse;
import likelion.khu.website.application.dto.ApplicationFormResponse;
import likelion.khu.website.application.exception.PrivacyConsentRequiredException;
import likelion.khu.website.application.exception.RecruitmentClosedException;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.recruitment.RecruitmentStatus;
import likelion.khu.website.recruitment.RecruitmentStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationFormRepository formRepository;
    private final ApplicationRepository applicationRepository;
    private final RecruitmentStatusRepository recruitmentStatusRepository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    // 폼이 아직 한 번도 저장되지 않았을 때 돌려줄 빈 정의 — FE가 "질문 없음"으로 렌더한다.
    private static final String DEFAULT_SCHEMA_JSON = "{\"questions\":[]}";

    @Transactional(readOnly = true)
    public ApplicationFormResponse getForm() {
        return new ApplicationFormResponse(readTree(currentSchemaJson()));
    }

    @Transactional
    public ApplicationFormResponse updateForm(JsonNode schema, String updatedBy) {
        String json = writeString(schema);
        ApplicationForm form = formRepository.findById(ApplicationForm.SINGLETON_ID)
                .map(existing -> {
                    existing.update(json, updatedBy);
                    return existing;
                })
                .orElseGet(() -> new ApplicationForm(json, updatedBy));
        formRepository.save(form);
        auditService.recordStateChange("지원서 양식 수정", "APPLICATION_FORM", null, AuditOutcome.SUCCESS);
        return new ApplicationFormResponse(readTree(json));
    }

    @Transactional
    public void submit(JsonNode answers, boolean privacyConsent) {
        // 모집이 닫혀 있으면 접수하지 않는다 — 공개 화면은 그 자리에 모집 알림을 대신 띄우지만,
        // API를 직접 찌르는 경로도 서버에서 막는다(#152).
        RecruitmentStatus status = currentRecruitmentStatus();
        if (!status.isOpen() || status.getCurrentRoundId() == null) {
            throw new RecruitmentClosedException();
        }
        if (!privacyConsent) {
            throw new PrivacyConsentRequiredException();
        }
        // 제출 시점의 폼 정의를 답변과 함께 스냅샷으로 저장한다(다음 기수 질문 변경에도 옛 답변 해석 가능).
        applicationRepository.save(new Application(
                currentSchemaJson(), writeString(answers), status.getCurrentRoundId()));
    }

    @Transactional(readOnly = true)
    public List<ApplicationAdminResponse> getAllForAdmin() {
        return applicationRepository.findAllByOrderBySubmittedAtDesc().stream()
                .map(a -> new ApplicationAdminResponse(
                        a.getId(),
                        a.getSubmittedAt(),
                        readTree(a.getSchemaSnapshotJson()),
                        readTree(a.getAnswersJson())))
                .toList();
    }

    private RecruitmentStatus currentRecruitmentStatus() {
        return recruitmentStatusRepository.findById(RecruitmentStatus.SINGLETON_ID)
                .orElseGet(RecruitmentStatus::new);
    }

    private String currentSchemaJson() {
        return formRepository.findById(ApplicationForm.SINGLETON_ID)
                .map(ApplicationForm::getSchemaJson)
                .orElse(DEFAULT_SCHEMA_JSON);
    }

    // 저장된 JSON 문자열 ↔ JsonNode 변환. 저장 경로에서만 들어온 JSON이라 파싱 실패는
    // "일어나면 안 되는" 상태 — 서버 오류로 드러낸다.
    private JsonNode readTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("저장된 JSON을 읽지 못했어요.", e);
        }
    }

    private String writeString(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON 직렬화에 실패했어요.", e);
        }
    }
}

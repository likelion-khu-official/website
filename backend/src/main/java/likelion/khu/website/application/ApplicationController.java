package likelion.khu.website.application;

import likelion.khu.website.application.dto.ApplicationFormResponse;
import likelion.khu.website.application.dto.ApplicationSubmitRequest;
import likelion.khu.website.application.dto.ApplicationSubmitResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// 공개(비로그인) 지원 API — 폼 정의 조회 + 제출. 보안 경로 허용은 SecurityConfig 참고.
@RestController
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService service;

    // 현재 활성 폼 정의. 모집 열림/닫힘과 무관하게 정의 자체는 반환한다(열림 여부는 별도 상태 API).
    @GetMapping("/api/application-form")
    public ApplicationFormResponse form() {
        return service.getForm();
    }

    @PostMapping("/api/applications")
    public ApplicationSubmitResponse submit(@Valid @RequestBody ApplicationSubmitRequest request) {
        service.submit(request.getAnswers(), request.isPrivacyConsent());
        return new ApplicationSubmitResponse(true, "지원이 접수됐어요!");
    }
}

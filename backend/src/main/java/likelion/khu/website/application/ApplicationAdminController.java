package likelion.khu.website.application;

import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.application.dto.ApplicationAdminResponse;
import likelion.khu.website.application.dto.ApplicationFormResponse;
import likelion.khu.website.application.dto.ApplicationFormUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 관리자(ADMIN 이상) 지원폼 관리 — 폼 편집 + 지원자 열람. 위키 "정보구조와 권한" 기준
// 관리자 관리 기능이라 ADMIN 이상 공용(#152, #155 권한 정정과 동일 기준).
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class ApplicationAdminController {

    private final ApplicationService service;

    @GetMapping("/application-form")
    public ApplicationFormResponse getForm() {
        return service.getForm();
    }

    @PutMapping("/application-form")
    public ApplicationFormResponse updateForm(
            @Valid @RequestBody ApplicationFormUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return service.updateForm(request.getSchema(), admin.getEmail());
    }

    @GetMapping("/applications")
    public List<ApplicationAdminResponse> list() {
        return service.getAllForAdmin();
    }
}

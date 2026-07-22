package likelion.khu.website.recruitment;

import jakarta.validation.Valid;
import likelion.khu.website.recruitment.dto.RecruitmentStatusResponse;
import likelion.khu.website.recruitment.dto.RecruitmentStatusUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/recruitment")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class RecruitmentManagementController {

    private final RecruitmentManagementService service;

    /** 현재 모집 상태 + 구독자 수(켜기 전 미리보기용) */
    @GetMapping("/status")
    public RecruitmentStatusResponse status() {
        return service.getStatus();
    }

    /** 켜기/끄기 — 켜질 때만(닫힘→열림 전이) 구독자 전원에게 안내 메일 발송. 이미 열려있으면 무동작(멱등). */
    @PatchMapping("/status")
    public RecruitmentStatusResponse updateStatus(@Valid @RequestBody RecruitmentStatusUpdateRequest request) {
        return request.getOpen() ? service.open() : service.close();
    }
}

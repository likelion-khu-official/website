package likelion.khu.website.recruitment;

import likelion.khu.website.recruitment.dto.RecruitmentPublicStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 공개(비로그인) 모집 상태 조회 — 지원폼(/apply)·랜딩 모집 섹션이 지원폼/모집 알림 전환을
// 결정하는 데 쓴다. 관리용 상태·발송은 /api/admin/recruitment(ADMIN 이상) 쪽에 있다(#152).
@RestController
@RequestMapping("/api/recruitment")
@RequiredArgsConstructor
public class RecruitmentPublicController {

    private final RecruitmentManagementService service;

    @GetMapping("/status")
    public RecruitmentPublicStatusResponse status() {
        return service.getPublicStatus();
    }
}

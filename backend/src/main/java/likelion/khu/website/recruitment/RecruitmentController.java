package likelion.khu.website.recruitment;

import likelion.khu.website.recruitment.dto.PublicRecruitmentStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 공개 방문자용 컨트롤러 — RecruitmentManagementController(관리자 전용, 인증 필요)와 분리한다.
// 랜딩·/recruit 페이지가 로그인 없이 평소/모집중 상태를 읽어야 해서(#151) 새로 추가했다.
@RestController
@RequestMapping("/api/recruitment")
@RequiredArgsConstructor
public class RecruitmentController {

    private final RecruitmentManagementService service;

    @GetMapping("/status")
    public PublicRecruitmentStatusResponse status() {
        return service.getPublicStatus();
    }
}

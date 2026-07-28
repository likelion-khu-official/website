package likelion.khu.website.project;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.project.dto.ProjectCreateRequest;
import likelion.khu.website.project.dto.ProjectDetailResponse;
import likelion.khu.website.project.dto.ProjectHiddenUpdateRequest;
import likelion.khu.website.project.dto.ProjectSuccessResponse;
import likelion.khu.website.project.dto.ProjectSummaryResponse;
import likelion.khu.website.project.dto.ProjectUpdateRequest;
import likelion.khu.website.project.dto.ProjectReplaceRequest;
import likelion.khu.website.project.dto.MemberProjectSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /** 공개 목록 */
    @GetMapping("/api/projects")
    public List<ProjectSummaryResponse> list(@RequestParam(required = false) Integer limit) {
        return projectService.getPublicList(limit);
    }

    /** 공개 상세 */
    @GetMapping("/api/projects/{id}")
    public ProjectDetailResponse get(@PathVariable Long id) {
        return projectService.getPublicDetail(id);
    }

    /** 로그인한 멤버가 참여 중인 프로젝트 — 관리자 숨김 상태도 포함 */
    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/api/member/projects")
    public List<MemberProjectSummaryResponse> memberList(Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.getMemberProjects(member.getId());
    }

    /** 로그인한 멤버가 참여 중인 프로젝트 편집 데이터 — 관리자 숨김 상태도 포함 */
    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/api/member/projects/{id}")
    public ProjectDetailResponse memberDetail(@PathVariable Long id, Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.getMemberProjectDetail(id, member.getId());
    }

    /** 참여 프로젝트 등록 — 요청 본문의 참여자 목록에 본인이 포함돼 있어야 한다 */
    @PreAuthorize("hasRole('MEMBER')")
    @PostMapping("/api/projects")
    public ResponseEntity<ProjectDetailResponse> create(
            @Valid @RequestBody ProjectCreateRequest request,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(request, member.getId()));
    }

    /** 참여 프로젝트 수정 — 참여자 본인만 */
    @PreAuthorize("hasRole('MEMBER')")
    @PatchMapping("/api/projects/{id}")
    public ProjectDetailResponse update(
            @PathVariable Long id,
            @Valid @RequestBody ProjectUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.update(id, request, member.getId());
    }

    /** 참여 프로젝트 전체 교체 — nullable 필드를 null로 지우는 수정 폼에서 사용 */
    @PreAuthorize("hasRole('MEMBER')")
    @PutMapping("/api/projects/{id}")
    public ProjectDetailResponse replace(
            @PathVariable Long id,
            @Valid @RequestBody ProjectReplaceRequest request,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.replace(id, request, member.getId());
    }

    /** 참여 프로젝트 삭제 — 참여자 본인만 */
    @PreAuthorize("hasRole('MEMBER')")
    @DeleteMapping("/api/projects/{id}")
    public ProjectSuccessResponse delete(@PathVariable Long id, Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        projectService.delete(id, member.getId());
        return new ProjectSuccessResponse();
    }

    /** 문제 있는 프로젝트 숨김/복원 — 관리자 이상 */
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/api/admin/projects/{id}/hidden")
    public ProjectSuccessResponse setHidden(@PathVariable Long id, @Valid @RequestBody ProjectHiddenUpdateRequest request) {
        projectService.setHidden(id, request.getHidden());
        return new ProjectSuccessResponse();
    }
}

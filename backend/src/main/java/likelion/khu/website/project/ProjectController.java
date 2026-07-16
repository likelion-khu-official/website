package likelion.khu.website.project;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.project.dto.ProjectCreateRequest;
import likelion.khu.website.project.dto.ProjectDetailResponse;
import likelion.khu.website.project.dto.ProjectHiddenUpdateRequest;
import likelion.khu.website.project.dto.ProjectImageRequest;
import likelion.khu.website.project.dto.ProjectParticipantRequest;
import likelion.khu.website.project.dto.ProjectSuccessResponse;
import likelion.khu.website.project.dto.ProjectSummaryResponse;
import likelion.khu.website.project.dto.ProjectUpdateRequest;
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
    public List<ProjectSummaryResponse> list() {
        return projectService.getPublicList();
    }

    /** 공개 상세 */
    @GetMapping("/api/projects/{id}")
    public ProjectDetailResponse get(@PathVariable Long id) {
        return projectService.getPublicDetail(id);
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

    /** 참여 프로젝트 삭제 — 참여자 본인만 */
    @PreAuthorize("hasRole('MEMBER')")
    @DeleteMapping("/api/projects/{id}")
    public ProjectSuccessResponse delete(@PathVariable Long id, Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        projectService.delete(id, member.getId());
        return new ProjectSuccessResponse();
    }

    /** 이미지 추가 — 참여자 본인만. representative=true면 기존 대표를 자동 해제 */
    @PreAuthorize("hasRole('MEMBER')")
    @PostMapping("/api/projects/{id}/images")
    public ResponseEntity<ProjectDetailResponse> addImage(
            @PathVariable Long id,
            @Valid @RequestBody ProjectImageRequest request,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.addImage(id, member.getId(), request));
    }

    /** 이미지 삭제 — 참여자 본인만. 대표 이미지를 지워도 막지 않는다(대표 없음 허용) */
    @PreAuthorize("hasRole('MEMBER')")
    @DeleteMapping("/api/projects/{id}/images/{imageId}")
    public ProjectDetailResponse removeImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.removeImage(id, member.getId(), imageId);
    }

    /** 참여자 추가 — 참여자 본인만. 이미 참여 중인 멤버는 거부 */
    @PreAuthorize("hasRole('MEMBER')")
    @PostMapping("/api/projects/{id}/participants")
    public ResponseEntity<ProjectDetailResponse> addParticipant(
            @PathVariable Long id,
            @Valid @RequestBody ProjectParticipantRequest request,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.addParticipant(id, member.getId(), request));
    }

    /** 참여자 삭제 — 참여자면 누구든(본인 포함) 다른 참여자를 뺄 수 있다. 최소 1명은 남아야 함 */
    @PreAuthorize("hasRole('MEMBER')")
    @DeleteMapping("/api/projects/{id}/participants/{participantId}")
    public ProjectDetailResponse removeParticipant(
            @PathVariable Long id,
            @PathVariable Long participantId,
            Authentication authentication) {
        AdminPrincipal member = (AdminPrincipal) authentication.getPrincipal();
        return projectService.removeParticipant(id, member.getId(), participantId);
    }

    /** 문제 있는 프로젝트 숨김/복원 — 관리자 이상 */
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/api/admin/projects/{id}/hidden")
    public ProjectSuccessResponse setHidden(@PathVariable Long id, @Valid @RequestBody ProjectHiddenUpdateRequest request) {
        projectService.setHidden(id, request.getHidden());
        return new ProjectSuccessResponse();
    }
}

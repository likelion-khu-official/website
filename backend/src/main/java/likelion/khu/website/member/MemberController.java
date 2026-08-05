package likelion.khu.website.member;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.auth.dto.MemberSuccessResponse;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberBulkCreateRequest;
import likelion.khu.website.member.dto.MemberBulkCreateResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberProfileReplaceRequest;
import likelion.khu.website.member.dto.MemberResponse;
import likelion.khu.website.member.dto.MemberUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;
    private final MemberAuthService memberAuthService;

    @GetMapping("/api/members")
    public List<MemberResponse> list() {
        return memberService.getAll();
    }

    /** 로그인한 본인의 프로필 — 사진·입부계기 편집 화면의 현재값 프리필용(#285) */
    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/api/members/me")
    public MemberResponse me(Authentication authentication) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return memberService.getSelf(principal.getId());
    }

    /** 본인 프로필 전체 교체 — 사진·입부계기만. null로 지울 수 있다(#285) */
    @PreAuthorize("hasRole('MEMBER')")
    @PutMapping("/api/members/me")
    public MemberResponse updateMe(
            @Valid @RequestBody MemberProfileReplaceRequest request,
            Authentication authentication) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return memberService.updateSelfProfile(principal.getId(), request);
    }

    // 관리자 화면 전용 목록 — 공개 목록과 달리 studentId·오프보딩 상태를 포함한다(#145).
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/members")
    public List<MemberAdminResponse> adminList() {
        return memberService.getAllForAdmin();
    }

    // 위키 "정보구조와 권한" 기준 — 멤버 등록·수정은 모든 관리자가 동일하게 쓰는 공용 권한이다(#145).
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/members")
    public ResponseEntity<MemberAdminResponse> create(
            @Valid @RequestBody MemberCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.create(request, admin.getEmail()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/members/bulk")
    public ResponseEntity<MemberBulkCreateResponse> createBulk(
            @Valid @RequestBody MemberBulkCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        List<MemberAdminResponse> created = memberService.createBulk(request.getMembers(), admin.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MemberBulkCreateResponse.from(created));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/api/admin/members/{id}")
    public MemberAdminResponse update(
            @PathVariable Long id,
            @Valid @RequestBody MemberUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return memberService.update(id, request, admin.getEmail());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/members/{id}/password/reset")
    public MemberSuccessResponse resetPassword(@PathVariable Long id) {
        memberAuthService.resetPasswordByAdmin(id);
        return new MemberSuccessResponse();
    }

    // 오프보딩(소프트 딜리트) — 위키 "정보구조와 권한" 기준 관리자 관리 기능이라 ADMIN 이상(#145).
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/members/{id}/offboard")
    public MemberSuccessResponse offboard(@PathVariable Long id) {
        memberAuthService.offboard(id);
        return new MemberSuccessResponse();
    }
}

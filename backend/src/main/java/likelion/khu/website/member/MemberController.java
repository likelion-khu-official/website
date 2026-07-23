package likelion.khu.website.member;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.auth.dto.MemberSuccessResponse;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
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

    // 관리자 화면 전용 목록 — 공개 목록과 달리 studentId·오프보딩 상태를 포함한다(#145).
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/admin/members")
    public List<MemberAdminResponse> adminList() {
        return memberService.getAllForAdmin();
    }

    // 위키 "정보구조와 권한" 기준 — 멤버 등록·수정도 최고관리자 전용이 아니라 ADMIN 이상 공용 권한이다.
    // 최고관리자만의 배타적 권한은 관리자 임명·회수·승계뿐(#145).
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/api/admin/members")
    public ResponseEntity<MemberAdminResponse> create(
            @Valid @RequestBody MemberCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.create(request, admin.getEmail()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/api/admin/members/{id}")
    public MemberAdminResponse update(
            @PathVariable Long id,
            @Valid @RequestBody MemberUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return memberService.update(id, request, admin.getEmail());
    }

    // 역할-4종 스펙상 "관리자 — 비번 초기화"는 SUPER_ADMIN 전용이 아니라 ADMIN 이상 공용 권한이다.
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/api/admin/members/{id}/password/reset")
    public MemberSuccessResponse resetPassword(@PathVariable Long id) {
        memberAuthService.resetPasswordByAdmin(id);
        return new MemberSuccessResponse();
    }

    // 오프보딩(소프트 딜리트) — 위키 "정보구조와 권한" 기준 관리자 관리 기능이라 ADMIN 이상(#145).
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/api/admin/members/{id}/offboard")
    public MemberSuccessResponse offboard(@PathVariable Long id) {
        memberAuthService.offboard(id);
        return new MemberSuccessResponse();
    }
}

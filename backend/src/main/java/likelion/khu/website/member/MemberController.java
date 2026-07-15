package likelion.khu.website.member;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.auth.dto.MemberSuccessResponse;
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

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/api/admin/members")
    public ResponseEntity<MemberResponse> create(
            @Valid @RequestBody MemberCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.create(request, admin.getEmail()));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PatchMapping("/api/admin/members/{id}")
    public MemberResponse update(
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
}

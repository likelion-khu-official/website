package likelion.khu.website.admin.invitation;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.admin.dto.AdminSuccessResponse;
import likelion.khu.website.admin.invitation.dto.AdminInvitationAcceptRequest;
import likelion.khu.website.admin.invitation.dto.AdminInvitationAcceptResponse;
import likelion.khu.website.admin.invitation.dto.AdminInvitationCreateRequest;
import likelion.khu.website.admin.invitation.dto.AdminInvitationResponse;
import likelion.khu.website.admin.invitation.dto.AdminInvitationVerifyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/invitations")
@RequiredArgsConstructor
public class AdminInvitationController {

    private final AdminInvitationService invitationService;

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<AdminInvitationResponse> invite(
            @Valid @RequestBody AdminInvitationCreateRequest request,
            @AuthenticationPrincipal AdminPrincipal principal) {
        AdminInvitationResponse response = invitationService.invite(request.getEmail(), principal.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping
    public List<AdminInvitationResponse> list() {
        return invitationService.list();
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public AdminSuccessResponse cancel(@PathVariable Long id) {
        invitationService.cancel(id);
        return new AdminSuccessResponse();
    }

    // 가입 전(계정 자체가 없음) — 토큰이 자격증명 역할을 하므로 인증 없이 permitAll()
    @GetMapping("/{token}/verify")
    public AdminInvitationVerifyResponse verify(@PathVariable String token) {
        return invitationService.verify(token);
    }

    @PostMapping("/{token}/accept")
    public ResponseEntity<AdminInvitationAcceptResponse> accept(
            @PathVariable String token,
            @Valid @RequestBody AdminInvitationAcceptRequest request) {
        AdminInvitationAcceptResponse response =
                invitationService.accept(token, request.getName(), request.getPassword());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

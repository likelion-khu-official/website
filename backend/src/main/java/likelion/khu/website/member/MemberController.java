package likelion.khu.website.member;

import jakarta.validation.Valid;
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

    @GetMapping("/api/members")
    public List<MemberResponse> list() {
        return memberService.getAll();
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/api/admin/members")
    public ResponseEntity<MemberResponse> create(
            @Valid @RequestBody MemberCreateRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.create(request, authentication.getName()));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PatchMapping("/api/admin/members/{id}")
    public MemberResponse update(
            @PathVariable Long id,
            @Valid @RequestBody MemberUpdateRequest request,
            Authentication authentication) {
        return memberService.update(id, request, authentication.getName());
    }
}

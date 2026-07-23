package likelion.khu.website.staff;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @GetMapping("/api/staff")
    public List<StaffResponse> list() {
        return staffService.getAll();
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/api/admin/staff")
    public ResponseEntity<StaffResponse> create(
            @Valid @RequestBody StaffCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(staffService.create(request, admin.getEmail()));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PatchMapping("/api/admin/staff/{id}")
    public StaffResponse update(
            @PathVariable Long id,
            @Valid @RequestBody StaffUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return staffService.update(id, request, admin.getEmail());
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/api/admin/staff/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
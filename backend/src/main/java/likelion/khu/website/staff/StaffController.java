package likelion.khu.website.staff;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.staff.dto.StaffAdminResponse;
import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffImageUploadResponse;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;
    private final StaffImageService staffImageService;

    @GetMapping("/api/staff")
    public List<StaffResponse> list() {
        return staffService.getAll();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/staff")
    public List<StaffAdminResponse> adminList() {
        return staffService.getAllForAdmin();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/api/admin/staff/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StaffImageUploadResponse uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        return staffImageService.upload(file);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/staff")
    public ResponseEntity<StaffAdminResponse> create(
            @Valid @RequestBody StaffCreateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(staffService.create(request, admin.getEmail()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/api/admin/staff/{id}")
    public StaffAdminResponse update(
            @PathVariable Long id,
            @Valid @RequestBody StaffUpdateRequest request,
            Authentication authentication) {
        AdminPrincipal admin = (AdminPrincipal) authentication.getPrincipal();
        return staffService.update(id, request, admin.getEmail());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/staff/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

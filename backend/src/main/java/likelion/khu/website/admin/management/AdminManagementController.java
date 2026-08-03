package likelion.khu.website.admin.management;

import likelion.khu.website.admin.dto.AdminSuccessResponse;
import likelion.khu.website.admin.management.dto.AdminSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
public class AdminManagementController {

    private final AdminManagementService managementService;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<AdminSummaryResponse> list() {
        return managementService.list();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public AdminSuccessResponse remove(@PathVariable Long id) {
        managementService.remove(id);
        return new AdminSuccessResponse();
    }
}

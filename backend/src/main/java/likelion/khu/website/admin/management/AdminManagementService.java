package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.auth.AdminAuthService;
import likelion.khu.website.admin.exception.AdminNotFoundException;
import likelion.khu.website.admin.exception.LastSuperAdminException;
import likelion.khu.website.admin.management.dto.AdminRoleUpdateResponse;
import likelion.khu.website.admin.management.dto.AdminSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminManagementService {

    private final AdminRepository adminRepository;
    private final AdminAuthService adminAuthService;

    @Transactional(readOnly = true)
    public List<AdminSummaryResponse> list() {
        return adminRepository.findAll().stream()
                .map(AdminSummaryResponse::from)
                .toList();
    }

    @Transactional
    public void remove(Long id) {
        Admin admin = findById(id);
        guardLastSuperAdmin(admin);
        adminAuthService.revokeAllTokensFor(id);
        adminRepository.delete(admin);
    }

    @Transactional
    public AdminRoleUpdateResponse changeRole(Long id, AdminRole newRole) {
        Admin admin = findById(id);
        if (admin.getRole() == AdminRole.SUPER_ADMIN && newRole != AdminRole.SUPER_ADMIN) {
            guardLastSuperAdmin(admin);
        }
        admin.changeRole(newRole);
        adminAuthService.revokeAllTokensFor(id);
        return AdminRoleUpdateResponse.from(admin);
    }

    // 마지막 SUPER_ADMIN 삭제·강등 금지 — Admin 엔티티가 아니라 여기서 가드(countByRole 리포지토리 조회가 필요해서).
    private void guardLastSuperAdmin(Admin admin) {
        if (admin.getRole() == AdminRole.SUPER_ADMIN && adminRepository.countByRole(AdminRole.SUPER_ADMIN) <= 1) {
            throw new LastSuperAdminException();
        }
    }

    private Admin findById(Long id) {
        return adminRepository.findById(id).orElseThrow(AdminNotFoundException::new);
    }
}

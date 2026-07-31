package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.auth.AdminAuthService;
import likelion.khu.website.admin.exception.AdminNotFoundException;
import likelion.khu.website.admin.exception.LastAdminException;
import likelion.khu.website.admin.management.dto.AdminSummaryResponse;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminManagementService {

    private final AdminRepository adminRepository;
    private final AdminAuthService adminAuthService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<AdminSummaryResponse> list() {
        return adminRepository.findAll().stream()
                .map(AdminSummaryResponse::from)
                .toList();
    }

    @Transactional
    public void remove(Long id) {
        Admin admin = findById(id);
        guardLastAdmin();
        adminAuthService.revokeAllTokensFor(id);
        adminRepository.delete(admin);
        auditService.recordStateChange("관리자 삭제: " + admin.getName() + " (" + admin.getEmail() + ")",
                "ADMIN", id, AuditOutcome.SUCCESS);
    }

    // 마지막 관리자 삭제 금지 — 아무도 로그인할 수 없는 상태가 되는 걸 막는다.
    private void guardLastAdmin() {
        if (adminRepository.count() <= 1) {
            throw new LastAdminException();
        }
    }

    private Admin findById(Long id) {
        return adminRepository.findById(id).orElseThrow(AdminNotFoundException::new);
    }
}

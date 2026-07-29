package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.auth.AdminAuthService;
import likelion.khu.website.admin.exception.AdminNotFoundException;
import likelion.khu.website.admin.exception.HandoverTargetNotAdminException;
import likelion.khu.website.admin.exception.LastSuperAdminException;
import likelion.khu.website.admin.exception.SelfHandoverException;
import likelion.khu.website.admin.management.dto.AdminHandoverResponse;
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

    // 최고관리자 승계(#147) — 승급·강등을 한 트랜잭션에 묶어 "역할변경 두 번" 방식이 갖던
    // 중간에 최고관리자가 0명이 되는 창을 없앤다. SQLite는 커넥션 풀이 1개(single-writer)라
    // 이 트랜잭션이 자연히 직렬화되므로 별도 락 없이도 중간 상태가 다른 요청에 보이지 않는다.
    @Transactional
    public AdminHandoverResponse handover(Long currentAdminId, Long targetAdminId) {
        if (currentAdminId.equals(targetAdminId)) {
            throw new SelfHandoverException();
        }
        Admin current = findById(currentAdminId);
        Admin target = findById(targetAdminId);
        if (target.getRole() != AdminRole.ADMIN) {
            throw new HandoverTargetNotAdminException();
        }

        target.changeRole(AdminRole.SUPER_ADMIN);
        current.changeRole(AdminRole.ADMIN);
        adminAuthService.revokeAllTokensFor(current.getId());
        adminAuthService.revokeAllTokensFor(target.getId());

        return AdminHandoverResponse.of(target, current);
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

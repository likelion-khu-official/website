package likelion.khu.website.staff;

import likelion.khu.website.audit.AuditChanges;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffAdminResponse;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
import likelion.khu.website.storage.OciStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final StaffRepository staffRepository;
    private final AuditService auditService;
    private final OciStorageService storageService;

    @Transactional(readOnly = true)
    public List<StaffResponse> getAll() {
        return staffRepository.findAllByPublicationConsentTrueOrderBySortOrderAscIdAsc().stream()
                .map(StaffResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StaffAdminResponse> getAllForAdmin() {
        return staffRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(StaffAdminResponse::from)
                .toList();
    }

    @Transactional
    public StaffAdminResponse create(StaffCreateRequest request, String createdBy) {
        LocalDateTime consentedAt = validateConsent(
                request.getPublicationConsent(), request.getPublicationConsentedAt()
        );
        Staff staff = Staff.create(
                request.getName(), request.getPosition(), request.getDepartment(), request.getAdmissionYear(),
                request.getPhotoUrl(), request.getIntroduction(), request.getActivities(), request.getSortOrder(),
                request.getStudentId(), request.getPhone(), Boolean.TRUE.equals(request.getPublicationConsent()),
                consentedAt, createdBy
        );
        staffRepository.save(staff);
        String createDetail = new AuditChanges()
                .value("직책", staff.getPosition())
                .value("학과", staff.getDepartment())
                .value("활동 수", staff.getActivities() == null ? 0 : staff.getActivities().size())
                .toDetailOrNull();
        auditService.recordStateChange("운영진 등록: " + staff.getName(), createDetail, "STAFF", staff.getId(), AuditOutcome.SUCCESS);
        return StaffAdminResponse.from(staff);
    }

    @Transactional
    public StaffAdminResponse update(Long id, StaffUpdateRequest request, String updatedBy) {
        Staff staff = findOrThrow(id);
        String beforeName = staff.getName();
        String beforePosition = staff.getPosition();
        String beforeDept = staff.getDepartment();
        String beforeIntro = staff.getIntroduction();
        String beforeActivities = String.valueOf(staff.getActivities());
        boolean beforeConsent = staff.isPublicationConsent();
        if (request.getPublicationConsent() == null && request.getPublicationConsentedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 여부와 동의 시각을 함께 입력해주세요.");
        }
        LocalDateTime consentedAt = request.getPublicationConsent() == null
                ? null
                : validateConsent(request.getPublicationConsent(), request.getPublicationConsentedAt());
        staff.update(
                request.getName(), request.getPosition(), request.getDepartment(), request.getAdmissionYear(),
                request.getPhotoUrl(), request.getIntroduction(), request.getActivities(),
                request.getSortOrder(), request.getStudentId(), request.getPhone(),
                request.getPublicationConsent(), consentedAt, updatedBy
        );
        String updateDetail = new AuditChanges()
                .field("이름", beforeName, staff.getName())
                .field("직책", beforePosition, staff.getPosition())
                .field("학과", beforeDept, staff.getDepartment())
                .masked("소개", beforeIntro, staff.getIntroduction())
                .masked("활동", beforeActivities, String.valueOf(staff.getActivities()))
                .field("게재동의", beforeConsent ? "동의" : "미동의", staff.isPublicationConsent() ? "동의" : "미동의")
                .toDetailOrNull();
        auditService.recordStateChange("운영진 수정: " + staff.getName(), updateDetail, "STAFF", id, AuditOutcome.SUCCESS);
        return StaffAdminResponse.from(staff);
    }

    @Transactional
    public void delete(Long id) {
        Staff staff = findOrThrow(id);
        String photoUrl = staff.getPhotoUrl();
        staffRepository.delete(staff);
        auditService.recordStateChange("운영진 삭제: " + staff.getName(), "STAFF", id, AuditOutcome.SUCCESS);
        storageService.deleteByUrl(photoUrl);
    }

    private Staff findOrThrow(Long id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "운영진을 찾을 수 없어요."));
    }

    private LocalDateTime validateConsent(Boolean consent, LocalDateTime consentedAt) {
        if (Boolean.TRUE.equals(consent) && consentedAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 시각을 입력해주세요.");
        }
        if (!Boolean.TRUE.equals(consent) && consentedAt != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 미동의 상태에는 동의 시각을 입력할 수 없어요.");
        }
        return Boolean.TRUE.equals(consent) ? consentedAt : null;
    }
}

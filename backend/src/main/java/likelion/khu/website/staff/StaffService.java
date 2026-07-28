package likelion.khu.website.staff;

import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffAdminResponse;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
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
        return StaffAdminResponse.from(staff);
    }

    @Transactional
    public StaffAdminResponse update(Long id, StaffUpdateRequest request, String updatedBy) {
        Staff staff = findOrThrow(id);
        if (request.getPublicationConsent() == null && request.getPublicationConsentedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 여부와 동의 시각을 함께 입력해주세요.");
        }
        LocalDateTime consentedAt = request.getPublicationConsent() == null
                ? null
                : validateConsent(request.getPublicationConsent(), request.getPublicationConsentedAt());
        staff.update(
                request.getPosition(), request.getPhotoUrl(), request.getIntroduction(), request.getActivities(),
                request.getSortOrder(), request.getStudentId(), request.getPhone(),
                request.getPublicationConsent(), consentedAt, updatedBy
        );
        return StaffAdminResponse.from(staff);
    }

    @Transactional
    public void delete(Long id) {
        Staff staff = findOrThrow(id);
        staffRepository.delete(staff);
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

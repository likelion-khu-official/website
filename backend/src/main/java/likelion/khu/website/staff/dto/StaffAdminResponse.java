package likelion.khu.website.staff.dto;

import likelion.khu.website.staff.Staff;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 전용 운영진 응답. 연락처는 저장만 하고 응답으로 되돌려주지 않는다.
 */
@Getter
@AllArgsConstructor
public class StaffAdminResponse {
    private Long id;
    private String name;
    private String position;
    private String department;
    private Integer admissionYear;
    private String photoUrl;
    private String introduction;
    private Integer sortOrder;
    private String studentId;
    private boolean publicationConsent;
    private LocalDateTime publicationConsentedAt;

    public static StaffAdminResponse from(Staff staff) {
        return new StaffAdminResponse(
                staff.getId(),
                staff.getName(),
                staff.getPosition(),
                staff.getDepartment(),
                staff.getAdmissionYear(),
                staff.getPhotoUrl(),
                staff.getIntroduction(),
                staff.getSortOrder(),
                staff.getStudentId(),
                staff.isPublicationConsent(),
                staff.getPublicationConsentedAt()
        );
    }
}

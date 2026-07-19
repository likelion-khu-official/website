package likelion.khu.website.staff.dto;

import likelion.khu.website.staff.Staff;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StaffResponse {
    private Long id;
    private String name;
    private String position;
    private String department;
    private Integer admissionYear;
    private String photoUrl;
    private String introduction;
    private Integer sortOrder;

    public static StaffResponse from(Staff staff) {
        return new StaffResponse(
                staff.getId(),
                staff.getName(),
                staff.getPosition(),
                staff.getDepartment(),
                staff.getAdmissionYear(),
                staff.getPhotoUrl(),
                staff.getIntroduction(),
                staff.getSortOrder()
        );
    }
}
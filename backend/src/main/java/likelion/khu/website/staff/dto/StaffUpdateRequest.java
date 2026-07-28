package likelion.khu.website.staff.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class StaffUpdateRequest {

    @Size(min = 1)
    private String position;

    @Size(min = 1)
    private String photoUrl;

    private String introduction;

    // null이면 활동 유지, 값이 오면 통째로 교체.
    private List<String> activities;

    private Integer sortOrder;

    private String studentId;

    private String phone;

    private Boolean publicationConsent;

    private LocalDateTime publicationConsentedAt;
}

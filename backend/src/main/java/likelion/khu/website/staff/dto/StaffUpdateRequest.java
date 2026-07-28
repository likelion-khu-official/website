package likelion.khu.website.staff.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class StaffUpdateRequest {

    @Size(min = 1)
    private String position;

    @Size(min = 1)
    private String photoUrl;

    private String introduction;

    private Integer sortOrder;

    private String studentId;

    private String phone;

    private Boolean publicationConsent;

    private LocalDateTime publicationConsentedAt;
}

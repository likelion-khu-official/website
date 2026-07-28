package likelion.khu.website.staff.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class StaffCreateRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String position;

    @NotBlank
    private String department;

    @NotNull
    private Integer admissionYear;

    @NotBlank
    private String photoUrl;

    private String introduction;

    @NotNull
    private Integer sortOrder;

    private String studentId;

    private String phone;

    private Boolean publicationConsent;

    private LocalDateTime publicationConsentedAt;
}

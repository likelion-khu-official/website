package likelion.khu.website.staff.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

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

    // 운영진 활동 이력. 없으면 빈 목록으로 저장된다.
    private List<String> activities;

    @NotNull
    private Integer sortOrder;

    private String studentId;

    private String phone;

    private Boolean publicationConsent;

    private LocalDateTime publicationConsentedAt;
}

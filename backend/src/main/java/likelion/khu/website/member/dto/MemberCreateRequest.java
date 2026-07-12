package likelion.khu.website.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import likelion.khu.website.member.MemberRole;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class MemberCreateRequest {

    @NotBlank
    private String name;

    @NotEmpty
    private Set<MemberRole> roles;

    @NotNull
    private Integer cohort;

    private String photoUrl;

    private String joinReason;
}

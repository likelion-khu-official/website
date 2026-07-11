package likelion.khu.website.member.dto;

import jakarta.validation.constraints.Size;
import likelion.khu.website.member.MemberRole;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class MemberUpdateRequest {

    @Size(min = 1)
    private String name;
    private Set<MemberRole> roles;
    private String photoUrl;
    private String joinReason;
}

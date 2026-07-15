package likelion.khu.website.project.dto;

import jakarta.validation.constraints.NotNull;
import likelion.khu.website.member.MemberRole;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectParticipantRequest {

    @NotNull
    private Long memberId;

    @NotNull
    private MemberRole part;
}

package likelion.khu.website.project.dto;

import likelion.khu.website.member.MemberRole;
import likelion.khu.website.project.ProjectParticipant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProjectParticipantResponse {
    private Long memberId;
    private String name;
    private MemberRole part;

    public static ProjectParticipantResponse from(ProjectParticipant participant) {
        return new ProjectParticipantResponse(
                participant.getMember().getId(), participant.getMember().getName(), participant.getPart());
    }
}

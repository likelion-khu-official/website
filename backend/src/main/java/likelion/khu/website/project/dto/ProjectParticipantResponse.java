package likelion.khu.website.project.dto;

import likelion.khu.website.member.MemberRole;
import likelion.khu.website.project.ProjectParticipant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProjectParticipantResponse {
    // DELETE /api/projects/{id}/participants/{participantId}가 받는 건 ProjectParticipant
    // 행 id지 memberId가 아니다 — 한 멤버가 여러 프로젝트에 참여하면 memberId만으론 어떤
    // 참여 행을 지울지 특정 못 한다(응답에 없으면 클라이언트가 이 id를 알 방법이 없다).
    private Long id;
    private Long memberId;
    private String name;
    private MemberRole part;

    public static ProjectParticipantResponse from(ProjectParticipant participant) {
        return new ProjectParticipantResponse(
                participant.getId(), participant.getMember().getId(),
                participant.getMember().getName(), participant.getPart());
    }
}

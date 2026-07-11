package likelion.khu.website.member.dto;

import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRole;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Set;

@Getter
@AllArgsConstructor
public class MemberResponse {
    private Long id;
    private String name;
    private Set<MemberRole> roles;
    private Integer cohort;
    private String emoji;
    private String photoUrl;
    private String joinReason;

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getName(),
                member.getRoles(),
                member.getCohort(),
                member.getEmoji(),
                member.getPhotoUrl(),
                member.getJoinReason()
        );
    }
}

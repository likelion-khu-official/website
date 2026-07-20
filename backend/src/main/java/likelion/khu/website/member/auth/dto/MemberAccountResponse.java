package likelion.khu.website.member.auth.dto;

import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MemberAccountResponse {
    private Long id;
    private String studentId;
    private String name;
    private boolean mustChangePassword;

    public static MemberAccountResponse from(Member member) {
        return new MemberAccountResponse(
                member.getId(), member.getStudentId(), member.getName(), member.isMustChangePassword());
    }
}

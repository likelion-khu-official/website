package likelion.khu.website.member.auth.dto;

import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MemberSessionResponse {
    private MemberAccountResponse member;

    public static MemberSessionResponse from(Member member) {
        return new MemberSessionResponse(MemberAccountResponse.from(member));
    }
}

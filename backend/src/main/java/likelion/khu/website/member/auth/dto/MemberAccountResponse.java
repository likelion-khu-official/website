package likelion.khu.website.member.auth.dto;

import likelion.khu.website.admin.auth.JwtProvider;
import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

// admin.dto.AdminAccountResponse와 대칭 — 그쪽은 role을 바디에 내려주는데 여긴 빠져 있어서(#118
// 착수 중 FE 리포트) 멤버/관리자 화면 분기에 쓸 값이 응답 바디 어디에도 없었다. JWT 쿠키 안에는
// role 클레임이 있지만 httpOnly라 FE가 못 읽는다 — 그래서 바디에 별도로 내려줘야 함.
@Getter
@AllArgsConstructor
public class MemberAccountResponse {
    private Long id;
    private String studentId;
    private String name;
    private boolean mustChangePassword;
    private String role;

    public static MemberAccountResponse from(Member member) {
        return new MemberAccountResponse(
                member.getId(), member.getStudentId(), member.getName(),
                member.isMustChangePassword(), JwtProvider.MEMBER_ROLE);
    }
}

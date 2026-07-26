package likelion.khu.website.member.dto;

import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRole;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Set;

// 관리자 전용 응답 — 공개 MemberResponse와 달리 studentId(로그인 아이디)·오프보딩 상태를 담는다.
// phone(초기 비밀번호 원본)은 화면에 보일 이유가 없어 여기서도 노출하지 않는다.
@Getter
@AllArgsConstructor
public class MemberAdminResponse {
    private Long id;
    private String name;
    private Set<MemberRole> roles;
    private Integer cohort;
    private String emoji;
    private String photoUrl;
    private String joinReason;
    private String studentId;
    private boolean offboarded;

    public static MemberAdminResponse from(Member member) {
        return new MemberAdminResponse(
                member.getId(),
                member.getName(),
                member.getRoles(),
                member.getCohort(),
                member.getEmoji(),
                member.getPhotoUrl(),
                member.getJoinReason(),
                member.getStudentId(),
                member.isOffboarded()
        );
    }
}

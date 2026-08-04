package likelion.khu.website.member.dto;

import lombok.Getter;
import lombok.Setter;

// PUT /api/members/me — 본인 프로필 전체 교체(#285). photoUrl·joinReason 둘 다 null이면 지운다.
// 이름·역할·기수·이모지는 의도적으로 필드 자체가 없다 — 요청 본문을 조작해도 바꿀 수 없다.
@Getter
@Setter
public class MemberProfileReplaceRequest {
    private String photoUrl;
    private String joinReason;
}

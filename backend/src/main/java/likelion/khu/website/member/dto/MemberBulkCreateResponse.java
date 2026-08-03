package likelion.khu.website.member.dto;

import java.util.List;

public record MemberBulkCreateResponse(int count, List<MemberAdminResponse> members) {

    public static MemberBulkCreateResponse from(List<MemberAdminResponse> members) {
        return new MemberBulkCreateResponse(members.size(), members);
    }
}

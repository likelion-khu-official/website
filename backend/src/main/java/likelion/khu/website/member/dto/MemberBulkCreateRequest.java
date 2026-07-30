package likelion.khu.website.member.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MemberBulkCreateRequest {

    @NotEmpty(message = "등록할 멤버를 한 명 이상 입력해주세요.")
    private List<MemberCreateRequest> members;
}

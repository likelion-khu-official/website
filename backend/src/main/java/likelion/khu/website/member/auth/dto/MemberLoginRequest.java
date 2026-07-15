package likelion.khu.website.member.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberLoginRequest {

    @NotBlank(message = "학번을 입력해주세요.")
    private String studentId;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String password;
}

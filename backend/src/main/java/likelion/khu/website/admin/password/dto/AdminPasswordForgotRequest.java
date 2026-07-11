package likelion.khu.website.admin.password.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminPasswordForgotRequest {

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "올바른 이메일 형식이 아니에요.")
    private String email;
}

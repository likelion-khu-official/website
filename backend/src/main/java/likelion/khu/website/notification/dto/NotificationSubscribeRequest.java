package likelion.khu.website.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NotificationSubscribeRequest {
    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "유효하지 않은 이메일 형식이에요.")
    private String email;
}

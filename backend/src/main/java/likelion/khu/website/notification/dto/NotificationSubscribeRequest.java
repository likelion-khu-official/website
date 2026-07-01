package likelion.khu.website.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NotificationSubscribeRequest {
    @NotBlank
    @Email
    private String email;
}

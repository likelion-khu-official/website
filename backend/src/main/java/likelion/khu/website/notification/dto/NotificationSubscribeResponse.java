package likelion.khu.website.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NotificationSubscribeResponse {
    private boolean success;
    private String message;
}

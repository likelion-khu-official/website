package likelion.khu.website.notification;

import likelion.khu.website.notification.dto.NotificationSubscribeRequest;
import likelion.khu.website.notification.dto.NotificationSubscribeResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationSubscriptionService service;

    @PostMapping("/subscribe")
    public ResponseEntity<NotificationSubscribeResponse> subscribe(
            @Valid @RequestBody NotificationSubscribeRequest request) {
        return ResponseEntity.ok(service.subscribe(request));
    }
}

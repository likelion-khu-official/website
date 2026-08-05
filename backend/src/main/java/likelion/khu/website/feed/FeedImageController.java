package likelion.khu.website.feed;

import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.feed.dto.FeedImageUploadResponse;
import likelion.khu.website.storage.UploadRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@RestController
@RequestMapping("/api/feed/images")
@RequiredArgsConstructor
public class FeedImageController {

    private final FeedImageService feedImageService;
    private final UploadRateLimiter uploadRateLimiter;

    @PreAuthorize("hasRole('MEMBER')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FeedImageUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        if (!uploadRateLimiter.tryAcquire(principal.getId())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "업로드 요청이 너무 많아요. 잠시 후 다시 시도해주세요.");
        }
        return ResponseEntity.ok(feedImageService.upload(file));
    }
}

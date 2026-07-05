package likelion.khu.website.feed;

import jakarta.validation.Valid;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueResponse;
import likelion.khu.website.feed.dto.MagicLinkTokenStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed/tokens")
@RequiredArgsConstructor
public class MagicLinkTokenController {

    private final MagicLinkTokenService service;

    @PostMapping
    public ResponseEntity<MagicLinkTokenIssueResponse> issue(
            @Valid @RequestBody MagicLinkTokenIssueRequest request) {
        return ResponseEntity.ok(service.issue(request));
    }

    @GetMapping("/{token}")
    public ResponseEntity<MagicLinkTokenStatusResponse> checkStatus(@PathVariable String token) {
        return ResponseEntity.ok(service.checkStatus(token));
    }
}

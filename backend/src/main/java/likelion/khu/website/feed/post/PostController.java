package likelion.khu.website.feed.post;

import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostStatusUpdateRequest;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /** 글 작성 — 매직토큰 1회용 */
    @PostMapping("/api/posts")
    public ResponseEntity<PostDetailResponse> create(
            @RequestHeader("X-Magic-Token") String token,
            @Valid @RequestBody PostCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(token, request));
    }

    /** 공개 목록 — published만 */
    @GetMapping("/api/posts")
    public Page<PostSummaryResponse> list(
            @PageableDefault(size = 10) Pageable pageable) {
        return postService.getPublishedPosts(pageable);
    }

    /** 공개 개별 조회 */
    @GetMapping("/api/posts/{slug}")
    public PostDetailResponse get(@PathVariable String slug) {
        return postService.getPublishedPost(slug);
    }

    // ── 어드민 (인증은 SecurityConfig에서 처리됨, #90/#97) ──────────────────

    /** 전체 목록 */
    @GetMapping("/api/admin/posts")
    public Page<PostSummaryResponse> adminList(
            @PageableDefault(size = 20) Pageable pageable) {
        return postService.getAdminPosts(pageable);
    }

    /** 상태 전이 — draft→published, published→hidden, hidden→published */
    @PatchMapping("/api/admin/posts/{id}/status")
    public PostSummaryResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PostStatusUpdateRequest request) {
        return postService.updateStatus(id, request.getStatus());
    }
}

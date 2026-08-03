package likelion.khu.website.feed.post;

import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostReplaceRequest;
import likelion.khu.website.feed.post.dto.PostStatusUpdateRequest;
import likelion.khu.website.feed.post.dto.PostSuccessResponse;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /** 글 작성 — 로그인 멤버 전용, 작성자는 세션에서 자동 결정 */
    @PreAuthorize("hasRole('MEMBER')")
    @PostMapping("/api/posts")
    public ResponseEntity<PostDetailResponse> create(
            Authentication authentication,
            @Valid @RequestBody PostCreateRequest request) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(principal.getId(), request));
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

    /** 로그인한 멤버가 작성한 글 — 숨김 상태도 포함 */
    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/api/member/posts")
    public Page<PostSummaryResponse> memberList(
            Authentication authentication,
            @PageableDefault(size = 10) Pageable pageable) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return postService.getMemberPosts(principal.getId(), pageable);
    }

    /** 로그인한 멤버가 작성한 글의 편집 데이터 — 숨김 상태도 포함 */
    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/api/member/posts/{id}")
    public PostDetailResponse memberDetail(@PathVariable Long id, Authentication authentication) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return postService.getMemberPost(id, principal.getId());
    }

    /** 본인 글 전체 교체 — null로 요약·썸네일을 지울 수 있다 */
    @PreAuthorize("hasRole('MEMBER')")
    @PutMapping("/api/posts/{id}")
    public PostDetailResponse replace(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody PostReplaceRequest request) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        return postService.replacePost(id, principal.getId(), request);
    }

    /** 본인 글과 댓글을 함께 하드 삭제 */
    @PreAuthorize("hasRole('MEMBER')")
    @DeleteMapping("/api/posts/{id}")
    public PostSuccessResponse delete(@PathVariable Long id, Authentication authentication) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        postService.deletePost(id, principal.getId());
        return new PostSuccessResponse();
    }

    // ── 어드민 (인증은 SecurityConfig에서 처리됨, #90/#97) ──────────────────
    // SecurityConfig의 "/api/admin/posts/**" matcher는 .authenticated()까지만 걸어줘서,
    // MEMBER 로그인(#117) 도입 이후엔 role 체크를 여기서 직접 해야 일반 멤버를 막을 수 있다
    // (문제 글 숨김은 위키 역할표상 관리자 이상 전용).

    /** 전체 목록 */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/posts")
    public Page<PostSummaryResponse> adminList(
            @PageableDefault(size = 20) Pageable pageable) {
        return postService.getAdminPosts(pageable);
    }

    /** 상태 전이 — draft→published, published→hidden, hidden→published */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/api/admin/posts/{id}/status")
    public PostSummaryResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PostStatusUpdateRequest request) {
        return postService.updateStatus(id, request.getStatus());
    }
}

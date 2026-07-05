package likelion.khu.website.feed.post;

import likelion.khu.website.feed.MagicLinkTokenService;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MagicLinkTokenService magicLinkTokenService;

    @Transactional
    public PostDetailResponse createPost(String magicToken, PostCreateRequest request) {
        String authorName = magicLinkTokenService.consume(magicToken);
        String slug = generateSlug();
        Post post = Post.create(slug, request.getTitle(), request.getSummary(), request.getContent(), authorName, request.getThumbnailUrl());
        postRepository.save(post);
        return PostDetailResponse.from(post, 0);
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryResponse> getPublishedPosts(Pageable pageable) {
        return postRepository
                .findByStatusOrderByPublishedAtDesc(PostStatus.PUBLISHED, pageable)
                .map(PostSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getPublishedPost(String slug) {
        Post post = postRepository.findBySlugAndStatus(slug, PostStatus.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요."));
        return PostDetailResponse.from(post, 0);
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryResponse> getAdminPosts(Pageable pageable) {
        return postRepository.findAll(pageable).map(PostSummaryResponse::from);
    }

    @Transactional
    public PostSummaryResponse updateStatus(Long id, PostStatus status) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요."));
        post.transitionTo(status);
        return PostSummaryResponse.from(post);
    }

    private String generateSlug() {
        String slug;
        do {
            slug = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        } while (postRepository.existsBySlug(slug));
        return slug;
    }
}

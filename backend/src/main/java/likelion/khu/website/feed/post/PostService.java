package likelion.khu.website.feed.post;

import likelion.khu.website.audit.AuditChanges;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.feed.comment.CommentRepository;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostReplaceRequest;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import likelion.khu.website.feed.post.exception.NotPostAuthorException;
import likelion.khu.website.feed.post.exception.PostNotFoundException;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import likelion.khu.website.member.exception.MemberNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final MemberRepository memberRepository;
    private final AuditService auditService;

    @Transactional
    public PostDetailResponse createPost(Long memberId, PostCreateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(MemberNotFoundException::new);
        String authorName = member.getName();
        List<String> authorParts = member.getRoles().stream()
                .sorted(Comparator.comparing(MemberRole::name))
                .map(MemberRole::name)
                .toList();
        String slug = generateSlug();
        Post post = Post.create(slug, request.getTitle(), request.getSummary(), request.getContent(),
                authorName, authorParts, memberId, request.getThumbnailUrl());
        postRepository.save(post);
        auditService.recordStateChange("블로그 글 작성: " + request.getTitle(), "POST", post.getId(), AuditOutcome.SUCCESS);
        return PostDetailResponse.from(post, member, 0);
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryResponse> getPublishedPosts(Pageable pageable) {
        return toSummaryPage(
                postRepository.findByStatusOrderByPublishedAtDesc(PostStatus.PUBLISHED, pageable));
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getPublishedPost(String slug) {
        Post post = postRepository.findBySlugAndStatus(slug, PostStatus.PUBLISHED)
                .orElseThrow(PostNotFoundException::new);
        long commentCount = commentRepository.countByPostIdAndHiddenFalse(post.getId());
        return PostDetailResponse.from(post, findAuthor(post), commentCount);
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryResponse> getMemberPosts(Long memberId, Pageable pageable) {
        return toSummaryPage(postRepository.findByAuthorMemberIdOrderByCreatedAtDesc(memberId, pageable));
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getMemberPost(Long id, Long memberId) {
        Post post = findPostOrThrow(id);
        requireAuthor(post, memberId);
        long commentCount = commentRepository.countByPostIdAndHiddenFalse(post.getId());
        return PostDetailResponse.from(post, findAuthor(post), commentCount);
    }

    @Transactional
    public PostDetailResponse replacePost(Long id, Long memberId, PostReplaceRequest request) {
        Post post = findPostOrThrow(id);
        requireAuthor(post, memberId);
        post.replace(request.getTitle(), request.getSummary(), request.getContent(), request.getThumbnailUrl());
        auditService.recordStateChange("블로그 글 수정: " + request.getTitle(), "POST", id, AuditOutcome.SUCCESS);
        long commentCount = commentRepository.countByPostIdAndHiddenFalse(post.getId());
        return PostDetailResponse.from(post, findAuthor(post), commentCount);
    }

    @Transactional
    public void deletePost(Long id, Long memberId) {
        Post post = findPostOrThrow(id);
        requireAuthor(post, memberId);
        commentRepository.deleteAllByPostId(id);
        postRepository.delete(post);
        auditService.recordStateChange("블로그 글 삭제: " + post.getTitle(), "POST", id, AuditOutcome.SUCCESS);
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryResponse> getAdminPosts(Pageable pageable) {
        return toSummaryPage(postRepository.findAll(pageable));
    }

    @Transactional
    public PostSummaryResponse updateStatus(Long id, PostStatus status) {
        Post post = findPostOrThrow(id);
        PostStatus before = post.getStatus();
        post.transitionTo(status);
        String detail = new AuditChanges().field("상태", before, post.getStatus()).toDetailOrNull();
        auditService.recordStateChange("블로그 글 상태 변경: " + post.getTitle(), detail, "POST", id, AuditOutcome.SUCCESS);
        return PostSummaryResponse.from(post, findAuthor(post));
    }

    private Page<PostSummaryResponse> toSummaryPage(Page<Post> posts) {
        Set<Long> authorIds = posts.stream()
                .map(Post::getAuthorMemberId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, Member> authors = new HashMap<>();
        memberRepository.findAllById(authorIds).forEach(member -> authors.put(member.getId(), member));
        return posts.map(post -> PostSummaryResponse.from(post, authors.get(post.getAuthorMemberId())));
    }

    private Member findAuthor(Post post) {
        if (post.getAuthorMemberId() == null) {
            return null;
        }
        return memberRepository.findById(post.getAuthorMemberId()).orElse(null);
    }

    private Post findPostOrThrow(Long id) {
        return postRepository.findById(id)
                .orElseThrow(PostNotFoundException::new);
    }

    private void requireAuthor(Post post, Long memberId) {
        if (post.getAuthorMemberId() == null || !post.getAuthorMemberId().equals(memberId)) {
            throw new NotPostAuthorException();
        }
    }

    private String generateSlug() {
        String slug;
        do {
            slug = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        } while (postRepository.existsBySlug(slug));
        return slug;
    }
}

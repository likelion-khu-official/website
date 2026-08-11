package likelion.khu.website.feed.post;

import likelion.khu.website.audit.AuditChanges;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.discord.SiteContentPublishedEvent;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
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
    private final ApplicationEventPublisher eventPublisher;

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
        List<PostCoauthorSnapshot> coauthors = resolveCoauthors(
                memberId, request.getCoauthorMemberIds(), List.of());
        Post post = Post.create(slug, request.getTitle(), request.getSummary(), request.getContent(),
                authorName, authorParts, memberId, coauthors, request.getThumbnailUrl());
        postRepository.save(post);
        auditService.recordStateChange("블로그 글 작성: " + request.getTitle(), "POST", post.getId(), AuditOutcome.SUCCESS);
        // 멤버가 글을 쓰면 곧바로 PUBLISHED(Post.create)라, 작성 = 최초 공개. 디스코드 채널에 알린다.
        eventPublisher.publishEvent(
                SiteContentPublishedEvent.blog(post.getTitle(), post.getSummary(), post.getSlug(), authorName));
        return toDetail(post, member, 0, true);
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
        return toDetail(post, findAuthor(post), commentCount, false);
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
        return toDetail(post, findAuthor(post), commentCount, true);
    }

    @Transactional
    public PostDetailResponse replacePost(Long id, Long memberId, PostReplaceRequest request) {
        Post post = findPostOrThrow(id);
        requireAuthor(post, memberId);
        List<PostCoauthorSnapshot> coauthors = resolveCoauthors(
                memberId, request.getCoauthorMemberIds(), post.getCoauthors());
        post.replace(request.getTitle(), request.getSummary(), request.getContent(),
                coauthors, request.getThumbnailUrl());
        auditService.recordStateChange("블로그 글 수정: " + request.getTitle(), "POST", id, AuditOutcome.SUCCESS);
        long commentCount = commentRepository.countByPostIdAndHiddenFalse(post.getId());
        return toDetail(post, findAuthor(post), commentCount, true);
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
        // 최초 공개인지 전이 "전에" 판정한다 — transitionTo가 publishedAt을 세팅해버리기 때문.
        // DRAFT→PUBLISHED(publishedAt==null)만 최초 공개고, 숨김→다시 공개(HIDDEN→PUBLISHED)는
        // 이미 publishedAt이 있어 재공지하지 않는다(같은 글 반복 알림 방지).
        boolean firstPublish = status == PostStatus.PUBLISHED && post.getPublishedAt() == null;
        post.transitionTo(status);
        String detail = new AuditChanges().field("상태", before, post.getStatus()).toDetailOrNull();
        auditService.recordStateChange("블로그 글 상태 변경: " + post.getTitle(), detail, "POST", id, AuditOutcome.SUCCESS);
        if (firstPublish) {
            eventPublisher.publishEvent(
                    SiteContentPublishedEvent.blog(post.getTitle(), post.getSummary(), post.getSlug(), post.getAuthorName()));
        }
        Map<Long, Member> members = findMembersForPosts(List.of(post));
        return PostSummaryResponse.from(post, members.get(post.getAuthorMemberId()), members);
    }

    private Page<PostSummaryResponse> toSummaryPage(Page<Post> posts) {
        Map<Long, Member> members = findMembersForPosts(posts.getContent());
        return posts.map(post -> PostSummaryResponse.from(
                post, members.get(post.getAuthorMemberId()), members));
    }

    private PostDetailResponse toDetail(
            Post post, Member author, long commentCount, boolean includeSelectionIds) {
        Map<Long, Member> members = findMembersForPosts(List.of(post));
        return PostDetailResponse.from(post, author, members, commentCount, includeSelectionIds);
    }

    private Map<Long, Member> findMembersForPosts(List<Post> posts) {
        Set<Long> memberIds = posts.stream()
                .flatMap(post -> {
                    List<Long> ids = new ArrayList<>();
                    if (post.getAuthorMemberId() != null) ids.add(post.getAuthorMemberId());
                    post.getCoauthors().stream().map(PostCoauthorSnapshot::memberId).forEach(ids::add);
                    return ids.stream();
                })
                .collect(Collectors.toSet());
        Map<Long, Member> members = new HashMap<>();
        memberRepository.findAllById(memberIds)
                .forEach(member -> members.put(member.getId(), member));
        return members;
    }

    private List<PostCoauthorSnapshot> resolveCoauthors(
            Long ownerId, List<Long> requestedIds, List<PostCoauthorSnapshot> existing) {
        if (requestedIds == null || requestedIds.isEmpty()) return List.of();

        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>();
        for (Long id : requestedIds) {
            if (id == null || id.equals(ownerId) || !uniqueIds.add(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공동저자 선택을 확인해 주세요.");
            }
        }

        Map<Long, PostCoauthorSnapshot> existingById = existing.stream()
                .collect(Collectors.toMap(PostCoauthorSnapshot::memberId, snapshot -> snapshot));
        Set<Long> newIds = uniqueIds.stream()
                .filter(id -> !existingById.containsKey(id))
                .collect(Collectors.toSet());
        Map<Long, Member> newMembers = new HashMap<>();
        memberRepository.findAllById(newIds)
                .forEach(member -> newMembers.put(member.getId(), member));

        return uniqueIds.stream().map(id -> {
            PostCoauthorSnapshot preserved = existingById.get(id);
            if (preserved != null) return preserved;

            Member member = newMembers.get(id);
            if (member == null || member.isOffboarded() || !member.isPublicationConsent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택할 수 없는 공동저자가 포함돼 있어요.");
            }
            List<String> parts = member.getRoles().stream()
                    .sorted(Comparator.comparing(MemberRole::name))
                    .map(MemberRole::name)
                    .toList();
            return new PostCoauthorSnapshot(member.getId(), member.getName(), parts);
        }).toList();
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

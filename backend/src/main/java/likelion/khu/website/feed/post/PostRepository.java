package likelion.khu.website.feed.post;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByStatusOrderByPublishedAtDesc(PostStatus status, Pageable pageable);
    Optional<Post> findBySlugAndStatus(String slug, PostStatus status);
    boolean existsBySlug(String slug);
}

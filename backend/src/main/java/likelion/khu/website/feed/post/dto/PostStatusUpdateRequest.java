package likelion.khu.website.feed.post.dto;

import jakarta.validation.constraints.NotNull;
import likelion.khu.website.feed.post.PostStatus;
import lombok.Getter;

@Getter
public class PostStatusUpdateRequest {
    @NotNull
    private PostStatus status;
}

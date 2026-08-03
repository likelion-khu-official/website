package likelion.khu.website.feed.comment.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentVisibilityRequest {
    private boolean hidden;

    @Size(max = 300)
    private String reason;
}

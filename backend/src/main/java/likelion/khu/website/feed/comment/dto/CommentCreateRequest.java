package likelion.khu.website.feed.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class CommentCreateRequest {

    @Size(max = 50)
    private String nickname;

    @NotBlank @Size(max = 300)
    private String content;
}

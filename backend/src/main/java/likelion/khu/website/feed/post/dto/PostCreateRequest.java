package likelion.khu.website.feed.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PostCreateRequest {

    @NotBlank @Size(max = 200)
    private String title;

    @Size(max = 200)
    private String summary;

    @NotBlank
    private String content;

    private String thumbnailUrl;
}

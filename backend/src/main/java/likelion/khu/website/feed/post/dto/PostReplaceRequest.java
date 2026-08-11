package likelion.khu.website.feed.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PostReplaceRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 200)
    private String summary;

    @NotBlank
    private String content;

    private String thumbnailUrl;

    /** 표시용 공동저자 전체 교체 목록. */
    private List<Long> coauthorMemberIds;
}

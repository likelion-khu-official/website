package likelion.khu.website.feed.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

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

    /** 표시용 공동저자. 글 소유자와 수정·삭제 권한은 로그인한 작성자 한 명에게만 있다. */
    private List<Long> coauthorMemberIds;
}

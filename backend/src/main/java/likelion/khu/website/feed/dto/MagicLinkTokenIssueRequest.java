package likelion.khu.website.feed.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MagicLinkTokenIssueRequest {
    @NotBlank(message = "작성자 이름을 입력해주세요.")
    private String authorName;
}

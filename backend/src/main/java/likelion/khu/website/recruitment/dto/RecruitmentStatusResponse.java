package likelion.khu.website.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecruitmentStatusResponse {
    private boolean open;
    private long subscriberCount;
}

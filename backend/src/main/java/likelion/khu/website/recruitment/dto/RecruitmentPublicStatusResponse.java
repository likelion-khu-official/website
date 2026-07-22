package likelion.khu.website.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 공개 방문자용 — 관리자용 RecruitmentStatusResponse와 달리 subscriberCount는 담지 않는다(#151).
@Getter
@AllArgsConstructor
public class RecruitmentPublicStatusResponse {
    private boolean open;
}

package likelion.khu.website.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 공개(비로그인) 모집 상태 — 방문자가 지원폼(열림)/모집 알림(닫힘) 중 무엇을 볼지 결정하는
// 데만 쓴다. 관리 정보(구독자 수 등)는 담지 않는다(#152).
@Getter
@AllArgsConstructor
public class RecruitmentPublicStatusResponse {
    private boolean open;
}

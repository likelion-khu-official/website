package likelion.khu.website.feed.post;

import java.util.List;

/**
 * 글에 표시할 공동저자 정보의 작성 시점 스냅샷.
 * memberId는 현재 프로필을 붙이는 연결 키일 뿐, 글의 수정·삭제 권한에는 쓰지 않는다.
 */
public record PostCoauthorSnapshot(
        Long memberId,
        String name,
        List<String> parts
) {
}

package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.PostCoauthorSnapshot;
import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class PostBylineResponse {
    private Long memberId;
    private String name;
    private List<String> parts;
    private String emoji;
    private String photoUrl;

    public static PostBylineResponse from(PostCoauthorSnapshot snapshot, Member member) {
        boolean showProfile = member != null && member.isPublicationConsent();
        return new PostBylineResponse(
                showProfile ? snapshot.memberId() : null,
                snapshot.name(), snapshot.parts(),
                showProfile ? member.getEmoji() : null,
                showProfile ? member.getPhotoUrl() : null
        );
    }
}

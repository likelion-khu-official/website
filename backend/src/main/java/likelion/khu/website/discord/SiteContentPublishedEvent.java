package likelion.khu.website.discord;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

// 공개 사이트에 새 콘텐츠가 "처음" 공개됐을 때 나가는 도메인 이벤트.
// PostService·ProjectService가 커밋되는 트랜잭션 안에서 발행하고, DiscordAnnouncementListener가
// 커밋 이후(AFTER_COMMIT) 별도 스레드에서 embed로 만들어 디스코드 웹훅으로 보낸다.
//
// 왜 도메인 엔티티(Post/Project)가 아니라 이 값만 담아 옮기냐면 — 리스너는 @Async라 트랜잭션·영속성
// 컨텍스트 밖에서 돈다. 엔티티를 넘기면 지연 로딩·detached 문제가 생기므로, 임베드에 필요한 순수 값만
// 이 시점에 뽑아 담는다(EmailLogEvent와 같은 이유).
public record SiteContentPublishedEvent(
        Kind kind,
        String title,
        String summary,
        String path,          // 공개 사이트 기준 상대 경로 — 리스너가 public-site-url을 앞에 붙인다
        List<Meta> meta,      // embed 하단 인라인 필드(글쓴이 / 기수·팀원·기술 등)
        String thumbnailUrl   // nullable — 있으면 embed 우상단 썸네일
) {

    public enum Kind {
        BLOG("새 블로그 글"),
        PROJECT("새 프로젝트");

        private final String label;

        Kind(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public record Meta(String name, String value) {}

    public static SiteContentPublishedEvent blog(String title, String summary, String slug, String authorName) {
        return new SiteContentPublishedEvent(
                Kind.BLOG, title, summary, "/blog/" + slug,
                List.of(new Meta("글쓴이", authorName)), null);
    }

    public static SiteContentPublishedEvent project(String title, String summary, Long id, Integer cohort,
                                                    int teamSize, Collection<String> techStack, String thumbnailUrl) {
        List<Meta> meta = new ArrayList<>();
        if (cohort != null) {
            meta.add(new Meta("기수", cohort + "기"));
        }
        meta.add(new Meta("팀원", teamSize + "명"));
        if (techStack != null && !techStack.isEmpty()) {
            meta.add(new Meta("기술", String.join(" · ", techStack)));
        }
        return new SiteContentPublishedEvent(Kind.PROJECT, title, summary, "/projects/" + id, meta, thumbnailUrl);
    }
}

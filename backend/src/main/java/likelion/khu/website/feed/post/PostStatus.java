package likelion.khu.website.feed.post;

public enum PostStatus {
    DRAFT, PUBLISHED, HIDDEN;

    public boolean canTransitionTo(PostStatus next) {
        return switch (this) {
            case DRAFT -> next == PUBLISHED;
            case PUBLISHED -> next == HIDDEN;
            case HIDDEN -> next == PUBLISHED;
        };
    }
}

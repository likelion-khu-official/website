package likelion.khu.website.analytics;

import lombok.Getter;

@Getter
public enum AnalyticsEventKey {
    PROJECT(AnalyticsEventType.SECTION_REACH, null, null),
    STAFF(AnalyticsEventType.SECTION_REACH, null, null),
    BLOG(AnalyticsEventType.SECTION_REACH, null, null),
    RECRUIT(AnalyticsEventType.SECTION_REACH, null, null),

    APPLY_LANDING_RECRUIT(AnalyticsEventType.KEY_CLICK, KeyClickAction.APPLY, KeyClickLocation.LANDING_RECRUIT),
    APPLY_APPLICATION_FORM(AnalyticsEventType.KEY_CLICK, KeyClickAction.APPLY, KeyClickLocation.APPLICATION_FORM),
    NOTIFICATION_LANDING_RECRUIT(AnalyticsEventType.KEY_CLICK, KeyClickAction.NOTIFICATION, KeyClickLocation.LANDING_RECRUIT),
    NOTIFICATION_APPLICATION_CLOSED(AnalyticsEventType.KEY_CLICK, KeyClickAction.NOTIFICATION, KeyClickLocation.APPLICATION_CLOSED),
    BLOG_MORE_LANDING_BLOG(AnalyticsEventType.KEY_CLICK, KeyClickAction.BLOG_MORE, KeyClickLocation.LANDING_BLOG),
    PROJECT_MORE_LANDING_PROJECT(AnalyticsEventType.KEY_CLICK, KeyClickAction.PROJECT_MORE, KeyClickLocation.LANDING_PROJECT),
    PROJECT_GITHUB_PROJECT_DETAIL(AnalyticsEventType.KEY_CLICK, KeyClickAction.PROJECT_GITHUB, KeyClickLocation.PROJECT_DETAIL);

    private final AnalyticsEventType eventType;
    private final KeyClickAction action;
    private final KeyClickLocation location;

    AnalyticsEventKey(AnalyticsEventType eventType, KeyClickAction action, KeyClickLocation location) {
        this.eventType = eventType;
        this.action = action;
        this.location = location;
    }
}

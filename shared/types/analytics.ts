export type AnalyticsInterval = 'day' | 'week' | 'month';

export interface AnalyticsDateRange {
  from: string;
  to: string;
  interval: AnalyticsInterval;
  timezone: 'Asia/Seoul';
}

export interface AnalyticsTimePoint {
  date: string;
  views: number;
}

export interface AnalyticsVisitorTimePoint {
  date: string;
  visitors: number;
}

export interface AnalyticsPageTotal {
  path: string;
  views: number;
}

export interface AnalyticsPageViewResponse {
  range: AnalyticsDateRange;
  totalViews: number;
  series: AnalyticsTimePoint[];
  pages: AnalyticsPageTotal[];
}

export interface AnalyticsPageViewQuery {
  from: string;
  to: string;
  interval: AnalyticsInterval;
  page?: string;
  blogPostId?: number;
  projectId?: number;
  clickAction?: KeyClickAction;
}

export type AnalyticsPostStatus = 'PUBLISHED' | 'HIDDEN';

export interface BlogAnalyticsPostTotal {
  id: number;
  slug: string;
  title: string;
  status: AnalyticsPostStatus;
  publishedAt: string | null;
  views: number;
}

export interface BlogAnalyticsResponse {
  range: AnalyticsDateRange;
  totalViews: number;
  series: AnalyticsTimePoint[];
  posts: BlogAnalyticsPostTotal[];
}

export interface ProjectAnalyticsTotal {
  id: number;
  title: string;
  cohort: number;
  hidden: boolean;
  createdAt: string;
  views: number;
}

export interface ProjectAnalyticsResponse {
  range: AnalyticsDateRange;
  totalViews: number;
  series: AnalyticsTimePoint[];
  projects: ProjectAnalyticsTotal[];
}

export type RecruitmentAnalyticsState = 'OPEN' | 'CLOSED' | 'NONE';

export interface RecruitmentAnalyticsResponse {
  roundId: number | null;
  state: RecruitmentAnalyticsState;
  openedAt: string | null;
  closedAt: string | null;
  applicationCount: number;
}

export interface VisitorAnalyticsResponse {
  range: AnalyticsDateRange;
  uniqueVisitors: number;
  series: AnalyticsVisitorTimePoint[];
}

export type AnalyticsDeviceType = 'MOBILE' | 'DESKTOP' | 'OTHER';

export interface DeviceAnalyticsTotal {
  device: AnalyticsDeviceType;
  views: number;
  percentage: number;
}

export interface DeviceAnalyticsResponse {
  range: AnalyticsDateRange;
  totalViews: number;
  devices: DeviceAnalyticsTotal[];
}

export type LandingSectionKey = 'PROJECT' | 'STAFF' | 'BLOG' | 'RECRUIT';

export interface SectionReachTotal {
  section: LandingSectionKey;
  reaches: number;
}

export interface SectionReachAnalyticsResponse {
  range: AnalyticsDateRange;
  sections: SectionReachTotal[];
}

export type KeyClickAction = 'APPLY' | 'NOTIFICATION' | 'BLOG_MORE' | 'PROJECT_MORE' | 'PROJECT_GITHUB';
export type KeyClickLocation =
  | 'LANDING_RECRUIT'
  | 'APPLICATION_FORM'
  | 'APPLICATION_CLOSED'
  | 'LANDING_BLOG'
  | 'LANDING_PROJECT'
  | 'PROJECT_DETAIL';

export interface KeyClickTimePoint {
  date: string;
  clicks: number;
}

export interface KeyClickTotal {
  action: KeyClickAction;
  location: KeyClickLocation;
  clicks: number;
}

export interface KeyClickAnalyticsResponse {
  range: AnalyticsDateRange;
  totalClicks: number;
  series: KeyClickTimePoint[];
  clicks: KeyClickTotal[];
}

export interface NotificationSignupTimePoint {
  date: string;
  signups: number;
}

export interface NotificationSignupAnalyticsResponse {
  range: AnalyticsDateRange;
  totalSignups: number;
  series: NotificationSignupTimePoint[];
}

export type AnalyticsWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface PopularHourTotal {
  hour: number;
  views: number;
}

export interface PopularWeekdayTotal {
  day: AnalyticsWeekday;
  views: number;
}

export interface PopularTimeAnalyticsResponse {
  range: AnalyticsDateRange;
  totalViews: number;
  hours: PopularHourTotal[];
  weekdays: PopularWeekdayTotal[];
}

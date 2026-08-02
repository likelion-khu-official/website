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

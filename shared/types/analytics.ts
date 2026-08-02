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
}


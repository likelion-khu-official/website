import { describe, expect, it } from 'vitest';
import type { PostSummary } from '@shared/types/feed';
import type { ProjectDetail, ProjectSummary } from '@shared/types/project';
import { groupMemberActivities } from './memberActivity';

const post: PostSummary = {
  id: 10,
  slug: 'recent-post',
  title: '최근 블로그 글',
  summary: '글 요약',
  thumbnailUrl: null,
  authorName: '김멋사',
  authorMemberId: 7,
  authorPart: ['FRONTEND'],
  authorEmoji: '🦁',
  authorPhotoUrl: null,
  status: 'PUBLISHED',
  publishedAt: '2026-08-03T10:00:00+09:00',
  createdAt: '2026-08-02T10:00:00+09:00',
};

const projectSummary: ProjectSummary = {
  id: 20,
  title: '멋사 홈페이지',
  summary: '프로젝트 요약',
  representativeImageUrl: null,
  cohort: 14,
  techStack: ['Next.js'],
  createdAt: '2026-08-04T10:00:00+09:00',
};

const projectDetail: ProjectDetail = {
  id: 20,
  title: '멋사 홈페이지',
  summary: '프로젝트 요약',
  images: [],
  participants: [
    { memberId: 7, name: '김멋사', part: 'FRONTEND' },
    { memberId: 8, name: '이사자', part: 'BACKEND' },
  ],
  cohort: 14,
  startDate: '2026-07-01',
  endDate: null,
  techStack: ['Next.js'],
  githubUrl: null,
  hidden: false,
};

describe('groupMemberActivities', () => {
  it('블로그와 프로젝트를 멤버별로 묶고 실제 활동 시각 최신순으로 정렬한다', () => {
    const result = groupMemberActivities([post], [{ summary: projectSummary, detail: projectDetail }]);

    expect(result[7].map((activity) => activity.id)).toEqual(['blog-10', 'project-20']);
    expect(result[8].map((activity) => activity.id)).toEqual(['project-20']);
  });

  it('시작일이 없는 프로젝트는 등록일을 정렬 기준으로 사용한다', () => {
    const result = groupMemberActivities([], [
      { summary: projectSummary, detail: { ...projectDetail, startDate: null } },
    ]);

    expect(result[7][0].occurredAt).toBe(projectSummary.createdAt);
  });

  it('안전한 작성자 ID가 없는 과거 글은 이름으로 추측해 연결하지 않는다', () => {
    const result = groupMemberActivities([{ ...post, authorMemberId: null }], []);
    expect(result).toEqual({});
  });
});

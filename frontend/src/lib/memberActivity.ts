import type { PostSummary } from '@shared/types/feed';
import type { ProjectDetail, ProjectSummary } from '@shared/types/project';

export type MemberActivityKind = 'BLOG' | 'PROJECT';

export type MemberActivity = {
  id: string;
  kind: MemberActivityKind;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  href: string;
  occurredAt: string;
};

export type ProjectWithDetail = {
  summary: ProjectSummary;
  detail: ProjectDetail;
};

export type ActivitiesByMember = Record<number, MemberActivity[]>;

function append(
  activities: ActivitiesByMember,
  memberId: number,
  activity: MemberActivity,
) {
  (activities[memberId] ??= []).push(activity);
}

/**
 * 공개 글과 프로젝트를 멤버 ID로 묶는다. 이름으로 연결하지 않는 이유는 동명이인과
 * 이름 변경에 안전하지 않기 때문이다. 블로그는 소유자뿐 아니라 공개 바이라인에 오른
 * 공동저자의 프로필 활동에도 같은 글을 넣되, ID가 공개되지 않은 작성자는 건너뛴다.
 */
export function groupMemberActivities(
  posts: PostSummary[],
  projects: ProjectWithDetail[],
): ActivitiesByMember {
  const activities: ActivitiesByMember = {};

  for (const post of posts) {
    const activity: MemberActivity = {
      id: `blog-${post.id}`,
      kind: 'BLOG',
      title: post.title,
      summary: post.summary,
      imageUrl: post.thumbnailUrl,
      href: `/blog/${post.slug}`,
      occurredAt: post.publishedAt ?? post.createdAt,
    };
    const creditedMemberIds = new Set([
      post.authorMemberId,
      ...(post.coauthors ?? []).map((coauthor) => coauthor.memberId),
    ]);
    for (const memberId of creditedMemberIds) {
      if (memberId !== null) append(activities, memberId, activity);
    }
  }

  for (const { summary, detail } of projects) {
    const activity: MemberActivity = {
      id: `project-${summary.id}`,
      kind: 'PROJECT',
      title: summary.title,
      summary: summary.summary,
      imageUrl: summary.representativeImageUrl,
      href: `/projects/${summary.id}`,
      // 실제 활동 시점을 우선하고, 기간을 입력하지 않은 프로젝트만 등록일로 보완한다.
      occurredAt: detail.startDate ?? summary.createdAt,
    };

    for (const participant of detail.participants) {
      append(activities, participant.memberId, activity);
    }
  }

  for (const memberActivities of Object.values(activities)) {
    memberActivities.sort((left, right) => {
      const byDate = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
      return byDate || right.id.localeCompare(left.id);
    });
  }

  return activities;
}

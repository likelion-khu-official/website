import type { PostSummary } from '@shared/types/feed';
import { getPosts } from './feedApi';
import { getProjects, getProjectById } from './projectApi';
import {
  groupMemberActivities,
  type ActivitiesByMember,
  type ProjectWithDetail,
} from './memberActivity';

const POST_PAGE_SIZE = 100;

// 프로젝트 목록엔 참여자가 없으므로 상세를 함께 불러와 멤버별 활동에 연결한다.
// 20명 안팎인 현재 규모에서는 별도 활동 API를 추가하는 것보다 기존 공개 계약을 조합하는 편이 단순하다.
export async function getProjectsWithDetails(baseUrl = ''): Promise<ProjectWithDetail[]> {
  const summaries = await getProjects(baseUrl);
  const details = await Promise.all(summaries.map((project) => getProjectById(project.id, baseUrl)));
  return details.flatMap((detail, index) => (detail ? [{ summary: summaries[index], detail }] : []));
}

// 기본 공개 목록은 10개 단위지만 멤버 활동에는 공개 글 전체가 필요하다.
// 먼저 한 페이지를 받고 남은 페이지는 병렬로 읽어 월 2건 규모에서도 요청 수를 제한한다.
export async function getAllPublishedPosts(baseUrl = ''): Promise<PostSummary[]> {
  const first = await getPosts(0, baseUrl, POST_PAGE_SIZE);
  if (first.totalPages <= 1) return first.content;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      getPosts(index + 1, baseUrl, POST_PAGE_SIZE),
    ),
  );
  return [first, ...rest].flatMap((page) => page.content);
}

// 멤버별 활동(블로그 글 + 참여 프로젝트)을 한 번에 만든다. 서버 컴포넌트(/members)와
// 클라이언트(MemberModalProvider의 지연 로드)가 같은 조합 로직을 쓰도록 단일 출처로 둔다.
// 두 소스는 독립적으로 읽어 한쪽이 실패해도 다른 쪽 활동은 유지하고, incomplete로 알린다.
export async function loadActivitiesByMember(
  baseUrl = '',
): Promise<{ activitiesByMember: ActivitiesByMember; incomplete: boolean }> {
  const [projectsResult, postsResult] = await Promise.allSettled([
    getProjectsWithDetails(baseUrl),
    getAllPublishedPosts(baseUrl),
  ]);
  const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
  const posts = postsResult.status === 'fulfilled' ? postsResult.value : [];
  const incomplete = projectsResult.status === 'rejected' || postsResult.status === 'rejected';
  return { activitiesByMember: groupMemberActivities(posts, projects), incomplete };
}

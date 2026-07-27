import type { ProjectDetail, ProjectSummary } from '@shared/types/project';

export class ProjectApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // JSON이 아닌 오류 응답이면 화면에 안전한 기본 문구를 사용한다.
    }
    throw new ProjectApiError(message, response.status);
  }

  return response.json();
}

export async function getProjects(baseUrl = ''): Promise<ProjectSummary[]> {
  const response = await fetch(`${baseUrl}/api/projects`, { cache: 'no-store' });
  return parseJsonOrThrow(response, '프로젝트 목록을 불러오지 못했어요.');
}

export async function getProjectById(
  id: number,
  baseUrl = ''
): Promise<ProjectDetail | null> {
  const response = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  return parseJsonOrThrow(response, '프로젝트를 불러오지 못했어요.');
}

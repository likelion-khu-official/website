import type {
  ApplicationFormResponse,
  ApplicationSubmitRequest,
  ApplicationSubmitResponse,
} from '@shared/types/application';
import type { RecruitmentPublicStatusResponse } from '@shared/types/recruitment';

/**
 * 공개(비로그인) 지원 API. 모든 호출은 상대경로 /api/* — next.config 리라이트로 백엔드에 프록시된다.
 * 인증이 필요 없다(어드민 폼 편집·지원자 열람은 adminApi.ts).
 */

export async function getRecruitmentStatus(): Promise<RecruitmentPublicStatusResponse> {
  const res = await fetch('/api/recruitment/status');
  if (!res.ok) throw new Error('모집 상태를 불러오지 못했어요.');
  return res.json();
}

export async function getApplicationForm(): Promise<ApplicationFormResponse> {
  const res = await fetch('/api/application-form');
  if (!res.ok) throw new Error('지원서를 불러오지 못했어요.');
  return res.json();
}

export async function submitApplication(
  body: ApplicationSubmitRequest
): Promise<ApplicationSubmitResponse> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? '지원서 제출에 실패했어요. 다시 시도해 주세요.');
  }
  return data;
}

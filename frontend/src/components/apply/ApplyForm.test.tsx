import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApplyForm from './ApplyForm';
import { getApplicationForm, getRecruitmentStatus } from '@/lib/applicationApi';

vi.mock('@/lib/applicationApi', () => ({
  getApplicationForm: vi.fn(),
  getRecruitmentStatus: vi.fn(),
  submitApplication: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ApplyForm', () => {
  it('관리자 미리보기에서는 모집 상태와 무관하게 저장된 폼을 보여준다', async () => {
    vi.mocked(getApplicationForm).mockResolvedValue({
      schema: {
        title: '15기 지원서 미리보기',
        questions: [],
      },
    });

    render(<ApplyForm preview />);

    expect(await screen.findByRole('heading', { name: '15기 지원서 미리보기' })).toBeInTheDocument();
    expect(getRecruitmentStatus).not.toHaveBeenCalled();
    expect(getApplicationForm).toHaveBeenCalledOnce();
  });

  it('일반 방문자에게는 모집이 닫혀 있으면 알림 신청 화면을 보여준다', async () => {
    vi.mocked(getRecruitmentStatus).mockResolvedValue({ open: false });

    render(<ApplyForm />);

    expect(await screen.findByText('지금은 모집 기간이 아니에요')).toBeInTheDocument();
    expect(getApplicationForm).not.toHaveBeenCalled();
  });
});

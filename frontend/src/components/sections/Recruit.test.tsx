import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Recruit from './Recruit';
import { markRecruitAlertSubscribed } from '@/lib/recruitAlertSubscription';

vi.mock('@/lib/useRecruitmentStatus', () => ({
  useRecruitmentStatus: () => ({ recruiting: false, checked: true }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('Recruit', () => {
  it('알림 신청 패널을 열고 닫아 원래 CTA로 돌아올 수 있다', async () => {
    const user = userEvent.setup();
    render(<Recruit />);

    expect(
      screen.getByText('아이디어를 현실로 만드는 여정,'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: '멋쟁이사자처럼과 함께할 아기사자를 기다립니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('멋쟁이사자처럼')).toHaveClass('text-accent');

    const cta = screen.getByRole('button', { name: '모집 시작 알림 받기' });
    expect(cta).toHaveClass('min-h-14', 'rounded-full', 'bg-accent', 'text-white');
    expect(screen.queryByText('다음 모집이 열리면')).not.toBeInTheDocument();

    await user.click(cta);
    expect(screen.getByRole('heading', { name: '모집 시작 알림' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '알림 신청 닫기' }));
    expect(screen.getByRole('button', { name: '모집 시작 알림 받기' })).toBeInTheDocument();
  });

  it('이미 신청한 브라우저에서는 CTA가 "신청 완료"로 바뀌고 다시 열 수 있다', async () => {
    markRecruitAlertSubscribed();
    const user = userEvent.setup();
    render(<Recruit />);

    // 기본 CTA 대신 신청 완료 상태를 보여준다.
    expect(
      screen.queryByRole('button', { name: '모집 시작 알림 받기' }),
    ).not.toBeInTheDocument();
    const doneCta = screen.getByRole('button', {
      name: '모집 시작 알림 신청 완료 — 다시 신청하려면 누르기',
    });
    expect(doneCta).toBeInTheDocument();

    // 눌러 다시 신청 패널을 열 수 있다.
    await user.click(doneCta);
    expect(screen.getByRole('heading', { name: '모집 시작 알림' })).toBeInTheDocument();
  });
});

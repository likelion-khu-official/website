import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationForm from './NotificationForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NotificationForm', () => {
  it('이메일 라벨과 개인정보 필수 고지 전체를 한 흐름으로 보여준다', () => {
    render(<NotificationForm />);

    expect(screen.getByLabelText('이메일 주소')).toBeInTheDocument();
    expect(screen.getByText('모집 시작 안내 메일 발송')).toBeInTheDocument();
    expect(screen.getByText('이메일 주소', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/모집 종료 시 또는 구독 해지 요청 시까지/)).toBeInTheDocument();
    expect(screen.getByText(/동의를 거부할 수 있으며/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /개인정보 수집·이용에 동의/ })).toBeInTheDocument();
  });

  it('필수 동의 전에는 요청을 보내지 않고 동의 후 신청할 수 있다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: '알림 신청이 완료됐어요!' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<NotificationForm />);

    const submit = screen.getByRole('button', { name: '알림 신청하기' });
    await user.type(screen.getByLabelText('이메일 주소'), 'lion@example.com');
    expect(submit).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: /개인정보 수집·이용에 동의/ }));
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole('status')).toHaveTextContent('알림 신청이 완료됐어요!');
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lion@example.com' }),
    });
  });

  it('랜딩에서는 충분히 큰 닫기 버튼으로 신청 패널을 닫을 수 있다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<NotificationForm onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: '알림 신청 닫기' });
    expect(closeButton).toHaveClass('size-11');
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

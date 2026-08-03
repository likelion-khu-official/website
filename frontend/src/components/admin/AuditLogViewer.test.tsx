import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogViewer from './AuditLogViewer';
import type { AuditLogEntry, AuditLogResponse } from '@shared/types/audit';

const { routerMock, navigationState, refreshSessionMock, listAuditLogsMock } = vi.hoisted(() => ({
  routerMock: { replace: vi.fn(), push: vi.fn() },
  navigationState: { query: '' },
  refreshSessionMock: vi.fn(),
  listAuditLogsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(navigationState.query),
}));

vi.mock('@/lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adminApi')>();
  return {
    ...actual,
    refreshSession: refreshSessionMock,
    listAuditLogs: listAuditLogsMock,
  };
});

const entries: AuditLogEntry[] = [
  {
    id: 41,
    actorType: 'ADMIN',
    actorId: 3,
    actorLabel: 'operator@khu.ac.kr',
    action: 'STATE_CHANGE',
    eventType: 'PEOPLE_MANAGEMENT',
    summary: '멤버 오프보딩: 홍길동',
    detail: '활성 상태: true → false\n학번 변경됨',
    targetType: 'MEMBER',
    targetId: 12,
    httpMethod: null,
    path: null,
    outcome: 'SUCCESS',
    statusCode: null,
    clientIp: '127.0.0.1',
    occurredAt: '2026-08-01T10:11:12',
  },
  {
    id: 40,
    actorType: 'ANONYMOUS',
    actorId: null,
    actorLabel: '20260001',
    action: 'LOGIN_FAILURE',
    eventType: 'AUTHENTICATION',
    summary: null,
    detail: null,
    targetType: null,
    targetId: null,
    httpMethod: 'POST',
    path: '/api/member/auth/login',
    outcome: 'FAILURE',
    statusCode: 401,
    clientIp: '127.0.0.2',
    occurredAt: '2026-08-01T09:01:02',
  },
];

const response: AuditLogResponse = {
  entries,
  page: 0,
  totalPages: 1,
  totalCount: entries.length,
};

beforeEach(() => {
  vi.clearAllMocks();
  navigationState.query = '';
  refreshSessionMock.mockResolvedValue({});
  listAuditLogsMock.mockResolvedValue(response);
});

describe('AuditLogViewer', () => {
  it('주요 활동을 기본값으로 조회하고 표에서 선택한 사건의 전체 맥락과 변경 전후를 보여준다', async () => {
    const user = userEvent.setup();
    render(<AuditLogViewer />);

    expect(await screen.findByText('멤버 오프보딩: 홍길동')).toBeInTheDocument();
    expect(listAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({ view: 'IMPORTANT', page: 0, size: 50 }));
    expect(screen.getAllByText('성공').length).toBeGreaterThan(0);
    expect(screen.getAllByText('실패').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KST/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /멤버 오프보딩: 홍길동/ }));

    expect(screen.getByRole('region', { name: '선택한 감사 사건 상세' })).toBeInTheDocument();
    expect(screen.getByText('활성 상태')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
    expect(screen.getByText('변경됨 · 값은 보호를 위해 기록하지 않음')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: '선택한 감사 사건 상세' })).not.toBeInTheDocument();
  });

  it('빠른 보기 선택을 API 조건과 공유 가능한 URL에 함께 반영한다', async () => {
    const user = userEvent.setup();
    render(<AuditLogViewer />);
    await screen.findByText('멤버 오프보딩: 홍길동');

    await user.click(screen.getByRole('button', { name: /로그인 실패.*실패한 로그인 시도/ }));

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenLastCalledWith(expect.objectContaining({
        view: 'ALL',
        action: 'LOGIN_FAILURE',
      }));
    });
    expect(routerMock.replace).toHaveBeenCalledWith(
      '/admin/audit-logs?view=ALL&action=LOGIN_FAILURE',
      { scroll: false }
    );
  });

  it('URL의 조사 조건을 첫 요청부터 복원한다', async () => {
    navigationState.query = 'view=ALL&outcome=FAILURE&targetType=MEMBER&targetId=12&from=2026-07-01&q=offboard';

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({
        view: 'ALL',
        outcome: 'FAILURE',
        targetType: 'MEMBER',
        targetId: 12,
        from: '2026-07-01T00:00:00',
        q: 'offboard',
      }));
    });
  });

  it('상세 패널에서 같은 대상의 전체 이력 필터로 이동한다', async () => {
    const user = userEvent.setup();
    render(<AuditLogViewer />);
    await screen.findByText('멤버 오프보딩: 홍길동');

    await user.click(screen.getByRole('button', { name: /멤버 오프보딩: 홍길동/ }));
    await user.click(screen.getByRole('button', { name: '같은 대상의 전체 이력 보기 →' }));

    await waitFor(() => {
      expect(listAuditLogsMock).toHaveBeenLastCalledWith(expect.objectContaining({
        view: 'ALL',
        targetType: 'MEMBER',
        targetId: 12,
      }));
    });
    expect(routerMock.replace).toHaveBeenCalledWith(
      '/admin/audit-logs?view=ALL&targetType=MEMBER&targetId=12',
      { scroll: false }
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { listInvitations, refreshSession } from './adminApi';
import type { AdminInvitationSummary } from '@shared/types/admin';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refreshSession', () => {
  it('동시에 여러 화면이 세션을 확인해도 refresh 요청을 한 번만 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        admin: {
          id: 1,
          name: '테스트 관리자',
          email: 'admin@khu.ac.kr',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = refreshSession();
    const second = refreshSession();

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/auth/refresh',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('listInvitations', () => {
  it('인증 갱신이 가능한 관리자 초대 목록 경로를 호출한다', async () => {
    const invitation: AdminInvitationSummary = {
      id: 1,
      email: 'invited.admin@khu.ac.kr',
      status: 'PENDING',
      invitedBy: 'current.admin@khu.ac.kr',
      expiresAt: '2026-08-03T12:00:00',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([invitation]),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listInvitations()).resolves.toEqual([invitation]);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/invitations', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

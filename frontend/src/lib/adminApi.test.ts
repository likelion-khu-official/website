import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from './adminApi';

describe('refreshSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

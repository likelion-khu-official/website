import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackPageView } from './publicAnalytics';

describe('trackPageView', () => {
  const fetchMock = vi.fn();
  const sendBeaconMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    sendBeaconMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    window.localStorage.setItem('likelion-khu.analytics.visitor', '018f47a3-7b2d-4c11-8b69-0a3b7f9c2d10');
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
  });

  it('페이지 경로와 개인과 연결되지 않은 익명 번호를 JSON beacon으로 전송한다', () => {
    sendBeaconMock.mockReturnValue(true);

    trackPageView('/projects/12');

    expect(sendBeaconMock).toHaveBeenCalledWith('/api/analytics/pageviews', expect.any(Blob));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('beacon을 보낼 수 없으면 keepalive fetch로 한 번 대체한다', () => {
    sendBeaconMock.mockReturnValue(false);
    fetchMock.mockResolvedValue({ ok: true });

    trackPageView('/blog');

    expect(fetchMock).toHaveBeenCalledWith('/api/analytics/pageviews', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ path: '/blog', visitorId: '018f47a3-7b2d-4c11-8b69-0a3b7f9c2d10' }),
      keepalive: true,
    }));
  });
});

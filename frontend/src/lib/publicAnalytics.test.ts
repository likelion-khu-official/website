import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackPageView } from './publicAnalytics';

describe('trackPageView', () => {
  const fetchMock = vi.fn();
  const sendBeaconMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    sendBeaconMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
  });

  it('페이지 경로만 JSON beacon으로 전송한다', () => {
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
      body: JSON.stringify({ path: '/blog' }),
      keepalive: true,
    }));
  });
});


import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import PageViewTracker from './PageViewTracker';
import { trackPageView } from '@/lib/publicAnalytics';

let pathname = '/';

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/publicAnalytics', () => ({ trackPageView: vi.fn() }));

describe('PageViewTracker', () => {
  beforeEach(() => {
    pathname = '/';
    vi.mocked(trackPageView).mockReset();
  });

  it('첫 공개 경로와 클라이언트 경로 변경을 각각 기록한다', () => {
    const { rerender } = render(<PageViewTracker />);
    expect(trackPageView).toHaveBeenCalledWith('/');

    pathname = '/projects/3';
    rerender(<PageViewTracker />);
    expect(trackPageView).toHaveBeenLastCalledWith('/projects/3');
    expect(trackPageView).toHaveBeenCalledTimes(2);
  });
});


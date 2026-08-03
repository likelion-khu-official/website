import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingSectionTracker from './LandingSectionTracker';
import { trackSectionReach } from '@/lib/publicAnalytics';

const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();
let intersectionCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;

vi.mock('@/lib/publicAnalytics', () => ({
  getAnonymousVisitId: () => '228f47a3-7b2d-4c11-8b69-0a3b7f9c2d12',
  trackSectionReach: vi.fn(),
}));

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    intersectionCallback = callback;
    observerOptions = options;
  }
  observe = observe;
  unobserve = unobserve;
  disconnect = disconnect;
}

describe('LandingSectionTracker', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    observe.mockReset();
    unobserve.mockReset();
    disconnect.mockReset();
    vi.mocked(trackSectionReach).mockReset();
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  it('공통 노출 기준으로 도달한 섹션만 한 방문에 한 번 기록한다', () => {
    const { unmount } = render(
      <>
        <section id="project" />
        <section id="members" />
        <section id="blog" />
        <section id="recruit" />
        <LandingSectionTracker />
      </>
    );
    const project = document.getElementById('project')!;
    const members = document.getElementById('members')!;
    const blog = document.getElementById('blog')!;

    expect(observerOptions).toMatchObject({ rootMargin: '0px 0px -20% 0px', threshold: 0 });
    expect(observe).toHaveBeenCalledTimes(4);

    intersectionCallback([
      { target: project, isIntersecting: true } as IntersectionObserverEntry,
      { target: members, isIntersecting: true } as IntersectionObserverEntry,
      { target: blog, isIntersecting: false } as IntersectionObserverEntry,
    ], {} as IntersectionObserver);
    intersectionCallback([
      { target: project, isIntersecting: true } as IntersectionObserverEntry,
    ], {} as IntersectionObserver);

    expect(trackSectionReach).toHaveBeenCalledTimes(2);
    expect(trackSectionReach).toHaveBeenNthCalledWith(1, 'PROJECT');
    expect(trackSectionReach).toHaveBeenNthCalledWith(2, 'STAFF');
    expect(unobserve).toHaveBeenCalledWith(project);
    expect(unobserve).toHaveBeenCalledWith(members);
    expect(trackSectionReach).not.toHaveBeenCalledWith('BLOG');

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});

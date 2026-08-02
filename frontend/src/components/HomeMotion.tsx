'use client';

import { useEffect } from 'react';

const revealSelector = '.scroll-reveal';

function setupHeroMotion() {
  const shell = document.querySelector<HTMLElement>('.hero-scroll-shell');
  const copy = document.querySelector<HTMLElement>('.hero-copy');
  const mark = document.querySelector<HTMLElement>('.hero-brand-mark');
  const cue = document.querySelector<HTMLElement>('.hero-scroll-cue');

  if (!shell || !copy || !mark || !cue) return () => {};

  const heroShell = shell;
  const heroCopy = copy;
  const heroMark = mark;
  const heroCue = cue;
  let frame = 0;

  function update() {
    frame = 0;

    const shellTop = heroShell.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(heroShell.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max((window.scrollY - shellTop) / travel, 0), 1);
    const cueProgress = Math.min(Math.max((progress - 0.36) / 0.34, 0), 1);
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    const copyTravel = desktop ? -7 : -3.5;
    const copyScale = desktop ? 0.08 : 0.035;
    const markTravelX = desktop ? -7 : -2;
    const markTravelY = desktop ? -5 : -2.5;
    const markScale = desktop ? 0.14 : 0.06;

    heroCopy.style.opacity = String(1 - progress * (desktop ? 0.62 : 0.42));
    heroCopy.style.transform = `translate3d(0, ${progress * copyTravel}svh, 0) scale(${1 - progress * copyScale})`;
    heroMark.style.opacity = String(0.12 + progress * (desktop ? 0.12 : 0.06));
    heroMark.style.transform = `translate3d(${progress * markTravelX}vw, ${progress * markTravelY}svh, 0) rotate(${
      -4 + progress * (desktop ? 10 : 5)
    }deg) scale(${1 + progress * markScale})`;
    heroCue.style.opacity = String(0.8 * (1 - cueProgress));
    heroCue.style.transform = `translateY(${cueProgress * -22}px)`;
  }

  function scheduleUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  }

  update();
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);

  return () => {
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    if (frame) window.cancelAnimationFrame(frame);

    [heroCopy, heroMark, heroCue].forEach((element) => {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    });
  };
}

export default function HomeMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(revealSelector),
    );

    root.classList.add('scroll-reveal-ready');
    // 한 번 읽은 콘텐츠는 다시 숨기지 않는다. 역스크롤 때 요소가 재등장하면
    // 페이지 위치가 불안정하게 느껴지고 사용자가 이미 확보한 맥락을 잃기 때문이다.
    const cleanUpHero = reducedMotion ? () => {} : setupHeroMotion();
    let revealFrame = 0;

    function revealVisibleElements() {
      revealFrame = 0;
      const triggerLine = window.innerHeight * 0.92;

      revealElements.forEach((element) => {
        if (element.classList.contains('is-visible')) return;

        const rect = element.getBoundingClientRect();
        const inView = rect.top <= triggerLine && rect.bottom >= 0;
        if (inView) {
          element.classList.add('is-visible');
        }
      });
    }

    function scheduleReveal() {
      if (revealFrame) return;
      revealFrame = window.requestAnimationFrame(revealVisibleElements);
    }

    revealFrame = window.requestAnimationFrame(revealVisibleElements);
    window.addEventListener('scroll', scheduleReveal, { passive: true });
    window.addEventListener('resize', scheduleReveal);

    return () => {
      window.removeEventListener('scroll', scheduleReveal);
      window.removeEventListener('resize', scheduleReveal);
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      cleanUpHero();
      root.classList.remove('scroll-reveal-ready');
      revealElements.forEach((element) => element.classList.remove('is-visible'));
    };
  }, []);

  return null;
}

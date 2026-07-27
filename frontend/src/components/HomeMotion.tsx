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

    heroCopy.style.opacity = String(1 - progress * 0.76);
    heroCopy.style.transform = `translate3d(0, ${progress * -9}svh, 0) scale(${1 - progress * 0.12})`;
    heroMark.style.opacity = String(0.12 + progress * 0.16);
    heroMark.style.transform = `translate3d(${progress * -9}vw, ${progress * -7}svh, 0) rotate(${
      -4 + progress * 13
    }deg) scale(${1 + progress * 0.18})`;
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
    const pendingElements = new Set(revealElements);
    const cleanUpHero = reducedMotion ? () => {} : setupHeroMotion();
    let revealFrame = 0;

    function revealVisibleElements() {
      revealFrame = 0;
      const triggerLine = window.innerHeight * 0.92;

      pendingElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top <= triggerLine && rect.bottom >= 0) {
          element.classList.add('is-visible');
          pendingElements.delete(element);
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

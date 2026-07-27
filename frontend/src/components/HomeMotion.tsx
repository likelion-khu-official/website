'use client';

import { useEffect } from 'react';

const revealSelector = '.scroll-reveal';

function setupHeroFallback() {
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

    if (reducedMotion) return;

    const cleanUpHero = setupHeroFallback();
    if (!('IntersectionObserver' in window)) return cleanUpHero;

    root.classList.add('scroll-reveal-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target as HTMLElement;
          element.classList.add('is-visible');
          observer.unobserve(element);
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.08,
      },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      cleanUpHero();
      root.classList.remove('scroll-reveal-ready');
      revealElements.forEach((element) => element.classList.remove('is-visible'));
    };
  }, []);

  return null;
}

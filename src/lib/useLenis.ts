import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { scrollState } from './scrollStore';

export type UseLenisOptions = {
  onRaf?: (time: number) => void;
  enabled?: boolean;
};

// Wires up Lenis smooth scroll, runs its rAF loop, mirrors progress/velocity
// into scrollState, and intercepts in-page anchor links so they ride through Lenis.
export function useLenis({ onRaf, enabled = true }: UseLenisOptions = {}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      onRaf?.(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onScroll = (e: { progress: number }) => {
      const prev = scrollState.progress;
      scrollState.lastProgress = prev;
      scrollState.progress = e.progress;
      const bar = document.getElementById('progress');
      if (bar) bar.style.width = (e.progress * 100).toFixed(2) + '%';
    };
    lenis.on('scroll', onScroll);

    // Anchor-link interceptor: keep #about etc. flowing through Lenis.
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const dest = document.querySelector(href);
      if (!dest) return;
      ev.preventDefault();
      lenis.scrollTo(dest as HTMLElement, { offset: -20 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, onRaf]);

  return lenisRef;
}

import { useEffect, useRef, type RefObject } from 'react';

// Runs `tick(dt)` on rAF only while the host element is on-screen.
// Skipped entirely when reduced-motion is on (caller decides what to render statically).
export function useArtFrame(
  hostRef: RefObject<HTMLElement>,
  tick: (dt: number) => void,
  enabled = true,
) {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let last = performance.now();
    let visible = true;

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (visible) tickRef.current(dt);
      raf = requestAnimationFrame(loop);
    };

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { visible = e.isIntersecting; }),
        { threshold: 0.01 },
      );
      io.observe(host);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [enabled, hostRef]);
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const ease = (t: number) => t * t * (3 - 2 * t);

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from '../lib/useLenis';
import { scrollState } from '../lib/scrollStore';
import { useReducedMotion } from '../lib/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  // Becomes true when the preloader finishes; gates the hero intro timeline.
  start: boolean;
};

export function MotionRoot({ start }: Props) {
  const reduced = useReducedMotion();

  useLenis({
    enabled: !reduced,
    onRaf: () => ScrollTrigger.update(),
  });

  // Native-scroll fallback for the progress bar when Lenis is off (reduced motion).
  useEffect(() => {
    if (!reduced) return;
    const onScroll = () => {
      const h = document.documentElement;
      const denom = h.scrollHeight - h.clientHeight || 1;
      const p = h.scrollTop / denom;
      scrollState.lastProgress = scrollState.progress;
      scrollState.progress = p;
      const bar = document.getElementById('progress');
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduced]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      scrollState.mouseX = e.clientX / window.innerWidth;
      scrollState.mouseY = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => { scrollState.reducedMotion = reduced; }, [reduced]);

  // Add js-on as soon as we're not in reduced-motion mode so .reveal/.hero line spans
  // start in their hidden state before the intro fires.
  useEffect(() => {
    if (reduced) return;
    document.body.classList.add('js-on');
    return () => { document.body.classList.remove('js-on'); };
  }, [reduced]);

  // Hero intro + scroll-triggered reveals: fire only after preloader hands off.
  useEffect(() => {
    if (reduced || !start) return;
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
      intro
        .to('.hero h1 .line span', { y: 0, duration: 1.2, stagger: 0.12 }, 0)
        .to('#heroEyebrow', { opacity: 1, duration: 1 }, 0.2)
        .to('#heroSub', { opacity: 1, duration: 1 }, 0.7)
        .to('#scrollHint', { opacity: 0.7, duration: 1 }, 0.9);

      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    });
    return () => { ctx.revert(); };
  }, [reduced, start]);

  return null;
}

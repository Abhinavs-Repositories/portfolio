import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from '../lib/useLenis';
import { pulseAberration, scrollState, setMouseOverride } from '../lib/scrollStore';
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

      // Hero word perturbation: each word reveal nudges the ShaderField mouse
      // toward that word's screen position so the amber ridge blooms behind it.
      // The words "Systems that", "think", and "in production." each get a beat.
      const heroLines = gsap.utils.toArray<HTMLElement>('.hero h1 .line span');
      heroLines.forEach((el, i) => {
        intro.call(() => {
          const r = el.getBoundingClientRect();
          const cx = (r.left + r.width / 2) / window.innerWidth;
          const cy = 1 - (r.top + r.height / 2) / window.innerHeight;
          setMouseOverride(cx, cy, 420);
        }, [], 0.05 + i * 0.12);
      });

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

  // Step 6 + cross-cutting: invert trigger, section-boundary aberration grammar,
  // and activeSection tracking for the corridor impostors.
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Section-boundary aberration grammar (Hero→About, About→Work, Work→Contact).
      const boundaries = ['#about', '#work', '#contact'];
      boundaries.forEach((sel) => {
        ScrollTrigger.create({
          trigger: sel,
          start: 'top 70%',
          onEnter: () => pulseAberration(0.8, 200),
          onLeaveBack: () => pulseAberration(0.5, 180),
        });
      });

      // Active-section tracking — drives impostor activation.
      const setActive = (s: typeof scrollState.activeSection) => {
        scrollState.activeSection = s;
      };
      ScrollTrigger.create({ trigger: '#about', start: 'top 60%', end: 'bottom 60%', onEnter: () => setActive('about'), onEnterBack: () => setActive('about') });
      const projectEls = gsap.utils.toArray<HTMLElement>('.project');
      projectEls.forEach((el, idx) => {
        const key = `work-${idx}` as typeof scrollState.activeSection;
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 50%',
          onEnter: () => setActive(key),
          onEnterBack: () => setActive(key),
        });
      });
      ScrollTrigger.create({
        trigger: '#contact',
        start: 'top 70%',
        onEnter: () => setActive('contact'),
        onLeaveBack: () => setActive('work-3'),
      });

      // Contact inversion: tween uInvert (and body.inverted) over ~1.5s.
      // Trigger: scroll progress past 0.85 of the page.
      // Reduced motion path: snap to fully-inverted end-state, no tween.
      const setInvert = (v: number) => { scrollState.invert = v; };
      if (scrollState.reducedMotion) {
        // We honor reduced-motion here: the contact section is the inverted end-state.
        ScrollTrigger.create({
          trigger: '#contact',
          start: 'top 80%',
          onEnter: () => {
            scrollState.invert = 1;
            document.body.classList.add('inverted');
          },
          onLeaveBack: () => {
            scrollState.invert = 0;
            document.body.classList.remove('inverted');
          },
        });
      } else {
        ScrollTrigger.create({
          trigger: '#contact',
          start: 'top 60%',
          onEnter: () => {
            document.body.classList.add('inverted');
            gsap.to(scrollState, { invert: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: () => setInvert(scrollState.invert) });
          },
          onLeaveBack: () => {
            document.body.classList.remove('inverted');
            gsap.to(scrollState, { invert: 0, duration: 1.2, ease: 'power2.inOut', onUpdate: () => setInvert(scrollState.invert) });
          },
        });
      }
    });
    return () => { ctx.revert(); };
  }, [reduced]);

  return null;
}

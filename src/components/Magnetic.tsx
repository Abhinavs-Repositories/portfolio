import { cloneElement, isValidElement, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

type Props = {
  children: ReactElement<{ ref?: React.Ref<HTMLElement>; className?: string }>;
  strength?: number; // 0..1, prototype uses 0.4
  lerp?: number; // spring-back smoothing
};

// Wraps a single child element and pulls it toward the cursor on hover.
// Disabled on touch and reduced-motion.
export function Magnetic({ children, strength = 0.4, lerp = 0.2 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf: number | null = null;

    const loop = () => {
      cx += (tx - cx) * lerp;
      cy += (ty - cy) * lerp;
      if (Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01 && Math.abs(cx) < 0.1 && Math.abs(cy) < 0.1) {
        el.style.transform = '';
        raf = null;
        return;
      }
      el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      if (raf === null) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (raf === null) raf = requestAnimationFrame(loop);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (raf !== null) cancelAnimationFrame(raf);
      el.style.transform = '';
    };
  }, [strength, lerp]);

  if (!isValidElement(children)) return children;
  const child = children as ReactElement<{ ref?: React.Ref<HTMLElement>; className?: string }>;
  const merged = ['magnetic', child.props.className].filter(Boolean).join(' ');
  return cloneElement(child, { ref, className: merged });
}

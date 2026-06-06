import { useEffect, useRef } from 'react';

// Dot + lagging ring. Disabled on touch / coarse pointers.
// CSS handles the 'hot' swell and the cursor:none body class.
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add('cursor-on');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    };
    const onLeave = () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    let raf = 0;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 'hot' swell: delegated mouseover/mouseout so dynamically inserted elements work too.
    const matches = (el: Element | null) =>
      !!el && el.matches(
        'a, button, [data-cursor], [data-art], .project .visual',
      );
    const onOver = (e: MouseEvent) => {
      if (matches(e.target as Element)) ring.classList.add('hot');
    };
    const onOut = (e: MouseEvent) => {
      if (matches(e.target as Element)) ring.classList.remove('hot');
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.body.classList.remove('cursor-on');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" id="cursorRing" />
      <div ref={dotRef} className="cursor-dot" id="cursorDot" />
    </>
  );
}

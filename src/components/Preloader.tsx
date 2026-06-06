import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useReducedMotion } from '../lib/useReducedMotion';

// Drives the bar from drei's three-LoadingManager progress AND document.fonts.ready.
// Combines them: bar = max(asset progress, fonts %), then holds 100 briefly before handoff.
const MIN_DISPLAY_MS = 700;   // floor so it doesn't just flash
const HANDOFF_DELAY_MS = 280; // hold at 100 before fade

type Props = { onComplete: () => void };

export function Preloader({ onComplete }: Props) {
  const reduced = useReducedMotion();
  const { progress: threeProgress } = useProgress();
  const [fontsPct, setFontsPct] = useState(0);
  const [pct, setPct] = useState(0);
  const [hiding, setHiding] = useState(false);
  const finishedRef = useRef(false);
  const mountedAt = useRef(performance.now());

  useEffect(() => {
    if (!('fonts' in document)) { setFontsPct(100); return; }
    document.fonts.ready.then(() => setFontsPct(100));
    // tick fonts toward 80% while we wait so the bar shows life even with no 3D assets
    const id = window.setInterval(() => {
      setFontsPct((p) => (p >= 80 ? p : p + 8));
    }, 80);
    return () => clearInterval(id);
  }, []);

  // Reduced-motion: skip the show, fire handoff immediately on next tick.
  useEffect(() => {
    if (!reduced || finishedRef.current) return;
    finishedRef.current = true;
    setPct(100);
    const id = window.setTimeout(() => {
      setHiding(true);
      onComplete();
    }, 50);
    return () => clearTimeout(id);
  }, [reduced, onComplete]);

  useEffect(() => {
    if (reduced || finishedRef.current) return;
    const blended = Math.max(threeProgress, fontsPct);
    setPct((cur) => (blended > cur ? blended : cur));
    if (blended >= 100 && fontsPct >= 100) {
      const wait = Math.max(0, MIN_DISPLAY_MS - (performance.now() - mountedAt.current));
      const id = window.setTimeout(() => {
        finishedRef.current = true;
        setHiding(true);
        window.setTimeout(onComplete, HANDOFF_DELAY_MS);
      }, wait);
      return () => clearTimeout(id);
    }
  }, [threeProgress, fontsPct, reduced, onComplete]);

  return (
    <div id="preloader" className={hiding ? 'hide' : undefined} aria-hidden={hiding}>
      <div className="pl-logo">A<span>.</span>S</div>
      <div className="pl-bar"><i style={{ width: `${Math.round(pct)}%` }} /></div>
      <div className="pl-num">{Math.round(pct)}<i>%</i></div>
    </div>
  );
}

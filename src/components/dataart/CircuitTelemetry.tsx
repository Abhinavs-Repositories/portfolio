import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useArtFrame } from './useArtFrame';

const SVG = `
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="f1Grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8ad4c"/><stop offset="100%" stop-color="#c8862b"/>
    </radialGradient>
    <filter id="f1Glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="400" height="300" fill="transparent" pointer-events="all"/>
  <path id="f1Track" d="M150 70 C90 58 56 118 100 158 C132 188 88 232 160 244 C232 256 244 208 232 176 C220 144 286 158 296 116 C306 80 244 66 202 84 C182 92 176 76 150 70 Z" stroke="#16140f" stroke-width="2.2" stroke-opacity="0.85"/>
  <path id="f1Race" d="M150 70 C90 58 56 118 100 158 C132 188 88 232 160 244 C232 256 244 208 232 176 C220 144 286 158 296 116 C306 80 244 66 202 84 C182 92 176 76 150 70 Z" stroke="#c8862b" stroke-width="1.4" stroke-dasharray="6 8" stroke-opacity="0.85"/>
  <line x1="146" y1="60" x2="156" y2="80" stroke="#16140f" stroke-width="1.6" stroke-opacity="0.7"/>
  <g id="f1Sectors" fill="#c8862b" fill-opacity="0.35">
    <circle class="sector" data-t="0.16" r="3.5"/>
    <circle class="sector" data-t="0.5" r="3.5"/>
    <circle class="sector" data-t="0.82" r="3.5"/>
  </g>
  <line x1="40" y1="285" x2="360" y2="285" stroke="#16140f" stroke-opacity="0.12"/>
  <polyline id="f1Tele" points="" stroke="#c8862b" stroke-width="1.5" stroke-opacity="0.85" fill="none"/>
  <text id="f1Speed" x="360" y="32" text-anchor="end" font-family="'Familjen Grotesk',sans-serif" font-size="13" letter-spacing="1" fill="#c8862b">— km/h</text>
  <g id="f1Car" transform="translate(150 70)"><circle r="4.8" fill="url(#f1Grad)" filter="url(#f1Glow)"/></g>
</svg>
`;

export function CircuitTelemetry() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ prog: 0, hover: false, hist: [] as number[] });
  const reduced = useReducedMotion();
  const N = 42;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    svg.style.cursor = 'pointer';

    // Position sector dots along the track path.
    const track = svg.querySelector('#f1Track') as SVGPathElement;
    const len = track.getTotalLength();
    svg.querySelectorAll<SVGCircleElement>('.sector').forEach((s) => {
      const t = parseFloat(s.dataset.t || '0');
      const p = track.getPointAtLength(t * len);
      s.setAttribute('cx', p.x.toFixed(1));
      s.setAttribute('cy', p.y.toFixed(1));
    });

    const onEnter = () => { stateRef.current.hover = true; };
    const onLeave = () => { stateRef.current.hover = false; };
    svg.addEventListener('pointerenter', onEnter);
    svg.addEventListener('pointerleave', onLeave);
    return () => {
      svg.removeEventListener('pointerenter', onEnter);
      svg.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useArtFrame(hostRef, (dt) => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const track = svg.querySelector('#f1Track') as SVGPathElement;
    const race = svg.querySelector('#f1Race') as SVGPathElement;
    const car = svg.querySelector('#f1Car') as SVGGElement;
    const speedT = svg.querySelector('#f1Speed') as SVGTextElement;
    const tele = svg.querySelector('#f1Tele') as SVGPolylineElement;
    const sectors = Array.from(svg.querySelectorAll<SVGCircleElement>('.sector'));
    const len = track.getTotalLength();
    const s = stateRef.current;

    const p0 = track.getPointAtLength((s.prog % 1) * len);
    const p1 = track.getPointAtLength(((s.prog + 0.012) % 1) * len);
    const p2 = track.getPointAtLength(((s.prog + 0.024) % 1) * len);
    const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    let dA = Math.abs(a2 - a1);
    if (dA > Math.PI) dA = 2 * Math.PI - dA;
    const straight = 1 - Math.min(dA / 0.5, 1);
    const speed = 92 + straight * 248;

    s.prog = (s.prog + dt * 0.00009 * (s.hover ? 1.8 : 1) * (0.45 + straight * 0.95)) % 1;
    const cp = track.getPointAtLength(s.prog * len);
    car.setAttribute('transform', `translate(${cp.x.toFixed(1)} ${cp.y.toFixed(1)})`);
    speedT.textContent = `${Math.round(speed)} km/h`;

    sectors.forEach((sec) => {
      const t = parseFloat(sec.dataset.t || '0');
      const on = ((s.prog - t + 1) % 1) < 0.045;
      sec.setAttribute('fill-opacity', on ? '1' : '0.35');
      sec.setAttribute('r', on ? '5.5' : '3.5');
    });

    s.hist.push(speed);
    if (s.hist.length > N) s.hist.shift();
    tele.setAttribute(
      'points',
      s.hist
        .map((sp, k) => `${(44 + (k / (N - 1)) * 312).toFixed(1)},${(283 - ((sp - 92) / 248) * 44).toFixed(1)}`)
        .join(' '),
    );
    race.setAttribute('stroke-dashoffset', String((-s.prog * len).toFixed(1)));
  }, !reduced);

  return (
    <div
      ref={hostRef}
      className="float art"
      data-art="f1"
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}

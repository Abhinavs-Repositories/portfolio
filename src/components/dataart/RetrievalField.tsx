import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { clamp, useArtFrame } from './useArtFrame';

// Cursor is a live query in embedding space. Idle = Lissajous drift.
// Logic ported from prototype index.html (RAG block).
const SVG = `
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="ragGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8ad4c"/><stop offset="100%" stop-color="#c8862b"/>
    </radialGradient>
    <filter id="ragGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="400" height="300" fill="transparent" pointer-events="all"/>
  <g id="ragRings" transform="translate(200 150)" stroke="#c8862b" stroke-opacity="0.22">
    <circle r="40"/><circle r="80"/><circle r="120"/>
  </g>
  <g id="ragDots" fill="#16140f" fill-opacity="0.28">
    <circle class="emb" cx="60" cy="62" r="2.5"/><circle class="emb" cx="150" cy="48" r="2.5"/>
    <circle class="emb" cx="252" cy="40" r="2.5"/><circle class="emb" cx="342" cy="70" r="2.5"/>
    <circle class="emb" cx="70" cy="140" r="2.5"/><circle class="emb" cx="360" cy="132" r="2.5"/>
    <circle class="emb" cx="52" cy="222" r="2.5"/><circle class="emb" cx="160" cy="262" r="2.5"/>
    <circle class="emb" cx="250" cy="270" r="2.5"/><circle class="emb" cx="350" cy="240" r="2.5"/>
    <circle class="emb" cx="120" cy="138" r="2.5"/><circle class="emb" cx="288" cy="150" r="2.5"/>
    <circle class="emb" cx="180" cy="210" r="2.5"/><circle class="emb" cx="230" cy="108" r="2.5"/>
    <circle class="emb" cx="140" cy="182" r="2.5"/><circle class="emb" cx="312" cy="248" r="2.5"/>
    <circle class="emb" cx="92" cy="192" r="2.5"/><circle class="emb" cx="318" cy="196" r="2.5"/>
  </g>
  <g id="ragLinks" stroke="url(#ragGrad)" stroke-width="1.3" stroke-opacity="0.85"></g>
  <circle id="ragQuery" cx="200" cy="150" r="7.5" fill="url(#ragGrad)" filter="url(#ragGlow)"/>
</svg>
`;

function viewboxPoint(svg: SVGSVGElement, e: PointerEvent) {
  const p = svg.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const l = p.matrixTransform(m.inverse());
  return { x: l.x, y: l.y };
}

export function RetrievalField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ qx: 200, qy: 150, tx: 200, ty: 150, ptr: false, t: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    svg.style.cursor = 'crosshair';

    const onMove = (e: PointerEvent) => {
      const p = viewboxPoint(svg, e);
      if (p) {
        stateRef.current.ptr = true;
        stateRef.current.tx = clamp(p.x, 55, 345);
        stateRef.current.ty = clamp(p.y, 55, 245);
      }
    };
    const onLeave = () => { stateRef.current.ptr = false; };
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useArtFrame(hostRef, (dt) => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const q = svg.querySelector('#ragQuery') as SVGCircleElement;
    const rings = svg.querySelector('#ragRings') as SVGGElement;
    const links = svg.querySelector('#ragLinks') as SVGGElement;
    const dots = Array.from(svg.querySelectorAll<SVGCircleElement>('.emb')).map((d) => ({
      el: d,
      x: +(d.getAttribute('cx') || '0'),
      y: +(d.getAttribute('cy') || '0'),
      d: 0,
    }));

    const s = stateRef.current;
    s.t += dt;
    if (!s.ptr) {
      s.tx = 200 + Math.cos(s.t * 0.0006) * 112;
      s.ty = 150 + Math.sin(s.t * 0.00092) * 82;
    }
    s.qx += (s.tx - s.qx) * 0.12;
    s.qy += (s.ty - s.qy) * 0.12;
    q.setAttribute('cx', s.qx.toFixed(1));
    q.setAttribute('cy', s.qy.toFixed(1));
    rings.setAttribute('transform', `translate(${s.qx.toFixed(1)} ${s.qy.toFixed(1)})`);
    dots.forEach((d) => { d.d = (d.x - s.qx) ** 2 + (d.y - s.qy) ** 2; });
    const near = [...dots].sort((a, b) => a.d - b.d).slice(0, 5);
    const set = new Set(near);
    dots.forEach((d) => {
      const on = set.has(d);
      d.el.setAttribute('r', on ? '4.6' : '2.5');
      d.el.setAttribute('fill', on ? '#c8862b' : '#16140f');
      d.el.setAttribute('fill-opacity', on ? '0.95' : '0.28');
    });
    links.innerHTML = near
      .map((d) => `<line x1="${s.qx.toFixed(1)}" y1="${s.qy.toFixed(1)}" x2="${d.x}" y2="${d.y}"/>`)
      .join('');
  }, !reduced);

  return (
    <div
      ref={hostRef}
      className="float art"
      data-art="rag"
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}

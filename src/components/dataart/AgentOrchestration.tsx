import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { ease, useArtFrame } from './useArtFrame';

const SVG = `
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="agGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8ad4c"/><stop offset="100%" stop-color="#c8862b"/>
    </radialGradient>
    <filter id="agGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="400" height="300" fill="transparent" pointer-events="all"/>
  <g id="agSpokes" stroke="#16140f" stroke-width="1.2" stroke-opacity="0.38">
    <line x1="200" y1="150" x2="295" y2="150"/><line x1="200" y1="150" x2="247" y2="232"/>
    <line x1="200" y1="150" x2="153" y2="232"/><line x1="200" y1="150" x2="105" y2="150"/>
    <line x1="200" y1="150" x2="153" y2="68"/><line x1="200" y1="150" x2="247" y2="68"/>
  </g>
  <g id="agRing" stroke="#c8862b" stroke-width="1.2" stroke-opacity="0.45">
    <line x1="295" y1="150" x2="247" y2="232"/><line x1="247" y1="232" x2="153" y2="232"/>
    <line x1="153" y1="232" x2="105" y2="150"/><line x1="105" y1="150" x2="153" y2="68"/>
    <line x1="153" y1="68" x2="247" y2="68"/><line x1="247" y1="68" x2="295" y2="150"/>
  </g>
  <g id="agNodes" font-family="Georgia, serif" font-size="13" text-anchor="middle" fill="#3a3730">
    <g class="agent" data-phase="Intake"><circle cx="295" cy="150" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="295" y="155">1</text></g>
    <g class="agent" data-phase="Classify"><circle cx="247" cy="232" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="247" y="237">2</text></g>
    <g class="agent" data-phase="Assess"><circle cx="153" cy="232" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="153" y="237">3</text></g>
    <g class="agent" data-phase="Control"><circle cx="105" cy="150" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="105" y="155">4</text></g>
    <g class="agent" data-phase="Review"><circle cx="153" cy="68" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="153" y="73">5</text></g>
    <g class="agent" data-phase="Report"><circle cx="247" cy="68" r="15" fill="#f4f1ea" stroke="#16140f" stroke-width="1.6"/><text x="247" y="73">6</text></g>
  </g>
  <circle cx="200" cy="150" r="18" fill="url(#agGrad)"/>
  <circle id="agToken" cx="295" cy="150" r="5.5" fill="url(#agGrad)" filter="url(#agGlow)"/>
  <text id="agLabel" x="200" y="292" text-anchor="middle" font-family="'Familjen Grotesk',sans-serif" font-size="12" letter-spacing="2" fill="#c8862b"></text>
</svg>
`;

export function AgentOrchestration() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ i: 0, leg: 'out' as 'out' | 'back', prog: 0, hover: -1 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    svg.style.cursor = 'pointer';
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>('.agent'));
    const label = svg.querySelector('#agLabel') as SVGTextElement;
    const token = svg.querySelector('#agToken') as SVGCircleElement;

    const activate = (idx: number) => {
      nodes.forEach((g, k) => {
        const c = g.querySelector('circle')!;
        const on = k === idx;
        c.setAttribute('fill', on ? '#c8862b' : '#f4f1ea');
        c.setAttribute('stroke', on ? '#c8862b' : '#16140f');
      });
      label.textContent = idx >= 0 ? (nodes[idx].dataset.phase || '') : '';
    };

    const handlers: Array<() => void> = [];
    nodes.forEach((g, idx) => {
      g.style.pointerEvents = 'auto';
      const enter = () => { stateRef.current.hover = idx; activate(idx); };
      const leave = () => { stateRef.current.hover = -1; };
      g.addEventListener('pointerenter', enter);
      g.addEventListener('pointerleave', leave);
      handlers.push(() => {
        g.removeEventListener('pointerenter', enter);
        g.removeEventListener('pointerleave', leave);
      });
    });

    if (reduced) {
      const n = nodes[0].querySelector('circle')!;
      token.setAttribute('cx', n.getAttribute('cx') || '295');
      token.setAttribute('cy', n.getAttribute('cy') || '150');
      activate(0);
    } else {
      activate(0);
    }

    return () => handlers.forEach((fn) => fn());
  }, [reduced]);

  useArtFrame(hostRef, (dt) => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const token = svg.querySelector('#agToken') as SVGCircleElement;
    const label = svg.querySelector('#agLabel') as SVGTextElement;
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>('.agent')).map((g) => {
      const c = g.querySelector('circle')!;
      return { x: +(c.getAttribute('cx') || '0'), y: +(c.getAttribute('cy') || '0'), phase: g.dataset.phase || '' };
    });
    const hub = { x: 200, y: 150 };
    const s = stateRef.current;

    if (s.hover >= 0) {
      const n = nodes[s.hover];
      token.setAttribute('cx', String(n.x));
      token.setAttribute('cy', String(n.y));
      return;
    }
    s.prog += dt * 0.0018;
    if (s.prog >= 1) {
      s.prog = 0;
      if (s.leg === 'out') s.leg = 'back';
      else { s.leg = 'out'; s.i = (s.i + 1) % nodes.length; }
    }
    const n = nodes[s.i];
    let ax: number, ay: number;
    if (s.leg === 'out') {
      ax = hub.x + (n.x - hub.x) * ease(s.prog);
      ay = hub.y + (n.y - hub.y) * ease(s.prog);
      if (s.prog > 0.55) label.textContent = n.phase;
    } else {
      ax = n.x + (hub.x - n.x) * ease(s.prog);
      ay = n.y + (hub.y - n.y) * ease(s.prog);
      if (s.prog > 0.85) label.textContent = '';
    }
    token.setAttribute('cx', ax.toFixed(1));
    token.setAttribute('cy', ay.toFixed(1));
  }, !reduced);

  return (
    <div
      ref={hostRef}
      className="float art"
      data-art="agents"
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}

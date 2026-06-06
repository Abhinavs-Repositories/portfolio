import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { clamp, useArtFrame } from './useArtFrame';

const NS = 'http://www.w3.org/2000/svg';

const SVG = `
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="chatGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8ad4c"/><stop offset="100%" stop-color="#c8862b"/>
    </radialGradient>
    <filter id="chatGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="400" height="300" fill="transparent" pointer-events="all"/>
  <g stroke="#c8862b" stroke-width="1.2">
    <path class="pulse" d="M96 110 A52 52 0 0 1 96 190" stroke-opacity="0.5"/>
    <path class="pulse d2" d="M82 92 A78 78 0 0 1 82 208" stroke-opacity="0.4"/>
    <path class="pulse d3" d="M68 74 A104 104 0 0 1 68 226" stroke-opacity="0.3"/>
  </g>
  <g id="chatLanes" stroke="#16140f" stroke-opacity="0.28">
    <path class="lane" d="M82 150 C200 150 240 44 332 44"/>
    <path class="lane" d="M82 150 C200 150 240 80 332 80"/>
    <path class="lane" d="M82 150 C200 150 250 116 332 116"/>
    <path class="lane" d="M82 150 C220 150 250 150 332 150"/>
    <path class="lane" d="M82 150 C200 150 250 184 332 184"/>
    <path class="lane" d="M82 150 C200 150 240 220 332 220"/>
    <path class="lane" d="M82 150 C200 150 240 256 332 256"/>
  </g>
  <g id="chatUsers" fill="#16140f" fill-opacity="0.5">
    <circle class="user" cx="338" cy="44" r="4"/><circle class="user" cx="338" cy="80" r="4"/>
    <circle class="user" cx="338" cy="116" r="4"/><circle class="user" cx="338" cy="150" r="4"/>
    <circle class="user" cx="338" cy="184" r="4"/><circle class="user" cx="338" cy="220" r="4"/>
    <circle class="user" cx="338" cy="256" r="4"/>
  </g>
  <g id="chatParticles"></g>
  <circle id="chatSource" cx="78" cy="150" r="12" fill="url(#chatGrad)" filter="url(#chatGlow)"/>
</svg>
`;

type Particle = { lane: number; t: number; out: boolean; sp: number; el: SVGCircleElement };

export function MessageTraffic() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ acc: 0, parts: [] as Particle[], hot: false });
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    svg.style.cursor = 'pointer';

    const source = svg.querySelector('#chatSource') as SVGCircleElement;
    const users = Array.from(svg.querySelectorAll<SVGCircleElement>('.user'));
    const lanes = Array.from(svg.querySelectorAll<SVGPathElement>('.lane'));
    const pG = svg.querySelector('#chatParticles') as SVGGElement;

    const onEnter = () => { stateRef.current.hot = true; };
    const onLeave = () => { stateRef.current.hot = false; };
    source.style.pointerEvents = 'auto';
    source.addEventListener('pointerenter', onEnter);
    source.addEventListener('pointerleave', onLeave);

    const light = (idx: number) => {
      const l = lanes[idx];
      l.setAttribute('stroke', '#c8862b');
      l.setAttribute('stroke-opacity', '0.7');
      setTimeout(() => {
        l.setAttribute('stroke', '#16140f');
        l.setAttribute('stroke-opacity', '0.28');
      }, 700);
    };
    const bubble = (idx: number) => {
      const u = users[idx];
      const b = document.createElementNS(NS, 'rect');
      b.setAttribute('x', String(+(u.getAttribute('cx') || '0') - 15));
      b.setAttribute('y', String(+(u.getAttribute('cy') || '0') - 24));
      b.setAttribute('width', '18');
      b.setAttribute('height', '12');
      b.setAttribute('rx', '3');
      b.setAttribute('fill', '#c8862b');
      pG.appendChild(b);
      let o = 0.95;
      let y = +b.getAttribute('y')!;
      const id = window.setInterval(() => {
        o -= 0.07;
        y -= 0.7;
        b.setAttribute('opacity', String(o));
        b.setAttribute('y', String(y));
        if (o <= 0) {
          clearInterval(id);
          b.remove();
        }
      }, 40);
    };

    const userHandlers: Array<() => void> = [];
    users.forEach((u, idx) => {
      u.style.pointerEvents = 'auto';
      const fn = () => { bubble(idx); light(idx); };
      u.addEventListener('pointerenter', fn);
      userHandlers.push(() => u.removeEventListener('pointerenter', fn));
    });

    return () => {
      source.removeEventListener('pointerenter', onEnter);
      source.removeEventListener('pointerleave', onLeave);
      userHandlers.forEach((fn) => fn());
      // clean up any in-flight particles to avoid leaks across HMR
      stateRef.current.parts.forEach((p) => p.el.remove());
      stateRef.current.parts = [];
    };
  }, []);

  useArtFrame(hostRef, (dt) => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const pG = svg.querySelector('#chatParticles') as SVGGElement;
    const lanes = Array.from(svg.querySelectorAll<SVGPathElement>('.lane')).map((p) => ({ p, len: p.getTotalLength() }));
    const s = stateRef.current;

    const mk = (out: boolean) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', out ? '2.6' : '2.1');
      c.setAttribute('fill', out ? '#c8862b' : '#16140f');
      c.setAttribute('fill-opacity', out ? '0.95' : '0.5');
      pG.appendChild(c);
      return c;
    };
    const spawn = () => {
      const idx = Math.floor(Math.random() * lanes.length);
      const out = Math.random() > 0.35;
      s.parts.push({ lane: idx, t: 0, out, sp: 0.0006 + Math.random() * 0.0005, el: mk(out) });
    };

    s.acc += dt;
    const rate = s.hot ? 160 : 560;
    if (s.acc >= rate) { s.acc = 0; spawn(); }
    for (const p of s.parts) {
      p.t += dt * p.sp * (s.hot ? 2 : 1);
      const L = lanes[p.lane];
      const tt = p.out ? p.t : 1 - p.t;
      const pt = L.p.getPointAtLength(clamp(tt, 0, 1) * L.len);
      p.el.setAttribute('cx', pt.x.toFixed(1));
      p.el.setAttribute('cy', pt.y.toFixed(1));
    }
    s.parts = s.parts.filter((p) => {
      if (p.t >= 1) { p.el.remove(); return false; }
      return true;
    });
  }, !reduced);

  return (
    <div
      ref={hostRef}
      className="float art"
      data-art="chat"
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { scrollState } from '../lib/scrollStore';

// Waypoints copied verbatim from the prototype.
const WAYPOINTS = [
  { z: 16, x: 0, y: 0 },
  { z: -2, x: 3, y: 1.5 },
  { z: -24, x: -3, y: -1 },
  { z: -46, x: 2, y: 2 },
  { z: -66, x: 0, y: 0 },
] as const;

function camAt(p: number) {
  const f = Math.min(Math.max(p, 0), 0.9999) * (WAYPOINTS.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1] ?? WAYPOINTS[i];
  const e = t * t * (3 - 2 * t); // smoothstep
  return {
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    z: a.z + (b.z - a.z) * e,
  };
}

// Drives the perspective camera along the waypoint path by scroll progress,
// with smoothed mouse parallax (±2.2 units) and look-at slightly ahead.
export function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useFrame(() => {
    const reduced = scrollState.reducedMotion;

    // Smooth mouse delta toward target (Lenis-style lerp).
    const tx = scrollState.mouseX - 0.5;
    const ty = -(scrollState.mouseY - 0.5);
    mouse.current.x += (tx - mouse.current.x) * 0.05;
    mouse.current.y += (ty - mouse.current.y) * 0.05;

    const c = reduced ? WAYPOINTS[0] : camAt(scrollState.progress);
    const px = reduced ? 0 : mouse.current.x * 2.2;
    const py = reduced ? 0 : -mouse.current.y * 2.2;

    camera.position.x += (c.x + px - camera.position.x) * 0.06;
    camera.position.y += (c.y + py - camera.position.y) * 0.06;
    camera.position.z += (c.z - camera.position.z) * 0.06;
    camera.lookAt(0, 0, camera.position.z - 12);

    // Velocity for Phase 3 (chromatic aberration).
    const dv = Math.abs(scrollState.progress - scrollState.lastProgress);
    scrollState.lastProgress = scrollState.progress;
    scrollState.velocity += (Math.min(dv * 55, 1) - scrollState.velocity) * 0.12;
  });

  return null;
}

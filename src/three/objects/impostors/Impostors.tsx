import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../../lib/scrollStore';

// Lightweight impostor versions of the four project objects scattered through
// the DepthCorridor. Recognizable but cheap (low point counts, low opacity,
// shared materials, slow rotation). The impostor whose kind matches the
// currently-active section brightens and animates a touch faster.
//
// activeSection mapping:
//   work-0 → manifold
//   work-1 → ring
//   work-2 → streak
//   work-3 → curve

type Kind = 'manifold' | 'ring' | 'streak' | 'curve';

type Slot = {
  kind: Kind;
  pos: THREE.Vector3;
  rot: THREE.Euler;
  rs: number;
  scale: number;
};

const COLOR_INK = new THREE.Color('#16140f');
const COLOR_AMBER = new THREE.Color('#c8862b');

function buildSlots(): Slot[] {
  const kinds: Kind[] = ['manifold', 'ring', 'streak', 'curve'];
  const out: Slot[] = [];
  let i = 0;
  // 3 to 4 of each kind → ~14 total, spread through the corridor.
  for (const k of kinds) {
    const n = 3 + (Math.random() < 0.5 ? 0 : 1);
    for (let j = 0; j < n; j++, i++) {
      out.push({
        kind: k,
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 16,
          10 - 80 * (i / 14) + (Math.random() - 0.5) * 4,
        ),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rs: 0.06 + Math.random() * 0.12,
        scale: 1.4 + Math.random() * 1.6,
      });
    }
  }
  return out;
}

function manifoldGeom(N = 150) {
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 0.35 + Math.random() * 0.15;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function ringGeom() {
  const N = 6;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * 0.5;
    pos[i * 3 + 1] = Math.sin(a) * 0.5;
    pos[i * 3 + 2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function streakGeom() {
  const N = 40;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -0.6 + (i / N) * 1.2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
    pos[i * 3 + 2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function curveGeom() {
  const N = 70;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * 0.55 + Math.sin(a * 2) * 0.05;
    pos[i * 3 + 1] = Math.sin(a) * 0.42;
    pos[i * 3 + 2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function activeKindFromSection(section: string): Kind | null {
  if (section === 'work-0') return 'manifold';
  if (section === 'work-1') return 'ring';
  if (section === 'work-2') return 'streak';
  if (section === 'work-3') return 'curve';
  return null;
}

export function Impostors() {
  const slots = useMemo(buildSlots, []);
  const geomByKind = useMemo(
    () => ({
      manifold: manifoldGeom(),
      ring: ringGeom(),
      streak: streakGeom(),
      curve: curveGeom(),
    }),
    [],
  );
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.PointsMaterial | null)[]>([]);

  useFrame((_, dt) => {
    if (scrollState.reducedMotion) return;
    const active = activeKindFromSection(scrollState.activeSection);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const g = groupRefs.current[i];
      const m = matRefs.current[i];
      if (g) {
        const mul = s.kind === active ? 2.4 : 1;
        g.rotation.x += dt * s.rs * 0.5 * mul;
        g.rotation.y += dt * s.rs * 0.7 * mul;
      }
      if (m) {
        const targetOp = s.kind === active ? 0.85 : 0.42;
        m.opacity += (targetOp - m.opacity) * Math.min(1, dt * 3.5);
        const targetColor = s.kind === active ? COLOR_AMBER : COLOR_INK;
        (m.color as THREE.Color).lerp(targetColor, Math.min(1, dt * 3));
      }
    }
  });

  return (
    <>
      {slots.map((s, i) => (
        <group
          key={i}
          ref={(node) => { groupRefs.current[i] = node; }}
          position={s.pos}
          rotation={s.rot}
          scale={s.scale}
        >
          <points geometry={geomByKind[s.kind]}>
            <pointsMaterial
              ref={(m) => { matRefs.current[i] = m; }}
              color={'#16140f'}
              size={s.kind === 'manifold' ? 0.06 : 0.11}
              sizeAttenuation
              transparent
              opacity={0.42}
              depthWrite={false}
              fog
            />
          </points>
        </group>
      ))}
    </>
  );
}

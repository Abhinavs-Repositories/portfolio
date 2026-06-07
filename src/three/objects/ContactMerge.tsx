import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollStore';

// Four simplified mini-objects spread apart, drifting toward center on contact.
// Reduced motion: skip the drift; render already-merged amber point.

// Anchors sit in the empty lower portion of the contact section, well clear
// of the headline. The whole composition is shifted down by the wrapping group.
const ANCHORS: [number, number, number][] = [
  [-0.55, 0.18, 0],
  [0.55, 0.18, 0],
  [-0.55, -0.18, 0],
  [0.55, -0.18, 0],
];
const MERGE_OFFSET_Y = -0.55;

function manifoldGeom() {
  const N = 220;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 0.18 + Math.random() * 0.06;
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
    pos[i * 3] = Math.cos(a) * 0.18;
    pos[i * 3 + 1] = Math.sin(a) * 0.18;
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
    pos[i * 3] = -0.2 + (i / N) * 0.4;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
    pos[i * 3 + 2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

function curveGeom() {
  const N = 60;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * 0.18 + Math.sin(a * 2) * 0.03;
    pos[i * 3 + 1] = Math.sin(a) * 0.13;
    pos[i * 3 + 2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

export function ContactMerge() {
  const geoms = useMemo(() => [manifoldGeom(), ringGeom(), streakGeom(), curveGeom()], []);
  const groupRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const pointMatRefs = useRef<(THREE.PointsMaterial | null)[]>([null, null, null, null]);
  const mergedRef = useRef<THREE.Mesh>(null);
  const mergedMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const mergedGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const inv = scrollState.invert;
    const reduced = scrollState.reducedMotion;
    // amount we've drifted toward center, 0..1
    const drift = reduced ? 1 : inv;
    for (let i = 0; i < 4; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      const ax = ANCHORS[i][0];
      const ay = ANCHORS[i][1];
      g.position.set(ax * (1 - drift), ay * (1 - drift), 0);
      const s = 1 - drift * 0.85;
      g.scale.setScalar(s);
      g.rotation.z += reduced ? 0 : 0.003;
      const m = pointMatRefs.current[i];
      if (m) m.opacity = (1 - drift) * 0.85;
    }
    // The merged amber point appears as drift completes.
    if (mergedRef.current && mergedMatRef.current) {
      mergedMatRef.current.opacity = drift;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.08;
      mergedRef.current.scale.setScalar(pulse * (0.6 + drift * 0.6));
    }
    if (mergedGlowRef.current) {
      const mat = mergedGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = drift * 0.45;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
      mergedGlowRef.current.scale.setScalar(pulse * (1.2 + drift * 0.6));
    }
  });

  return (
    <group position={[0, MERGE_OFFSET_Y, 0]}>
      {geoms.map((g, i) => (
        <group key={i} ref={(node) => { groupRefs.current[i] = node; }} position={ANCHORS[i]}>
          <points geometry={g}>
            <pointsMaterial
              ref={(m) => { pointMatRefs.current[i] = m; }}
              color={'#c8862b'}
              size={0.018}
              sizeAttenuation
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </points>
        </group>
      ))}
      <mesh ref={mergedGlowRef}>
        <sphereGeometry args={[0.035, 24, 24]} />
        <meshBasicMaterial color={'#e8ad4c'} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={mergedRef}>
        <sphereGeometry args={[0.014, 20, 20]} />
        <meshBasicMaterial
          ref={mergedMatRef}
          color={'#e8ad4c'}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

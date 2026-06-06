import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollStore';

// ~40 wireframe primitives strung along z from +10 → -70.
// Two InstancedMeshes per geometry (one amber, one ink) keeps the draw call count low
// without giving up the per-color opacity the prototype uses.
const COUNT = 40;
const AMBER_RATIO = 0.32;

type Slot = {
  geomIdx: 0 | 1 | 2;
  amber: boolean;
  pos: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  rs: number; // rotation speed
  fl: number; // float phase
};

function buildSlots(): Slot[] {
  // Seed-free; each mount gets a fresh random distribution.
  const slots: Slot[] = [];
  for (let i = 0; i < COUNT; i++) {
    slots.push({
      geomIdx: (i % 3) as 0 | 1 | 2,
      amber: Math.random() < AMBER_RATIO,
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 20,
        10 - 80 * (i / COUNT) + (Math.random() - 0.5) * 3,
      ),
      rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      scale: 0.4 + Math.random() * 1.7,
      rs: (Math.random() - 0.5) * 0.005,
      fl: Math.random() * Math.PI * 2,
    });
  }
  return slots;
}

export function DepthCorridor() {
  const slots = useMemo(buildSlots, []);

  const geoms = useMemo(
    () => [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
    ],
    [],
  );

  // Six buckets: [geomIdx][color] → list of slot indices.
  const buckets = useMemo(() => {
    const b: Slot[][][] = [[[], []], [[], []], [[], []]];
    slots.forEach((s) => b[s.geomIdx][s.amber ? 1 : 0].push(s));
    return b;
  }, [slots]);

  const refs = useRef<(THREE.InstancedMesh | null)[][]>([
    [null, null],
    [null, null],
    [null, null],
  ]);

  // Initial transforms.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useMemo(() => {
    for (let g = 0; g < 3; g++) {
      for (let c = 0; c < 2; c++) {
        const list = buckets[g][c];
        list.forEach((s, i) => {
          dummy.position.copy(s.pos);
          dummy.rotation.copy(s.rot);
          dummy.scale.setScalar(s.scale);
          dummy.updateMatrix();
          const mesh = refs.current[g][c];
          if (mesh) mesh.setMatrixAt(i, dummy.matrix);
        });
      }
    }
  }, [buckets, dummy]);

  useFrame((state) => {
    if (scrollState.reducedMotion) return;
    const t = state.clock.elapsedTime;
    for (let g = 0; g < 3; g++) {
      for (let c = 0; c < 2; c++) {
        const list = buckets[g][c];
        const mesh = refs.current[g][c];
        if (!mesh) continue;
        list.forEach((s, i) => {
          s.rot.x += s.rs;
          s.rot.y += s.rs * 0.8;
          s.pos.y += Math.sin(t * 0.4 + s.fl) * 0.0022;
          dummy.position.copy(s.pos);
          dummy.rotation.copy(s.rot);
          dummy.scale.setScalar(s.scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {([0, 1, 2] as const).map((g) =>
        ([0, 1] as const).map((c) => {
          const list = buckets[g][c];
          if (list.length === 0) return null;
          const amber = c === 1;
          return (
            <instancedMesh
              key={`${g}-${c}`}
              ref={(node) => { refs.current[g][c] = node; }}
              args={[geoms[g], undefined as unknown as THREE.Material, list.length]}
            >
              <meshBasicMaterial
                attach="material"
                color={amber ? '#c8862b' : '#16140f'}
                wireframe
                transparent
                opacity={amber ? 0.5 : 0.26}
                fog
              />
            </instancedMesh>
          );
        }),
      )}
    </>
  );
}

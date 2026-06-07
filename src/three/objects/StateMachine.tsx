import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollStore';

type Props = { hovered: boolean };

// Compliance Platform — minimalist form that fills itself out.
// No clipboard backing; sections float against the bone background as text
// rows with thin dividers. Each phase ticks through 3 checkboxes, fills a
// progress bar, and stamps "APPROVED" in amber. Loops.
//
// Positioned in the upper-right so the bottom-left metric stays clear.

const PHASES = ['INTAKE', 'CLASSIFY', 'ASSESS', 'CONTROL', 'REVIEW'] as const;
const SECTION_Y = [0.5, 0.28, 0.06, -0.16, -0.38];
const PHASE_TIME = 1.6;
const PAUSE_AFTER = 1.0;

const AMBER = new THREE.Color('#c8862b');
const AMBER_BRIGHT = new THREE.Color('#e8ad4c');

// Plane geometry pre-translated so its left edge is at local x=0 — lets the
// progress bar scale from 0→1 along x and anchor to its left edge.
const progressFillGeom = (() => {
  const g = new THREE.PlaneGeometry(0.32, 0.012);
  g.translate(0.16, 0, 0);
  return g;
})();
const progressTrackGeom = (() => {
  const g = new THREE.PlaneGeometry(0.32, 0.012);
  return g;
})();

export function StateMachine({ hovered }: Props) {
  const checkRefs = useRef<(THREE.Mesh | null)[]>(Array(PHASES.length * 3).fill(null));
  const progressRefs = useRef<(THREE.Mesh | null)[]>(Array(PHASES.length).fill(null));
  const stampRefs = useRef<(THREE.Group | null)[]>(Array(PHASES.length).fill(null));
  const sectionBarRefs = useRef<(THREE.Mesh | null)[]>(Array(PHASES.length).fill(null));
  const titleRefs = useRef<(unknown | null)[]>(Array(PHASES.length).fill(null));

  const t = useRef(0);
  const reducedInit = useRef(false);

  const stampJitter = useMemo(
    () => PHASES.map((_, i) => (i % 2 === 0 ? -0.13 : 0.11) + (i * 0.03 - 0.06)),
    [],
  );

  useFrame((_, dt) => {
    const reduced = scrollState.reducedMotion;
    if (reduced) {
      if (!reducedInit.current) {
        for (let i = 0; i < PHASES.length; i++) {
          for (let cb = 0; cb < 3; cb++) {
            const m = checkRefs.current[i * 3 + cb];
            if (m) m.scale.set(1, 1, 1);
          }
          const pb = progressRefs.current[i];
          if (pb) pb.scale.x = 1;
          const stamp = stampRefs.current[i];
          if (stamp) {
            stamp.scale.set(1, 1, 1);
            stamp.rotation.z = stampJitter[i];
          }
          const bar = sectionBarRefs.current[i];
          if (bar) {
            const mat = bar.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.6;
            mat.color.copy(AMBER);
          }
        }
        reducedInit.current = true;
      }
      return;
    }

    const cycleTime = (PHASE_TIME * PHASES.length + PAUSE_AFTER) * (hovered ? 0.65 : 1);
    t.current = (t.current + dt / cycleTime) % 1;

    const animFract = (PHASE_TIME * PHASES.length) / cycleTime;
    const isPaused = t.current > animFract;
    const phaseProgress = isPaused ? PHASES.length : (t.current / animFract) * PHASES.length;
    const activeIdx = Math.floor(phaseProgress);
    const localProgress = phaseProgress - activeIdx;

    for (let i = 0; i < PHASES.length; i++) {
      const isComplete = i < activeIdx || isPaused;
      const isActive = !isPaused && i === activeIdx;

      // Left accent bar: thin amber line that lights up when active/complete.
      const bar = sectionBarRefs.current[i];
      if (bar) {
        const mat = bar.material as THREE.MeshBasicMaterial;
        const targetOp = isComplete ? 0.6 : isActive ? 0.85 : 0.18;
        mat.opacity += (targetOp - mat.opacity) * Math.min(1, dt * 6);
        mat.color.lerp(isComplete || isActive ? AMBER : AMBER, Math.min(1, dt * 4));
      }

      // Checkboxes — fill in sequentially.
      for (let cb = 0; cb < 3; cb++) {
        const m = checkRefs.current[i * 3 + cb];
        if (!m) continue;
        const cbStart = cb * 0.18;
        const cbProgress = (localProgress - cbStart) / 0.18;
        const filled = isComplete || (isActive && cbProgress > 0.3);
        const targetScale = filled ? 1 : 0;
        const s = m.scale.x + (targetScale - m.scale.x) * Math.min(1, dt * 10);
        m.scale.set(s, s, s);
      }

      // Progress bar fill.
      const pb = progressRefs.current[i];
      if (pb) {
        const target = isComplete ? 1 : isActive ? Math.min(1, localProgress * 1.15) : 0;
        const s = pb.scale.x + (target - pb.scale.x) * Math.min(1, dt * 8);
        pb.scale.x = s;
      }

      // Stamp pops in at the end of the section.
      const stamp = stampRefs.current[i];
      if (stamp) {
        const show = isComplete ? 1 : isActive && localProgress > 0.82 ? (localProgress - 0.82) / 0.18 : 0;
        const eased = show < 1
          ? show * show * (3 - 2 * show) * (1 + (1 - show) * 0.4)
          : 1;
        const s = stamp.scale.x + (eased - stamp.scale.x) * Math.min(1, dt * 14);
        stamp.scale.set(s, s, s);
        stamp.rotation.z = stampJitter[i] * Math.min(1, eased);
      }
    }
  });

  return (
    <group position={[0.1, 0.05, 0]}>
      {/* Header */}
      <Text
        position={[-0.55, 0.78, 0]}
        fontSize={0.075}
        color={'#16140f'}
        anchorX="left"
        anchorY="middle"
        fontWeight={600}
      >
        RISK CONTROL
      </Text>
      <Text
        position={[-0.55, 0.72, 0]}
        fontSize={0.028}
        color={'#3a3730'}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.1}
      >
        SELF-ASSESSMENT · 5-PHASE LOOP
      </Text>
      {/* Subtle full-width amber underline */}
      <mesh position={[0, 0.65, 0]}>
        <planeGeometry args={[1.3, 0.002]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.5} />
      </mesh>

      {/* Sections */}
      {PHASES.map((phase, i) => (
        <group key={phase} position={[0, SECTION_Y[i], 0]}>
          {/* Left accent bar (lights up amber when section becomes active) */}
          <mesh
            ref={(node) => { sectionBarRefs.current[i] = node; }}
            position={[-0.6, 0, 0]}
          >
            <planeGeometry args={[0.005, 0.14]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.18} />
          </mesh>

          {/* Section number */}
          <Text
            position={[-0.56, 0.02, 0]}
            fontSize={0.038}
            color={'#3a3730'}
            anchorX="left"
            anchorY="middle"
          >
            {`0${i + 1}`}
          </Text>

          {/* Phase title */}
          <Text
            ref={titleRefs.current[i] as unknown as React.Ref<THREE.Mesh>}
            position={[-0.48, 0.025, 0]}
            fontSize={0.058}
            color={'#16140f'}
            anchorX="left"
            anchorY="middle"
            fontWeight={600}
          >
            {phase}
          </Text>

          {/* Subtitle: dummy form description */}
          <Text
            position={[-0.48, -0.04, 0]}
            fontSize={0.024}
            color={'#3a3730'}
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.04}
          >
            risk officer · reviewed · timestamp
          </Text>

          {/* Checkboxes */}
          {[0, 1, 2].map((cb) => {
            const x = 0.05 + cb * 0.06;
            return (
              <group key={cb} position={[x, 0.005, 0]}>
                {/* Outer outline */}
                <mesh>
                  <planeGeometry args={[0.044, 0.044]} />
                  <meshBasicMaterial color={'#3a3730'} />
                </mesh>
                {/* Inner bone (the unchecked interior) */}
                <mesh position={[0, 0, 0.001]}>
                  <planeGeometry args={[0.036, 0.036]} />
                  <meshBasicMaterial color={'#f4f1ea'} />
                </mesh>
                {/* Filled check (scales in when checked) */}
                <mesh
                  ref={(node) => { checkRefs.current[i * 3 + cb] = node; }}
                  position={[0, 0, 0.002]}
                  scale={[0, 0, 0]}
                >
                  <planeGeometry args={[0.028, 0.028]} />
                  <meshStandardMaterial color={AMBER} emissive={AMBER_BRIGHT} emissiveIntensity={0.5} />
                </mesh>
              </group>
            );
          })}

          {/* Progress bar */}
          <group position={[0.39, 0.005, 0]}>
            <mesh geometry={progressTrackGeom}>
              <meshBasicMaterial color={'#3a3730'} transparent opacity={0.18} />
            </mesh>
            <mesh
              ref={(node) => { progressRefs.current[i] = node; }}
              geometry={progressFillGeom}
              position={[-0.16, 0, 0.001]}
              scale={[0, 1, 1]}
            >
              <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.4} />
            </mesh>
          </group>

          {/* APPROVED stamp — just text, no background box. Pops in with rotation. */}
          <group
            ref={(node) => { stampRefs.current[i] = node; }}
            position={[0.78, 0, 0]}
            scale={[0, 0, 0]}
          >
            <Text
              fontSize={0.04}
              color={AMBER}
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
              letterSpacing={0.18}
              outlineWidth={0.002}
              outlineColor={AMBER}
              outlineOpacity={0.6}
            >
              APPROVED
            </Text>
          </group>

          {/* Thin divider line beneath the section (subtle) */}
          {i < PHASES.length - 1 ? (
            <mesh position={[0, -0.085, -0.001]}>
              <planeGeometry args={[1.5, 0.001]} />
              <meshBasicMaterial color={'#3a3730'} transparent opacity={0.13} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

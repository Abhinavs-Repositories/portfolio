import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollStore';

// Library-driven equivalent of the prototype's hand-rolled composite pass.
// Aberration: base velocity-driven jitter + transient `aberrationBoost` pulses
// at section boundaries (set by MotionRoot's ScrollTrigger callbacks).
export function PostFX() {
  const aberrRef = useRef<{ offset: THREE.Vector2 } | null>(null);

  useFrame(() => {
    const ca = aberrRef.current;
    if (!ca) return;
    const v = scrollState.reducedMotion ? 0 : scrollState.velocity;
    const boost = scrollState.reducedMotion ? 0 : scrollState.aberrationBoost;
    const mag = 0.0008 + v * 0.004 + boost * 0.006;
    ca.offset.set(mag, mag);
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.15}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
      <ChromaticAberration
        // @ts-expect-error — drei/postprocessing types don't yet expose ref on this effect
        ref={aberrRef}
        offset={new THREE.Vector2(0.0008, 0.0008)}
        radialModulation
        modulationOffset={0.15}
      />
      <Vignette eskil={false} offset={0.15} darkness={0.5} />
    </EffectComposer>
  );
}

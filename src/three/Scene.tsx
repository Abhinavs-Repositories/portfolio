import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ShaderField } from './ShaderField';
import { DepthCorridor } from './DepthCorridor';
import { CameraRig } from './CameraRig';
import { PostFX } from './PostFX';

// R3F canvas wrapper. Lives behind everything (#scene styling).
// Post-processing (Bloom / ChromaticAberration / Vignette / Noise) lands in Phase 3.
export function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 58, near: 0.1, far: 200, position: [0, 0, 16] }}
      // inline styles override R3F's default `position:relative` wrapper
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      onCreated={({ scene }) => {
        scene.fog = new THREE.Fog(0xf4f1ea, 14, 72);
      }}
    >
      <ShaderField />
      <DepthCorridor />
      <CameraRig />
      <PostFX />
    </Canvas>
  );
}

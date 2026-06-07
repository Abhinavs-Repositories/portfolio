import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { effectiveMouse, scrollState } from '../lib/scrollStore';

// Ported verbatim from the prototype: 5-octave FBM + cursor warp + scroll drift.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// uInvert (0..1) interpolates the entire palette toward dark: bone↔ink swap so
// the whole world flips together with the body.inverted class on contact.
const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform vec3 uBone;
  uniform vec3 uAmber;
  uniform vec3 uInk;
  uniform float uInvert;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash(i), f), dot(hash(i + vec2(1., 0.)), f - vec2(1., 0.)), u.x),
      mix(dot(hash(i + vec2(0., 1.)), f - vec2(0., 1.)), dot(hash(i + vec2(1., 1.)), f - vec2(1., 1.)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec3 bg = mix(uBone, uInk, uInvert);
    vec3 fg = mix(uInk, uBone, uInvert);
    vec2 uv = vUv;
    vec2 md = (uv - uMouse);
    md.x *= uAspect;
    float cd = length(md);
    float cursor = smoothstep(0.34, 0.0, cd);
    vec2 p = uv * 2.4;
    p.y -= uScroll * 0.7;
    p += md * cursor * 0.5;
    float t = uTime * 0.05;
    float q = fbm(p + vec2(t, t * 0.3));
    float n = fbm(p + q * 1.4 + vec2(-t * 0.6, t * 0.2));
    vec3 col = bg;
    col = mix(col, fg, smoothstep(0.2, 0.95, n) * 0.10);
    float ridge = smoothstep(0.34, 0.66, q) * smoothstep(0.92, 0.5, q);
    col = mix(col, uAmber, ridge * 0.17);
    col = mix(col, uAmber, cursor * 0.10);
    float vig = smoothstep(1.25, 0.15, length(uv - 0.5));
    col = mix(bg, col, 0.82 + 0.18 * vig);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Fullscreen quad drawn behind the corridor.
// Rendered with depthWrite/depthTest off so it never occludes scene geometry.
export function ShaderField() {
  const { size } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: size.width / size.height },
      uBone: { value: new THREE.Color('#f4f1ea') },
      uAmber: { value: new THREE.Color('#c8862b') },
      uInk: { value: new THREE.Color('#16140f') },
      uInvert: { value: 0 },
    }),
    // intentionally compute only once; we update uAspect in useFrame on resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    const u = m.uniforms as typeof uniforms;
    u.uTime.value = scrollState.reducedMotion ? 0 : state.clock.elapsedTime;
    u.uScroll.value = scrollState.reducedMotion ? 0 : scrollState.progress;
    const mouse = effectiveMouse();
    u.uMouse.value.set(mouse.x, mouse.y);
    u.uAspect.value = state.size.width / state.size.height;
    u.uInvert.value = scrollState.invert;
  });

  return (
    // -Z so it sits visually behind the corridor; renderOrder = -1 guarantees draw order.
    <mesh frustumCulled={false} renderOrder={-1} position={[0, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        transparent={false}
      />
    </mesh>
  );
}

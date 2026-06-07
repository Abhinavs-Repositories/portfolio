// Shader for the Token River particle stream.
// Per-particle velocity drives brightness — faster = brighter amber.
//
// Attributes per particle:
//   aOffset   (vec3) — base position (we recompute every frame anyway)
//   aVelocity (float) — current velocity (read by both stages)
//   aFlag     (float) — 0 = stream, 1 = context window layer, 2 = guardrail firing

export const riverVertex = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uSize;
  attribute float aVelocity;
  attribute float aFlag;
  varying float vVelocity;
  varying float vFlag;

  void main() {
    vVelocity = aVelocity;
    vFlag = aFlag;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float depthAttn = 1.0 / max(-mv.z, 0.1);
    // Guardrail particles read large; context layer slightly larger; stream tiny.
    float s = uSize;
    s *= mix(1.0, 1.4, step(0.5, aFlag) * step(aFlag, 1.5));
    s *= mix(1.0, 2.8, step(1.5, aFlag));
    gl_PointSize = s * depthAttn * uPixelRatio * 7.0;
  }
`;

export const riverFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uAmber;
  uniform vec3 uAmberBright;
  uniform vec3 uInk;
  varying float vVelocity;
  varying float vFlag;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.2, d);
    float v = clamp(vVelocity, 0.0, 1.0);
    vec3 col = mix(uAmber, uAmberBright, v);
    // Context layer is dimmer ink-amber mix.
    col = mix(col, mix(uInk, uAmber, 0.55), step(0.5, vFlag) * step(vFlag, 1.5) * 0.6);
    // Guardrail fired — pure bright amber.
    col = mix(col, uAmberBright, step(1.5, vFlag));
    float alpha = soft * (0.35 + v * 0.6);
    // Guardrail is opaque-bright.
    alpha = mix(alpha, soft, step(1.5, vFlag));
    gl_FragColor = vec4(col, alpha);
  }
`;
